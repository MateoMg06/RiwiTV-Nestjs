import { Module } from '@nestjs/common';
import { ShowtimeModule } from '../showtime/showtime.module.js';
import { MovieController } from './movie.controller.js';
import { MovieDao } from './movie.dao.js';
import { MovieService } from './movie.service.js';

@Module({
  imports: [ShowtimeModule],
  controllers: [MovieController],
  providers: [MovieService, MovieDao],
  exports: [MovieDao],
})
export class MovieModule {}
