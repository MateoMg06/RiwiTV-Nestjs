import { Controller, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { MembershipService } from './membership.service.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

/**
 * HU-006: sin `@Public()`, el guard global exige JWT; el usuario sale del token, nunca del cuerpo.
 */
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post('create')
  async create(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ code: string; status: MembershipStatus }> {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Usuario no autenticado');
    }
    const { code, status } = await this.membershipService.create(userId);
    return { code, status };
  }
}
