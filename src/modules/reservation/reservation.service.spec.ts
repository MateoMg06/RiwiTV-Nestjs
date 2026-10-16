import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { ReservationService } from './reservation.service.js';
import type { SeatDao } from './seat.dao.js';
import type { SeatAuditDao } from './seat-audit.dao.js';
import type { Seat } from './seat.entity.js';
import type { ShowtimeDao } from '../showtime/showtime.dao.js';
import type { ConfigService } from '../../config/config.service.js';
import { Config } from '../../config/config.keys.js';
import { SeatAuditEvent, SeatStatus, SeatType } from '../../common/enums/domain.enums.js';

const USER = 9;
const OTHER = 4;
const FUTURE = new Date(Date.now() + 5 * 60_000);
const PAST = new Date(Date.now() - 60_000);

const seat = (id: number, overrides: Partial<Seat> = {}): Seat =>
  ({
    id,
    showtimeId: 5,
    row: 'A',
    number: id,
    type: SeatType.ESTANDAR,
    status: SeatStatus.AVAILABLE,
    priceModifier: '0.00',
    heldByUserId: null,
    heldUntil: null,
    ...overrides,
  }) as Seat;

const ownHeld = (id: number, heldUntil = FUTURE) =>
  seat(id, { status: SeatStatus.HELD, heldByUserId: USER, heldUntil });
const otherHeld = (id: number, heldUntil = FUTURE) =>
  seat(id, { status: SeatStatus.HELD, heldByUserId: OTHER, heldUntil });

function setup(env: Record<string, string> = {}, showtime: object | null = defaultShowtime()) {
  const manager = {} as EntityManager;
  const dataSource = {
    transaction: vi.fn(async (...args: unknown[]) => {
      const fn = args[args.length - 1] as (m: EntityManager) => Promise<unknown>;
      return fn(manager);
    }),
  };
  const showtimeDao = { findSelectableById: vi.fn().mockResolvedValue(showtime) };
  const seatDao = {
    findByShowtime: vi.fn().mockResolvedValue([]),
    findForUpdate: vi.fn().mockResolvedValue([]),
    hold: vi.fn().mockResolvedValue(undefined),
    renewHeldByUser: vi.fn().mockResolvedValue([]),
    countHeldByUser: vi.fn().mockResolvedValue(0),
    findHeldByUser: vi.fn().mockResolvedValue([]),
    releaseByUser: vi.fn().mockResolvedValue([]),
    releaseExpired: vi.fn().mockResolvedValue([]),
  };
  const seatAuditDao = { createMany: vi.fn().mockResolvedValue(undefined) };
  const configService = { get: vi.fn((key: string) => env[key]) };
  const service = new ReservationService(
    dataSource as unknown as DataSource,
    showtimeDao as unknown as ShowtimeDao,
    seatDao as unknown as SeatDao,
    seatAuditDao as unknown as SeatAuditDao,
    configService as unknown as ConfigService,
  );
  return { service, dataSource, showtimeDao, seatDao, seatAuditDao, manager };
}

function defaultShowtime(overrides: object = {}) {
  return { id: 5, price: '14000.00', maxSeatsPerReservation: null, ...overrides };
}

const queryFailed = (code: string) =>
  new QueryFailedError('q', [], Object.assign(new Error('pg'), { code }));

describe('ReservationService.getSeatMap (HU-010)', () => {
  it('404 si la función no es seleccionable', async () => {
    const { service } = setup({}, null);
    await expect(service.getSeatMap(5)).rejects.toThrow(
      new NotFoundException('Función no encontrada'),
    );
  });

  it('muestra AVAILABLE la HELD vencida, mantiene HELD la vigente y nunca expone al dueño', async () => {
    const { service, seatDao } = setup();
    seatDao.findByShowtime.mockResolvedValue([
      seat(1),
      otherHeld(2, PAST),
      otherHeld(3, FUTURE),
      seat(4, { status: SeatStatus.SOLD }),
      seat(5, { status: SeatStatus.DISABLED, type: SeatType.VIP }),
    ]);

    const map = await service.getSeatMap(5);

    expect(map.functionId).toBe(5);
    expect(map.seats.map((s) => s.status)).toEqual([
      SeatStatus.AVAILABLE,
      SeatStatus.AVAILABLE,
      SeatStatus.HELD,
      SeatStatus.SOLD,
      SeatStatus.DISABLED,
    ]);
    expect(Object.keys(map.seats[2]).sort()).toEqual(['id', 'number', 'row', 'status', 'type']);
  });
});

describe('ReservationService.lockSeats (HU-010)', () => {
  const dto = (seatIds: number[]) => ({ functionId: 5, seatIds });

  it('abre la transacción con SERIALIZABLE', async () => {
    const { service, dataSource, seatDao } = setup();
    seatDao.findForUpdate.mockResolvedValue([seat(1)]);

    await service.lockSeats(USER, dto([1]));

    expect(dataSource.transaction).toHaveBeenCalledWith('SERIALIZABLE', expect.any(Function));
  });

  it('404 si la función no es seleccionable y no abre transacción', async () => {
    const { service, dataSource } = setup({}, null);
    await expect(service.lockSeats(USER, dto([1]))).rejects.toThrow(
      new NotFoundException('Función no encontrada'),
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('404 si falta alguna silla (o es de otra función)', async () => {
    const { service, seatDao } = setup();
    seatDao.findForUpdate.mockResolvedValue([seat(1)]);

    await expect(service.lockSeats(USER, dto([1, 2]))).rejects.toThrow(
      new NotFoundException('Silla no encontrada'),
    );
    expect(seatDao.hold).not.toHaveBeenCalled();
  });

  it('bloquea sillas libres con un único vencimiento a now + SEAT_LOCK_MINUTES y audita LOCKED', async () => {
    const { service, seatDao, seatAuditDao, manager } = setup({ [Config.SEAT_LOCK_MINUTES]: '15' });
    seatDao.findForUpdate.mockResolvedValue([seat(1), seat(2)]);

    const before = Date.now();
    const result = await service.lockSeats(USER, dto([1, 2]));
    const after = Date.now();

    expect(seatDao.findForUpdate).toHaveBeenCalledWith(manager, 5, [1, 2]);
    expect(seatDao.hold).toHaveBeenCalledWith(manager, [1, 2], USER, result.expiresAt);
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + 15 * 60_000);
    expect(result.seatIds).toEqual([1, 2]);
    expect(seatAuditDao.createMany).toHaveBeenCalledWith(manager, [
      { userId: USER, showtimeId: 5, seatId: 1, event: SeatAuditEvent.LOCKED },
      { userId: USER, showtimeId: 5, seatId: 2, event: SeatAuditEvent.LOCKED },
    ]);
  });

  it('usa 10 minutos si SEAT_LOCK_MINUTES no está definido o no es válido', async () => {
    for (const env of [{}, { [Config.SEAT_LOCK_MINUTES]: 'abc' }]) {
      const { service, seatDao } = setup(env);
      seatDao.findForUpdate.mockResolvedValue([seat(1)]);
      const before = Date.now();
      const { expiresAt } = await service.lockSeats(USER, dto([1]));
      expect(expiresAt.getTime() - before).toBeGreaterThanOrEqual(10 * 60_000);
      expect(expiresAt.getTime() - before).toBeLessThan(10 * 60_000 + 5_000);
    }
  });

  it('409 todo o nada: una silla ocupada impide bloquear las demás', async () => {
    const { service, seatDao, seatAuditDao } = setup();
    seatDao.findForUpdate.mockResolvedValue([seat(1), otherHeld(2)]);

    await expect(service.lockSeats(USER, dto([1, 2]))).rejects.toThrow(
      new ConflictException('Una o más sillas ya no están disponibles'),
    );
    expect(seatDao.hold).not.toHaveBeenCalled();
    expect(seatDao.renewHeldByUser).not.toHaveBeenCalled();
    expect(seatAuditDao.createMany).not.toHaveBeenCalled();
  });

  it.each([SeatStatus.SOLD, SeatStatus.DISABLED])('409 si la silla está %s', async (status) => {
    const { service, seatDao } = setup();
    seatDao.findForUpdate.mockResolvedValue([seat(1, { status })]);

    await expect(service.lockSeats(USER, dto([1]))).rejects.toBeInstanceOf(ConflictException);
    expect(seatDao.hold).not.toHaveBeenCalled();
  });

  it('permite tomar una silla HELD vencida de otro usuario', async () => {
    const { service, seatDao, manager } = setup();
    seatDao.findForUpdate.mockResolvedValue([otherHeld(1, PAST)]);

    const result = await service.lockSeats(USER, dto([1]));

    expect(seatDao.hold).toHaveBeenCalledWith(manager, [1], USER, result.expiresAt);
  });

  describe('máximo de sillas por función', () => {
    it('400 si las vigentes del usuario más las nuevas superan el máximo de la función', async () => {
      const { service, seatDao } = setup({}, defaultShowtime({ maxSeatsPerReservation: 2 }));
      seatDao.findForUpdate.mockResolvedValue([seat(3), seat(4)]);
      seatDao.countHeldByUser.mockResolvedValue(1);

      await expect(service.lockSeats(USER, dto([3, 4]))).rejects.toThrow(
        new BadRequestException('Máximo 2 sillas por función'),
      );
      expect(seatDao.hold).not.toHaveBeenCalled();
    });

    it('el máximo de la función manda sobre MAX_SEATS_PER_RESERVATION', async () => {
      const { service, seatDao } = setup(
        { [Config.MAX_SEATS_PER_RESERVATION]: '1' },
        defaultShowtime({ maxSeatsPerReservation: 3 }),
      );
      seatDao.findForUpdate.mockResolvedValue([seat(1), seat(2), seat(3)]);

      await expect(service.lockSeats(USER, dto([1, 2, 3]))).resolves.toBeDefined();
    });

    it('sin máximo en la función usa MAX_SEATS_PER_RESERVATION', async () => {
      const { service, seatDao } = setup({ [Config.MAX_SEATS_PER_RESERVATION]: '2' });
      seatDao.findForUpdate.mockResolvedValue([seat(1), seat(2), seat(3)]);

      await expect(service.lockSeats(USER, dto([1, 2, 3]))).rejects.toThrow(
        new BadRequestException('Máximo 2 sillas por función'),
      );
    });

    it('sin máximo en la función ni variable, el respaldo es 8', async () => {
      const { service, seatDao } = setup();
      seatDao.findForUpdate.mockResolvedValue(Array.from({ length: 9 }, (_, i) => seat(i + 1)));

      await expect(service.lockSeats(USER, dto([1, 2, 3, 4, 5, 6, 7, 8, 9]))).rejects.toThrow(
        new BadRequestException('Máximo 8 sillas por función'),
      );
    });
  });

  describe('re-bloqueo', () => {
    it('no cuenta doble las sillas ya propias, renueva todas las vigentes y audita LOCKED', async () => {
      const { service, seatDao, seatAuditDao, manager } = setup(
        {},
        defaultShowtime({ maxSeatsPerReservation: 2 }),
      );
      // El usuario ya tiene 1 y 2 (máximo 2) y vuelve a pedir 1 y 2: no excede.
      seatDao.findForUpdate.mockResolvedValue([ownHeld(1), ownHeld(2)]);
      seatDao.countHeldByUser.mockResolvedValue(2);
      seatDao.renewHeldByUser.mockResolvedValue([1, 2]);

      const result = await service.lockSeats(USER, dto([1, 2]));

      expect(seatDao.hold).not.toHaveBeenCalled();
      expect(seatDao.renewHeldByUser).toHaveBeenCalledWith(
        manager,
        5,
        USER,
        result.expiresAt,
        expect.any(Date),
      );
      expect(result.seatIds).toEqual([1, 2]);
      expect(seatAuditDao.createMany).toHaveBeenCalledWith(manager, [
        { userId: USER, showtimeId: 5, seatId: 1, event: SeatAuditEvent.LOCKED },
        { userId: USER, showtimeId: 5, seatId: 2, event: SeatAuditEvent.LOCKED },
      ]);
    });

    it('al añadir una nueva devuelve todas las vigentes del usuario, no solo las pedidas', async () => {
      const { service, seatDao } = setup();
      seatDao.findForUpdate.mockResolvedValue([seat(7)]);
      seatDao.countHeldByUser.mockResolvedValue(2);
      seatDao.renewHeldByUser.mockResolvedValue([3, 4]);

      const result = await service.lockSeats(USER, dto([7]));

      expect(seatDao.hold).toHaveBeenCalledWith(expect.anything(), [7], USER, result.expiresAt);
      expect(result.seatIds).toEqual([3, 4, 7]);
    });
  });

  describe('concurrencia', () => {
    /** Doble de `DataSource.transaction` que serializa: la siguiente espera a que acabe la anterior. */
    function serializedDb() {
      const db = new Map<number, Seat>([[1, seat(1)]]);
      let tail: Promise<unknown> = Promise.resolve();
      const dataSource = {
        transaction: vi.fn((_level: string, fn: (m: EntityManager) => Promise<unknown>) => {
          const run = tail.then(() => fn({} as EntityManager));
          tail = run.catch(() => undefined);
          return run;
        }),
      };
      const seatDao = {
        findForUpdate: vi.fn(async () => [{ ...db.get(1)! }]),
        countHeldByUser: vi.fn().mockResolvedValue(0),
        renewHeldByUser: vi.fn().mockResolvedValue([]),
        hold: vi.fn(async (_m: unknown, ids: number[], userId: number, until: Date) => {
          await Promise.resolve();
          for (const id of ids) {
            db.set(id, {
              ...db.get(id)!,
              status: SeatStatus.HELD,
              heldByUserId: userId,
              heldUntil: until,
            });
          }
        }),
      };
      const build = () =>
        new ReservationService(
          dataSource as unknown as DataSource,
          {
            findSelectableById: vi.fn().mockResolvedValue(defaultShowtime()),
          } as unknown as ShowtimeDao,
          seatDao as unknown as SeatDao,
          { createMany: vi.fn() } as unknown as SeatAuditDao,
          { get: vi.fn() } as unknown as ConfigService,
        );
      return { build, seatDao };
    }

    it('dos bloqueos simultáneos de la misma silla: exactamente uno gana y el otro recibe 409', async () => {
      const { build, seatDao } = serializedDb();
      const service = build();

      const results = await Promise.allSettled([
        service.lockSeats(1, { functionId: 5, seatIds: [1] }),
        service.lockSeats(2, { functionId: 5, seatIds: [1] }),
      ]);

      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      expect(seatDao.hold).toHaveBeenCalledTimes(1);
    });

    it.each(['40001', '40P01'])('el error de Postgres %s se traduce a 409', async (code) => {
      const { service, seatDao } = setup();
      seatDao.findForUpdate.mockRejectedValue(queryFailed(code));

      await expect(service.lockSeats(USER, dto([1]))).rejects.toThrow(
        new ConflictException('Una o más sillas ya no están disponibles'),
      );
    });

    it('un fallo de commit con 40001 también da 409', async () => {
      const { service, dataSource, seatDao } = setup();
      seatDao.findForUpdate.mockResolvedValue([seat(1)]);
      dataSource.transaction.mockRejectedValue(queryFailed('40001'));

      await expect(service.lockSeats(USER, dto([1]))).rejects.toBeInstanceOf(ConflictException);
    });

    it('otros errores (de BD o no) se relanzan sin convertirlos', async () => {
      const { service, seatDao } = setup();
      const other = queryFailed('23505');
      seatDao.findForUpdate.mockRejectedValueOnce(other);
      await expect(service.lockSeats(USER, dto([1]))).rejects.toBe(other);

      const boom = new Error('boom');
      seatDao.findForUpdate.mockRejectedValueOnce(boom);
      await expect(service.lockSeats(USER, dto([1]))).rejects.toBe(boom);
    });

    it('si la auditoría falla, el bloqueo falla (fail-closed, misma transacción)', async () => {
      const { service, seatDao, seatAuditDao } = setup();
      seatDao.findForUpdate.mockResolvedValue([seat(1)]);
      const boom = new Error('audit');
      seatAuditDao.createMany.mockRejectedValue(boom);

      await expect(service.lockSeats(USER, dto([1]))).rejects.toBe(boom);
    });
  });
});

describe('ReservationService.releaseSeats (HU-010)', () => {
  it('404 si la función no es seleccionable', async () => {
    const { service } = setup({}, null);
    await expect(service.releaseSeats(USER, { functionId: 5 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('libera solo las propias que devuelve el DAO y audita RELEASED por cada una', async () => {
    const { service, seatDao, seatAuditDao, manager } = setup();
    seatDao.releaseByUser.mockResolvedValue([1]);

    const result = await service.releaseSeats(USER, { functionId: 5, seatIds: [1, 2] });

    expect(seatDao.releaseByUser).toHaveBeenCalledWith(manager, 5, USER, [1, 2]);
    expect(result).toEqual({ functionId: 5, released: [1] });
    expect(seatAuditDao.createMany).toHaveBeenCalledWith(manager, [
      { userId: USER, showtimeId: 5, seatId: 1, event: SeatAuditEvent.RELEASED },
    ]);
  });

  it('sin seatIds libera todas las suyas en la función', async () => {
    const { service, seatDao } = setup();
    seatDao.releaseByUser.mockResolvedValue([1, 2]);

    await service.releaseSeats(USER, { functionId: 5 });

    expect(seatDao.releaseByUser).toHaveBeenCalledWith(expect.anything(), 5, USER, undefined);
  });

  it('si no libera nada responde 200 con lista vacía y sin auditoría', async () => {
    const { service, seatAuditDao } = setup();

    await expect(service.releaseSeats(USER, { functionId: 5, seatIds: [8] })).resolves.toEqual({
      functionId: 5,
      released: [],
    });
    expect(seatAuditDao.createMany).toHaveBeenCalledWith(expect.anything(), []);
  });
});

describe('ReservationService.getSummary (HU-010)', () => {
  it('404 si la función no es seleccionable', async () => {
    const { service } = setup({}, null);
    await expect(service.getSummary(USER, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('suma showtime.price + priceModifier por silla y devuelve el vencimiento mínimo', async () => {
    const { service, seatDao } = setup();
    const soon = new Date(Date.now() + 60_000);
    const later = new Date(Date.now() + 600_000);
    seatDao.findHeldByUser.mockResolvedValue([
      ownHeld(1, later),
      seat(2, {
        type: SeatType.VIP,
        priceModifier: '5000.00',
        status: SeatStatus.HELD,
        heldByUserId: USER,
        heldUntil: soon,
      }),
    ]);

    const summary = await service.getSummary(USER, 5);

    expect(seatDao.findHeldByUser).toHaveBeenCalledWith(5, USER, expect.any(Date));
    expect(summary).toEqual({
      functionId: 5,
      seats: [
        { seatId: 1, row: 'A', number: 1, type: SeatType.ESTANDAR, price: 14000 },
        { seatId: 2, row: 'A', number: 2, type: SeatType.VIP, price: 19000 },
      ],
      seatCount: 2,
      total: 33000,
      expiresAt: soon,
    });
  });

  it('sin sillas devuelve total 0 y expiresAt null', async () => {
    const { service } = setup();

    await expect(service.getSummary(USER, 5)).resolves.toEqual({
      functionId: 5,
      seats: [],
      seatCount: 0,
      total: 0,
      expiresAt: null,
    });
  });
});

describe('ReservationService.releaseExpired (HU-010)', () => {
  it('audita EXPIRED con el dueño previo y devuelve la cantidad', async () => {
    const { service, seatDao, seatAuditDao, manager } = setup();
    seatDao.releaseExpired.mockResolvedValue([
      { seatId: 1, showtimeId: 5, userId: 9 },
      { seatId: 2, showtimeId: 6, userId: 4 },
    ]);

    await expect(service.releaseExpired()).resolves.toBe(2);

    expect(seatDao.releaseExpired).toHaveBeenCalledWith(manager, expect.any(Date));
    expect(seatAuditDao.createMany).toHaveBeenCalledWith(manager, [
      { userId: 9, showtimeId: 5, seatId: 1, event: SeatAuditEvent.EXPIRED },
      { userId: 4, showtimeId: 6, seatId: 2, event: SeatAuditEvent.EXPIRED },
    ]);
  });

  it('sin vencidas devuelve 0 y no audita filas', async () => {
    const { service, seatAuditDao } = setup();

    await expect(service.releaseExpired()).resolves.toBe(0);
    expect(seatAuditDao.createMany).toHaveBeenCalledWith(expect.anything(), []);
  });
});
