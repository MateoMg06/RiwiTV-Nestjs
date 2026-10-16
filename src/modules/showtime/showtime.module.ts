import { Module } from '@nestjs/common';
import { FunctionsController } from './functions.controller.js';
import { ShowtimeDao } from './showtime.dao.js';
import { ShowtimeService } from './showtime.service.js';

@Module({
  controllers: [FunctionsController],
  providers: [ShowtimeDao, ShowtimeService],
  exports: [ShowtimeDao],
})
export class ShowtimeModule {}
