import { describe, it, expect, vi } from 'vitest';
import type { DataSource, EntityManager } from 'typeorm';
import { SeatDao } from './seat.dao.js';
import { Seat } from './seat.entity.js';
import { SeatStatus } from '../../common/enums/domain.enums.js';

function chain(extra: Record<string, unknown> = {}) {
  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    setLock: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
    getCount: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ raw: [] }),
  };
  Object.assign(qb, extra);
  return qb;
}

function setup(selectQb = chain(), updateQb = chain()) {
  const repo = { createQueryBuilder: vi.fn().mockReturnValue(selectQb) };
  const manager = {
    getRepository: vi.fn().mockReturnValue(repo),
    createQueryBuilder: vi.fn().mockReturnValue(updateQb),
  };
  const dataSource = { getRepository: vi.fn().mockReturnValue(repo) };
  return {
    selectQb,
    updateQb,
    repo,
    manager: manager as unknown as EntityManager & typeof manager,
    dataSource,
    dao: new SeatDao(dataSource as unknown as DataSource),
  };
}

const now = new Date('2026-10-16T10:00:00Z');
const until = new Date('2026-10-16T10:10:00Z');

describe('SeatDao (HU-010)', () => {
  it('findByShowtime filtra por función y ordena por fila y número', async () => {
    const { selectQb, dataSource, dao } = setup();

    await dao.findByShowtime(5);

    expect(dataSource.getRepository).toHaveBeenCalledWith(Seat);
    expect(selectQb.where).toHaveBeenCalledWith('seat.showtimeId = :showtimeId', { showtimeId: 5 });
    expect(selectQb.orderBy).toHaveBeenCalledWith('seat.row', 'ASC');
    expect(selectQb.addOrderBy).toHaveBeenCalledWith('seat.number', 'ASC');
  });

  it('findForUpdate usa pessimistic_write, filtra función e ids y ordena por id', async () => {
    const rows = [{ id: 1 }];
    const { selectQb, manager, dao } = setup(chain({ getMany: vi.fn().mockResolvedValue(rows) }));

    await expect(dao.findForUpdate(manager, 5, [3, 1])).resolves.toBe(rows);

    expect(manager.getRepository).toHaveBeenCalledWith(Seat);
    expect(selectQb.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(selectQb.where).toHaveBeenCalledWith('seat.showtimeId = :showtimeId', { showtimeId: 5 });
    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.id IN (:...ids)', { ids: [3, 1] });
    expect(selectQb.orderBy).toHaveBeenCalledWith('seat.id', 'ASC');
  });

  it('hold pasa las sillas a HELD con dueño y vencimiento', async () => {
    const { updateQb, manager, dao } = setup();

    await dao.hold(manager, [1, 2], 9, until);

    expect(updateQb.update).toHaveBeenCalledWith(Seat);
    expect(updateQb.set).toHaveBeenCalledWith({
      status: SeatStatus.HELD,
      heldByUserId: 9,
      heldUntil: until,
    });
    expect(updateQb.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: [1, 2] });
  });

  it('renewHeldByUser solo renueva HELD vigentes propias de la función y devuelve sus ids', async () => {
    const { updateQb, manager, dao } = setup(
      chain(),
      chain({ execute: vi.fn().mockResolvedValue({ raw: [{ id: 4 }, { id: 7 }] }) }),
    );

    await expect(dao.renewHeldByUser(manager, 5, 9, until, now)).resolves.toEqual([4, 7]);

    expect(updateQb.set).toHaveBeenCalledWith({ heldUntil: until });
    expect(updateQb.where).toHaveBeenCalledWith('"showtimeId" = :showtimeId', { showtimeId: 5 });
    expect(updateQb.andWhere).toHaveBeenCalledWith('"heldByUserId" = :userId', { userId: 9 });
    expect(updateQb.andWhere).toHaveBeenCalledWith('status = :held', { held: SeatStatus.HELD });
    expect(updateQb.andWhere).toHaveBeenCalledWith('"heldUntil" > :now', { now });
  });

  it('countHeldByUser cuenta solo HELD vigentes del usuario en la función', async () => {
    const { selectQb, manager, dao } = setup(chain({ getCount: vi.fn().mockResolvedValue(3) }));

    await expect(dao.countHeldByUser(manager, 5, 9, now)).resolves.toBe(3);

    expect(selectQb.where).toHaveBeenCalledWith('seat.showtimeId = :showtimeId', { showtimeId: 5 });
    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.heldByUserId = :userId', { userId: 9 });
    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.status = :held', {
      held: SeatStatus.HELD,
    });
    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.heldUntil > :now', { now });
  });

  it('findHeldByUser filtra vigentes del usuario y ordena por fila y número', async () => {
    const { selectQb, dao } = setup();

    await dao.findHeldByUser(5, 9, now);

    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.heldByUserId = :userId', { userId: 9 });
    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.heldUntil > :now', { now });
    expect(selectQb.orderBy).toHaveBeenCalledWith('seat.row', 'ASC');
    expect(selectQb.addOrderBy).toHaveBeenCalledWith('seat.number', 'ASC');
  });

  it('releaseByUser sin ids libera solo HELD propias y devuelve los ids', async () => {
    const { updateQb, manager, dao } = setup(
      chain(),
      chain({ execute: vi.fn().mockResolvedValue({ raw: [{ id: 2 }] }) }),
    );

    await expect(dao.releaseByUser(manager, 5, 9)).resolves.toEqual([2]);

    expect(updateQb.set).toHaveBeenCalledWith({
      status: SeatStatus.AVAILABLE,
      heldByUserId: null,
      heldUntil: null,
    });
    expect(updateQb.andWhere).toHaveBeenCalledWith('"heldByUserId" = :userId', { userId: 9 });
    expect(updateQb.andWhere).toHaveBeenCalledWith('status = :held', { held: SeatStatus.HELD });
    expect(updateQb.andWhere).not.toHaveBeenCalledWith('id IN (:...ids)', expect.anything());
    expect(updateQb.returning).toHaveBeenCalledWith('id');
  });

  it('releaseByUser con ids añade el filtro por ids', async () => {
    const { updateQb, manager, dao } = setup();

    await dao.releaseByUser(manager, 5, 9, [1, 2]);

    expect(updateQb.andWhere).toHaveBeenCalledWith('id IN (:...ids)', { ids: [1, 2] });
  });

  it('releaseExpired bloquea HELD vencidas, las libera y devuelve el dueño previo', async () => {
    const rows = [
      { id: 1, showtimeId: 5, heldByUserId: 9 },
      { id: 2, showtimeId: 6, heldByUserId: 8 },
    ];
    const { selectQb, updateQb, manager, dao } = setup(
      chain({ getMany: vi.fn().mockResolvedValue(rows) }),
    );

    await expect(dao.releaseExpired(manager, now)).resolves.toEqual([
      { seatId: 1, showtimeId: 5, userId: 9 },
      { seatId: 2, showtimeId: 6, userId: 8 },
    ]);

    expect(selectQb.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(selectQb.where).toHaveBeenCalledWith('seat.status = :held', { held: SeatStatus.HELD });
    expect(selectQb.andWhere).toHaveBeenCalledWith('seat.heldUntil <= :now', { now });
    expect(selectQb.orderBy).toHaveBeenCalledWith('seat.id', 'ASC');
    expect(updateQb.set).toHaveBeenCalledWith({
      status: SeatStatus.AVAILABLE,
      heldByUserId: null,
      heldUntil: null,
    });
    expect(updateQb.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: [1, 2] });
  });

  it('releaseExpired sin vencidas no ejecuta el UPDATE', async () => {
    const { updateQb, manager, dao } = setup();

    await expect(dao.releaseExpired(manager, now)).resolves.toEqual([]);

    expect(updateQb.execute).not.toHaveBeenCalled();
  });
});
