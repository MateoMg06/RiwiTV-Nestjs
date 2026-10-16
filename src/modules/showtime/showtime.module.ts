import { Module } from '@nestjs/common';
import { ShowtimeDao } from './showtime.dao.js';
import { ShowtimeService } from './showtime.service.js';

@Module({
  providers: [ShowtimeDao, ShowtimeService],
  exports: [ShowtimeDao],
})
export class ShowtimeModule {}
