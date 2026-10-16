import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { SeatStatus } from '../../common/enums/domain.enums.js';
import { Seat } from './seat.entity.js';

/** Silla que el job devolvió a `AVAILABLE`, con el dueño que tenía el bloqueo. */
export interface ExpiredSeat {
  seatId: number;
  showtimeId: number;
  userId: number | null;
}

/**
 * Acceso a `Seats` (HU-010). Los métodos que cambian estado reciben el `EntityManager` de la
 * transacción abierta por el service; ninguno abre la suya.
 */
@Injectable()
export class SeatDao {
  constructor(private readonly dataSource: DataSource) {}

  /** Mapa completo de la función, en orden de fila y número. */
  findByShowtime(showtimeId: number): Promise<Seat[]> {
    return this.dataSource
      .getRepository(Seat)
      .createQueryBuilder('seat')
      .where('seat.showtimeId = :showtimeId', { showtimeId })
      .orderBy('seat.row', 'ASC')
      .addOrderBy('seat.number', 'ASC')
      .getMany();
  }

  /**
   * `SELECT ... FOR UPDATE` de las sillas pedidas, filtradas por función (una silla ajena a la
   * función no aparece). `ORDER BY id` fija el orden de adquisición de locks y evita deadlocks
   * entre dos bloqueos que cruzan las mismas sillas.
   */
  findForUpdate(manager: EntityManager, showtimeId: number, ids: number[]): Promise<Seat[]> {
    return manager
      .getRepository(Seat)
      .createQueryBuilder('seat')
      .setLock('pessimistic_write')
      .where('seat.showtimeId = :showtimeId', { showtimeId })
      .andWhere('seat.id IN (:...ids)', { ids })
      .orderBy('seat.id', 'ASC')
      .getMany();
  }

  /** Pasa las sillas (ya bloqueadas con `findForUpdate`) a `HELD` para el usuario. */
  async hold(manager: EntityManager, ids: number[], userId: number, until: Date): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(Seat)
      .set({ status: SeatStatus.HELD, heldByUserId: userId, heldUntil: until })
      .where('id IN (:...ids)', { ids })
      .execute();
  }

  /** Renueva el plazo de las sillas `HELD` vigentes del usuario en la función; devuelve sus ids. */
  async renewHeldByUser(
    manager: EntityManager,
    showtimeId: number,
    userId: number,
    until: Date,
    now: Date,
  ): Promise<number[]> {
    const result = await manager
      .createQueryBuilder()
      .update(Seat)
      .set({ heldUntil: until })
      .where('"showtimeId" = :showtimeId', { showtimeId })
      .andWhere('"heldByUserId" = :userId', { userId })
      .andWhere('status = :held', { held: SeatStatus.HELD })
      .andWhere('"heldUntil" > :now', { now })
      .returning('id')
      .execute();
    return (result.raw as Array<{ id: number }>).map((row) => row.id);
  }

  /** Sillas `HELD` vigentes del usuario en la función. */
  countHeldByUser(
    manager: EntityManager,
    showtimeId: number,
    userId: number,
    now: Date,
  ): Promise<number> {
    return manager
      .getRepository(Seat)
      .createQueryBuilder('seat')
      .where('seat.showtimeId = :showtimeId', { showtimeId })
      .andWhere('seat.heldByUserId = :userId', { userId })
      .andWhere('seat.status = :held', { held: SeatStatus.HELD })
      .andWhere('seat.heldUntil > :now', { now })
      .getCount();
  }

  /** Sillas `HELD` vigentes del usuario en la función, en orden de fila y número. */
  findHeldByUser(showtimeId: number, userId: number, now: Date): Promise<Seat[]> {
    return this.dataSource
      .getRepository(Seat)
      .createQueryBuilder('seat')
      .where('seat.showtimeId = :showtimeId', { showtimeId })
      .andWhere('seat.heldByUserId = :userId', { userId })
      .andWhere('seat.status = :held', { held: SeatStatus.HELD })
      .andWhere('seat.heldUntil > :now', { now })
      .orderBy('seat.row', 'ASC')
      .addOrderBy('seat.number', 'ASC')
      .getMany();
  }

  /**
   * Libera solo sillas `HELD` del usuario (nunca `SOLD` ni `DISABLED` ni de otro usuario).
   * Sin `ids` libera todas las suyas en la función. Devuelve los ids realmente liberados.
   */
  async releaseByUser(
    manager: EntityManager,
    showtimeId: number,
    userId: number,
    ids?: number[],
  ): Promise<number[]> {
    const query = manager
      .createQueryBuilder()
      .update(Seat)
      .set({ status: SeatStatus.AVAILABLE, heldByUserId: null, heldUntil: null })
      .where('"showtimeId" = :showtimeId', { showtimeId })
      .andWhere('"heldByUserId" = :userId', { userId })
      .andWhere('status = :held', { held: SeatStatus.HELD });
    if (ids) query.andWhere('id IN (:...ids)', { ids });

    const result = await query.returning('id').execute();
    return (result.raw as Array<{ id: number }>).map((row) => row.id);
  }

  /**
   * Devuelve a `AVAILABLE` las sillas `HELD` vencidas. Primero las bloquea (`FOR UPDATE`, por id)
   * para capturar el dueño previo, que el `UPDATE` borra; la auditoría `EXPIRED` lo necesita.
   */
  async releaseExpired(manager: EntityManager, now: Date): Promise<ExpiredSeat[]> {
    const expired = await manager
      .getRepository(Seat)
      .createQueryBuilder('seat')
      .setLock('pessimistic_write')
      .where('seat.status = :held', { held: SeatStatus.HELD })
      .andWhere('seat.heldUntil <= :now', { now })
      .orderBy('seat.id', 'ASC')
      .getMany();
    if (expired.length === 0) return [];

    await manager
      .createQueryBuilder()
      .update(Seat)
      .set({ status: SeatStatus.AVAILABLE, heldByUserId: null, heldUntil: null })
      .where('id IN (:...ids)', { ids: expired.map((seat) => seat.id) })
      .execute();

    return expired.map((seat) => ({
      seatId: seat.id,
      showtimeId: seat.showtimeId,
      userId: seat.heldByUserId,
    }));
  }
}
