import { Module } from '@nestjs/common';
import { MovieController } from './movie.controller.js';
import { MovieService } from './movie.service.js';
import { MovieDao } from './movie.dao.js';

@Module({
  controllers: [MovieController],
  providers: [MovieService, MovieDao],
  exports: [MovieService, MovieDao],
})
export class MovieModule {}
