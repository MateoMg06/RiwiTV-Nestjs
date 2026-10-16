import { Module } from '@nestjs/common';
import { ShowtimeDao } from './showtime.dao.js';

@Module({
  providers: [ShowtimeDao],
  exports: [ShowtimeDao],
})
export class ShowtimeModule {}
