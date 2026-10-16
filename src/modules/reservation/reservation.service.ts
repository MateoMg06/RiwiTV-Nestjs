import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, QueryFailedError } from 'typeorm';
import { SeatAuditEvent, SeatStatus, SeatType } from '../../common/enums/domain.enums.js';
import { Config } from '../../config/config.keys.js';
import { ConfigService } from '../../config/config.service.js';
import { ShowtimeDao } from '../showtime/showtime.dao.js';
import type { Showtime } from '../showtime/showtime.entity.js';
import type { LockSeatsDto } from './lock-seats.dto.js';
import type { ReleaseSeatsDto } from './release-seats.dto.js';
import { SeatAuditDao } from './seat-audit.dao.js';
import { SeatDao } from './seat.dao.js';
import type { Seat } from './seat.entity.js';

const DEFAULT_LOCK_MINUTES = 10;
const DEFAULT_MAX_SEATS = 8;
/** Postgres: `serialization_failure` y `deadlock_detected`. */
const RETRYABLE_CODES = ['40001', '40P01'];
const UNAVAILABLE_MESSAGE = 'Una o más sillas ya no están disponibles';

export interface SeatMapItem {
  id: number;
  row: string;
  number: number;
  type: SeatType;
  status: SeatStatus;
}

export interface SeatMap {
  functionId: number;
  seats: SeatMapItem[];
}

export interface LockResult {
  functionId: number;
  seatIds: number[];
  expiresAt: Date;
}

export interface ReleaseResult {
  functionId: number;
  released: number[];
}

export interface SummarySeat {
  seatId: number;
  row: string;
  number: number;
  type: SeatType;
  price: number;
}

export interface Summary {
  functionId: number;
  seats: SummarySeat[];
  seatCount: number;
  total: number;
  expiresAt: Date | null;
}

/** Redondea a 2 decimales para que sumar precios decimales no deje restos de coma flotante. */
const round2 = (value: number): number => Math.round(value * 100) / 100;

@Injectable()
export class ReservationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly showtimeDao: ShowtimeDao,
    private readonly seatDao: SeatDao,
    private readonly seatAuditDao: SeatAuditDao,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Mapa de la función. Una silla `HELD` vencida se muestra `AVAILABLE` aunque el job aún no la
   * haya liberado; nunca se expone quién la tiene ni hasta cuándo.
   */
  async getSeatMap(functionId: number): Promise<SeatMap> {
    await this.findSelectableOrFail(functionId);
    const now = new Date();
    const seats = await this.seatDao.findByShowtime(functionId);
    return {
      functionId,
      seats: seats.map((seat) => ({
        id: seat.id,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status:
          seat.status === SeatStatus.HELD && this.isExpired(seat, now)
            ? SeatStatus.AVAILABLE
            : seat.status,
      })),
    };
  }

  /**
   * Bloqueo todo o nada en una transacción SERIALIZABLE con `FOR UPDATE`. Si Postgres aborta la
   * transacción por conflicto (40001) o deadlock (40P01), otra petición ganó la silla: 409.
   */
  async lockSeats(userId: number, dto: LockSeatsDto): Promise<LockResult> {
    const { functionId, seatIds } = dto;
    const showtime = await this.findSelectableOrFail(functionId);
    const max =
      showtime.maxSeatsPerReservation ??
      this.positiveInt(Config.MAX_SEATS_PER_RESERVATION, DEFAULT_MAX_SEATS);
    const minutes = this.positiveInt(Config.SEAT_LOCK_MINUTES, DEFAULT_LOCK_MINUTES);

    try {
      return await this.dataSource.transaction('SERIALIZABLE', async (manager) => {
        const now = new Date();
        const seats = await this.seatDao.findForUpdate(manager, functionId, seatIds);
        if (seats.length !== seatIds.length) throw new NotFoundException('Silla no encontrada');

        const isOwnActive = (seat: Seat) =>
          seat.status === SeatStatus.HELD &&
          !this.isExpired(seat, now) &&
          seat.heldByUserId === userId;
        const isTakeable = (seat: Seat) =>
          seat.status === SeatStatus.AVAILABLE ||
          (seat.status === SeatStatus.HELD && (this.isExpired(seat, now) || isOwnActive(seat)));

        if (!seats.every(isTakeable)) throw new ConflictException(UNAVAILABLE_MESSAGE);

        // Las ya propias no cuentan doble: total = vigentes del usuario + solo las nuevas.
        const newSeats = seats.filter((seat) => !isOwnActive(seat));
        const heldCount = await this.seatDao.countHeldByUser(manager, functionId, userId, now);
        if (heldCount + newSeats.length > max) {
          throw new BadRequestException(`Máximo ${max} sillas por función`);
        }

        const expiresAt = new Date(now.getTime() + minutes * 60_000);
        // Un único vencimiento: se renuevan todas las vigentes del usuario y se bloquean las nuevas.
        const renewed = await this.seatDao.renewHeldByUser(
          manager,
          functionId,
          userId,
          expiresAt,
          now,
        );
        const newIds = newSeats.map((seat) => seat.id);
        if (newIds.length > 0) await this.seatDao.hold(manager, newIds, userId, expiresAt);

        const allIds = [...new Set([...renewed, ...newIds])].sort((a, b) => a - b);
        await this.seatAuditDao.createMany(
          manager,
          allIds.map((seatId) => ({
            userId,
            showtimeId: functionId,
            seatId,
            event: SeatAuditEvent.LOCKED,
          })),
        );
        return { functionId, seatIds: allIds, expiresAt };
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        RETRYABLE_CODES.includes((error.driverError as { code?: string } | undefined)?.code ?? '')
      ) {
        throw new ConflictException(UNAVAILABLE_MESSAGE);
      }
      throw error;
    }
  }

  /** Libera solo sillas `HELD` del propio usuario; las ajenas, vendidas o inhabilitadas se ignoran. */
  async releaseSeats(userId: number, dto: ReleaseSeatsDto): Promise<ReleaseResult> {
    const { functionId, seatIds } = dto;
    await this.findSelectableOrFail(functionId);

    const released = await this.dataSource.transaction(async (manager) => {
      const ids = await this.seatDao.releaseByUser(manager, functionId, userId, seatIds);
      await this.seatAuditDao.createMany(
        manager,
        ids.map((seatId) => ({
          userId,
          showtimeId: functionId,
          seatId,
          event: SeatAuditEvent.RELEASED,
        })),
      );
      return ids;
    });
    return { functionId, released };
  }

  /** Resumen con precio de lista por silla: `Showtime.price + Seat.priceModifier`. */
  async getSummary(userId: number, functionId: number): Promise<Summary> {
    const showtime = await this.findSelectableOrFail(functionId);
    const held = await this.seatDao.findHeldByUser(functionId, userId, new Date());

    const seats = held.map((seat) => ({
      seatId: seat.id,
      row: seat.row,
      number: seat.number,
      type: seat.type,
      price: round2(Number(showtime.price) + Number(seat.priceModifier)),
    }));
    const expiresAt = held.reduce<Date | null>(
      (min, seat) => (seat.heldUntil && (!min || seat.heldUntil < min) ? seat.heldUntil : min),
      null,
    );
    return {
      functionId,
      seats,
      seatCount: seats.length,
      total: round2(seats.reduce((sum, seat) => sum + seat.price, 0)),
      expiresAt,
    };
  }

  /** Lo invoca el job: devuelve a `AVAILABLE` las vencidas y audita `EXPIRED` con el dueño previo. */
  async releaseExpired(): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const expired = await this.seatDao.releaseExpired(manager, new Date());
      await this.seatAuditDao.createMany(
        manager,
        expired.map(({ seatId, showtimeId, userId }) => ({
          userId,
          showtimeId,
          seatId,
          event: SeatAuditEvent.EXPIRED,
        })),
      );
      return expired.length;
    });
  }

  private isExpired(seat: Seat, now: Date): boolean {
    return seat.heldUntil === null || seat.heldUntil <= now;
  }

  private async findSelectableOrFail(functionId: number): Promise<Showtime> {
    const showtime = await this.showtimeDao.findSelectableById(functionId);
    if (!showtime) throw new NotFoundException('Función no encontrada');
    return showtime;
  }

  private positiveInt(key: Config, fallback: number): number {
    const value = Number(this.configService.get(key));
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }
}
