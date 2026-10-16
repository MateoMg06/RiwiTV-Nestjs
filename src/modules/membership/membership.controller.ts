import { Controller, Get, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { MembershipService } from './membership.service.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

/**
 * HU-006: sin `@Public()`, el guard global exige JWT; el usuario sale del token, nunca del cuerpo.
 */
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

  @Get()
  getMine(@Req() request: AuthenticatedRequest) {
    return this.membershipService.getMine(this.userIdOf(request));
  }

  @Get('benefits')
  getBenefits(@Req() request: AuthenticatedRequest) {
    return this.membershipService.getBenefits(this.userIdOf(request));
  }

  @Post('create')
  async create(
    @Req() request: AuthenticatedRequest,
  ): Promise<{ code: string; status: MembershipStatus }> {
    const { code, status } = await this.membershipService.create(this.userIdOf(request));
    return { code, status };
  }
}
