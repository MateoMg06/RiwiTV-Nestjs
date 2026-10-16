import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { NotificationService } from './notification.service.js';
import { UpcomingNotificationDto } from './upcoming-notification.dto.js';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

/**
 * HU-005: aviso de estreno. Sin `@Public()`: el guard global exige JWT; la identidad sale
 * del token, nunca del cuerpo.
 */
@ApiTags('notificaciones')
@ApiAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({
    summary: 'Solicitar aviso de un próximo estreno',
    description:
      'HU-005 / RN-019. Requiere sesión; la identidad sale del token. Queda en estado `PENDING` y el correo se envía cuando la película pasa a En Cartelera (RN-020).',
  })
  @ApiCreatedResponse({
    description: 'Solicitud registrada: `{ id, userId, movieId, cityId, status, createdAt }`.',
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiNotFoundResponse({ description: 'El próximo estreno o la ciudad no existen.' })
  @ApiConflictResponse({ description: 'Ya existe una solicitud para esa película.' })
  @Post('upcoming')
  requestUpcoming(@Body() dto: UpcomingNotificationDto, @Req() request: AuthenticatedRequest) {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.notificationService.requestUpcoming(userId, dto);
  }
}
