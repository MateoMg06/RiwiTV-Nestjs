import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module.js';
import { ShowtimeModule } from '../showtime/showtime.module.js';
import { ReservationController } from './reservation.controller.js';
import { ReservationService } from './reservation.service.js';
import { SeatAuditDao } from './seat-audit.dao.js';
import { SeatLockExpiryJob } from './seat-lock-expiry.job.js';
import { SeatDao } from './seat.dao.js';
import { SeatsController } from './seats.controller.js';

@Module({
  imports: [ShowtimeModule, ConfigModule],
  controllers: [SeatsController, ReservationController],
  providers: [ReservationService, SeatDao, SeatAuditDao, SeatLockExpiryJob],
})
export class ReservationModule {}
