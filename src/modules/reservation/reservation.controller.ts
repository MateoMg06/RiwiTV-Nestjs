import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { LockSeatsDto } from './lock-seats.dto.js';
import { ReleaseSeatsDto } from './release-seats.dto.js';
import { ReservationService } from './reservation.service.js';

/** HU-010: sin `@Public()`, el guard global exige JWT; el usuario sale del token, nunca del cuerpo. */
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post('lock-seats')
  @HttpCode(200)
  lockSeats(@Body() dto: LockSeatsDto, @Req() request: AuthenticatedRequest) {
    return this.reservationService.lockSeats(this.userId(request), dto);
  }

  @Delete('release-seats')
  releaseSeats(@Body() dto: ReleaseSeatsDto, @Req() request: AuthenticatedRequest) {
    return this.reservationService.releaseSeats(this.userId(request), dto);
  }

  @Get('summary')
  getSummary(
    @Query('functionId', ParseIntPipe) functionId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reservationService.getSummary(this.userId(request), functionId);
  }

  private userId(request: AuthenticatedRequest): number {
    const userId = request.user?.id;
    if (userId === undefined) throw new UnauthorizedException('Usuario no autenticado');
    return userId;
  }
}
