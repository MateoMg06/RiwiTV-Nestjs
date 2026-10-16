import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CatalogQueryDto } from './catalog-query.dto.js';
import { MovieCityQueryDto } from './movie-city-query.dto.js';
import { MovieService } from './movie.service.js';

@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  // Las rutas con `:id` deben declararse después de las fijas (`weekly`, `today`, `upcoming`).
  @Get(['', 'weekly', 'filter'])
  @Public()
  getWeekly(@Query() query: CatalogQueryDto) {
    return this.movieService.getWeekly(query);
  }

  @Get('today')
  @Public()
  getToday(@Query() query: CatalogQueryDto) {
    return this.movieService.getToday(query);
  }

  @Get('upcoming')
  @Public()
  getUpcoming() {
    return this.movieService.getUpcoming();
  }

  @Get('upcoming/:id')
  @Public()
  getUpcomingDetail(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.getUpcomingDetail(id);
  }

  @Get(':id/functions')
  @Public()
  getFunctions(@Param('id', ParseIntPipe) id: number, @Query() query: MovieCityQueryDto) {
    return this.movieService.getFunctions(id, query);
  }

  @Get(':id/recommendations')
  @Public()
  getRecommendations(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.getRecommendations(id);
  }

  // Al final: `:id` captura cualquier segmento, así que va después de las rutas fijas.
  @Get(':id')
  @Public()
  getDetail(@Param('id', ParseIntPipe) id: number, @Query() query: MovieCityQueryDto) {
    return this.movieService.getDetail(id, query);
  }
}
