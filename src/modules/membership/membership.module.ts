import { Module } from '@nestjs/common';
import { MembershipDao } from './membership.dao.js';
import { MembershipService } from './membership.service.js';

@Module({
  providers: [MembershipService, MembershipDao],
  exports: [MembershipService],
})
export class MembershipModule {}
