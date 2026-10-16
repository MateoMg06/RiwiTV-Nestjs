import { Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { MembershipService } from './membership.service.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

/**
 * HU-006: sin `@Public()`, el guard global exige JWT; el usuario sale del token, nunca del cuerpo.
 */
@ApiTags('membresía')
@ApiAuth()
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  private userIdOf(request: AuthenticatedRequest): number {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    return userId;
  }

  @ApiOperation({
    summary: 'Consultar mi membresía',
    description: 'HU-008. Código, estado, nivel y QR (el payload es el propio código).',
  })
  @ApiOkResponse({ description: '`{ code, status, level, qr: { payload }, createdAt }`.' })
  @ApiNotFoundResponse({ description: 'El usuario no tiene membresía.' })
  @Get()
  getMine(@Req() request: AuthenticatedRequest) {
    return this.membershipService.getMine(this.userIdOf(request));
  }

  @ApiOperation({
    summary: 'Consultar mis beneficios',
    description:
      'HU-008 / RN-032. Nivel, porcentaje de descuento y beneficios; `bonuses` está vacío por ahora.',
  })
  @ApiOkResponse({ description: '`{ level, discountPercent, benefits, bonuses }`.' })
  @ApiNotFoundResponse({ description: 'El usuario no tiene membresía.' })
  @Get('benefits')
  getBenefits(@Req() request: AuthenticatedRequest) {
    return this.membershipService.getBenefits(this.userIdOf(request));
  }

  @ApiOperation({
    summary: 'Crear mi membresía',
    description:
      'HU-006. El registro ya crea una; este endpoint cubre a usuarios que no la tengan.',
  })
  @ApiCreatedResponse({ description: '`{ code, status }`.' })
  @ApiConflictResponse({ description: 'El usuario ya tiene una membresía.' })
  @Post('create')
  async create(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ code: string; status: MembershipStatus }> {
    const { code, status } = await this.membershipService.create(this.userIdOf(request));
    return { code, status };
  }
}
