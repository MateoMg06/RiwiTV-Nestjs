import { Module } from '@nestjs/common';
import { UserModule } from '../user/user.module.js';
import { MembershipModule } from '../membership/membership.module.js';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';

@Module({
  imports: [UserModule, MembershipModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
