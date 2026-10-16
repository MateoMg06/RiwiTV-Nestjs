import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import { SetLocationDto } from './set-location.dto.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import type { UserRole } from '../../common/enums/domain.enums.js';

/**
 * HU-002: ubicación del usuario autenticado. Sin `@Public()`: el guard global
 * exige JWT (cualquier rol). La identidad sale del token, nunca del cuerpo.
 */
@Controller('users')
export class UsersLocationController {
  constructor(private readonly userService: UserService) {}

  @Post('location')
  @HttpCode(200)
  async setLocation(
    @Body() dto: SetLocationDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{
    message: string;
    user: {
      id: number;
      name: string;
      lastName: string;
      email: string;
      role: UserRole;
      cityId: number | null;
    };
  }> {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Usuario no autenticado');
    }

    const user = await this.userService.setLocation(userId, dto.cityId);

    // Proyección explícita: nunca se devuelve la entidad completa.
    return {
      message: 'Ubicación actualizada correctamente',
      user: {
        id: user.id,
        name: user.name,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        cityId: user.cityId,
      },
    };
  }
}
