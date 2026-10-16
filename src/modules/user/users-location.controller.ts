import { Body, Controller, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service.js';
import { SetLocationDto } from './set-location.dto.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import type { UserRole } from '../../common/enums/domain.enums.js';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

/**
 * HU-002: ubicación del usuario autenticado. Sin `@Public()`: el guard global
 * exige JWT (cualquier rol). La identidad sale del token, nunca del cuerpo.
 */
@ApiTags('ubicación')
@ApiAuth()
@Controller('users')
export class UsersLocationController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Guardar mi ciudad',
    description: 'HU-002 / RN-006. Solo se acepta una ciudad activa con al menos un cine activo.',
  })
  @ApiOkResponse({
    description: '`{ message, user: { id, name, lastName, email, role, cityId } }`.',
  })
  @ApiBadRequestResponse({ description: '`cityId` inválido.' })
  @ApiNotFoundResponse({ description: 'Usuario o ciudad no encontrados.' })
  @ApiUnprocessableEntityResponse({
    description: 'La ciudad está inactiva o no tiene cines activos.',
  })
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
