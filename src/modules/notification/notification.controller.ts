import { Body, Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { NotificationService } from './notification.service.js';
import { UpcomingNotificationDto } from './upcoming-notification.dto.js';

/**
 * HU-005: aviso de estreno. Sin `@Public()`: el guard global exige JWT; la identidad sale
 * del token, nunca del cuerpo.
 */
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('upcoming')
  requestUpcoming(@Body() dto: UpcomingNotificationDto, @Req() request: AuthenticatedRequest) {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return this.notificationService.requestUpcoming(userId, dto);
  }
}
