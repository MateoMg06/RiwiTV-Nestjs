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
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

/** HU-010: sin `@Public()`, el guard global exige JWT; el usuario sale del token, nunca del cuerpo. */
@ApiTags('reservas')
@ApiAuth()
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @ApiOperation({
    summary: 'Bloquear sillas',
    description:
      'HU-010. Transacción SERIALIZABLE: se bloquean todas las sillas o ninguna, durante `SEAT_LOCK_MINUTES`. Volver a bloquear sillas propias renueva el plazo.',
  })
  @ApiOkResponse({ description: '`{ functionId, seatIds, expiresAt }`.' })
  @ApiBadRequestResponse({
    description: 'Datos inválidos o se supera el máximo de sillas por función.',
  })
  @ApiNotFoundResponse({ description: 'La función no está disponible o alguna silla no existe.' })
  @ApiConflictResponse({
    description: 'Alguna silla ya no está disponible, o hubo un conflicto de concurrencia.',
  })
  @Post('lock-seats')
  @HttpCode(200)
  lockSeats(@Body() dto: LockSeatsDto, @Req() request: AuthenticatedRequest) {
    return this.reservationService.lockSeats(this.userId(request), dto);
  }

  @ApiOperation({
    summary: 'Liberar sillas',
    description:
      'HU-010. Cuerpo `{ functionId, seatIds? }`. Libera solo las sillas bloqueadas por el usuario; las demás se ignoran. Sin `seatIds` libera todas las suyas.',
  })
  @ApiOkResponse({ description: '`{ functionId, released }`.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiNotFoundResponse({ description: 'La función no está disponible.' })
  @Delete('release-seats')
  releaseSeats(@Body() dto: ReleaseSeatsDto, @Req() request: AuthenticatedRequest) {
    return this.reservationService.releaseSeats(this.userId(request), dto);
  }

  @ApiQuery({ name: 'functionId', type: Number, description: 'Id de la función.' })
  @ApiOperation({
    summary: 'Resumen de mis sillas bloqueadas',
    description:
      'HU-010. Sillas vigentes del usuario en la función, con precio por silla (precio de la función más el recargo de la silla) y total.',
  })
  @ApiOkResponse({ description: 'Sillas bloqueadas y total.' })
  @ApiBadRequestResponse({ description: '`functionId` ausente o no numérico.' })
  @ApiNotFoundResponse({ description: 'La función no está disponible.' })
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
