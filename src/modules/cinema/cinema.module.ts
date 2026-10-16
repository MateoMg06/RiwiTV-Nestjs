import { Module } from '@nestjs/common';
import { CinemaDao } from './cinema.dao.js';

@Module({
  providers: [CinemaDao],
  exports: [CinemaDao],
})
export class CinemaModule {}
