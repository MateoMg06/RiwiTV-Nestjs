import { Body, Controller, Get, Put, Req, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { UpdateProfileDto } from './update-profile.dto.js';
import { ProfileResponse, ProfileService } from './profile.service.js';

/** HU-008: sin `@Public()` el guard global exige JWT; la identidad sale del token. */
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

  @Get()
  get(@Req() request: AuthenticatedRequest): Promise<ProfileResponse> {
    return this.profileService.get(this.userIdOf(request));
  }

  @Put()
  update(
    @Body() dto: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProfileResponse> {
    return this.profileService.update(this.userIdOf(request), dto);
  }
}
