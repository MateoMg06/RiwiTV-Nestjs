import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationService } from './reservation.service.js';

/**
 * RN-040: cada minuto devuelve a `AVAILABLE` las sillas `HELD` vencidas y audita `EXPIRED`.
 * El mapa ya las muestra libres antes de este job, y `lockSeats` las puede tomar; el job solo
 * limpia la BD. Una sola instancia: con varias, el `FOR UPDATE` evita liberar dos veces.
 */
@Injectable()
export class SeatLockExpiryJob {
  private readonly logger = new Logger(SeatLockExpiryJob.name);
  /** Evita que una ejecución lenta se solape con la siguiente. */
  private running = false;

  constructor(private readonly reservationService: ReservationService) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'seat-lock-expiry' })
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const released = await this.reservationService.releaseExpired();
      if (released > 0) this.logger.log(`Sillas liberadas por vencimiento: ${released}`);
    } catch (error) {
      // Un fallo no debe romper el planificador: la siguiente ejecución lo reintenta.
      this.logger.error(
        `No se pudieron liberar las sillas vencidas: ${error instanceof Error ? error.message : error}`,
      );
    } finally {
      this.running = false;
    }
  }
}
