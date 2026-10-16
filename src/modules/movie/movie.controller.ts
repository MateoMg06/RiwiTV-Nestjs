import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CatalogQueryDto } from './catalog-query.dto.js';
import { MovieService } from './movie.service.js';

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  // Las rutas con `:id` (HU-004) deben declararse después de las rutas fijas.
  @Get(['', 'weekly'])
  @Public()
  getWeekly(@Query() query: CatalogQueryDto) {
    return this.movieService.getWeekly(query.cityId);
  }

  @Get('today')
  @Public()
  getToday(@Query() query: CatalogQueryDto) {
    return this.movieService.getToday(query.cityId);
  }
}
