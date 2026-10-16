import { Module } from '@nestjs/common';
import { MembershipController } from './membership.controller.js';
import { MembershipDao } from './membership.dao.js';
import { MembershipService } from './membership.service.js';

@Module({
  controllers: [MembershipController],
  providers: [MembershipService, MembershipDao],
  exports: [MembershipService],
})
export class MembershipModule {}
