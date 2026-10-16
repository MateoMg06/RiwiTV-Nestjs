import { Module } from '@nestjs/common';
import { ShowtimeModule } from '../showtime/showtime.module.js';
import { MovieController } from './movie.controller.js';
import { MovieService } from './movie.service.js';

@Module({
  imports: [ShowtimeModule],
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {}
