import { Body, Controller, Get, Put, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UpdateProfileDto } from './update-profile.dto.js';
import { ProfileResponse, ProfileService } from './profile.service.js';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

/** HU-008: sin `@Public()` el guard global exige JWT; la identidad sale del token. */
@ApiTags('perfil')
@ApiAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  private userIdOf(request: AuthenticatedRequest): number {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return userId;
  }

  @ApiOperation({
    summary: 'Consultar mi perfil',
    description: 'HU-008. Datos personales, membresía y preferencias del usuario autenticado.',
  })
  @ApiOkResponse({ description: 'Perfil del usuario.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @Get()
  get(@Req() request: AuthenticatedRequest): Promise<ProfileResponse> {
    return this.profileService.get(this.userIdOf(request));
  }

  @ApiOperation({
    summary: 'Actualizar mi perfil',
    description:
      'HU-008 / RN-034. Cambiar el correo exige confirmarlo y verificarlo: queda como correo pendiente hasta usar el token enviado a la dirección nueva (`emailVerificationRequired: true`).',
  })
  @ApiOkResponse({ description: 'Perfil actualizado.' })
  @ApiBadRequestResponse({ description: 'Datos inválidos o correos que no coinciden.' })
  @ApiNotFoundResponse({ description: 'Usuario no encontrado.' })
  @ApiConflictResponse({ description: 'El correo nuevo ya está registrado.' })
  @Put()
  update(
    @Body() dto: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProfileResponse & { emailVerificationRequired?: true }> {
    return this.profileService.update(this.userIdOf(request), dto);
  }
}
