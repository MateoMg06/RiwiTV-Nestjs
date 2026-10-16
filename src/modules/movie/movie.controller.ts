import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CatalogQueryDto } from './catalog-query.dto.js';
import { MovieCityQueryDto } from './movie-city-query.dto.js';
import { MovieService } from './movie.service.js';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('películas')
@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  // Las rutas con `:id` deben declararse después de las fijas (`weekly`, `today`, `upcoming`).
  @ApiOperation({
    summary: 'Cartelera de los próximos 7 días',
    description:
      'HU-003 / RN-011 / RN-012. Público. `GET /movies`, `/movies/weekly` y `/movies/filter` responden igual. Filtros opcionales por query: `cityId`, `cinemaId`, `genre`, `classification`, `language`, `roomType`, `format`, `date` (YYYY-MM-DD) y `available`.',
  })
  @ApiOkResponse({ description: 'Películas en cartelera con sus funciones activas.' })
  @ApiBadRequestResponse({
    description: 'Algún filtro es inválido (por ejemplo, `date` sin formato YYYY-MM-DD).',
  })
  @Get(['', 'weekly', 'filter'])
  @Public()
  getWeekly(@Query() query: CatalogQueryDto) {
    return this.movieService.getWeekly(query);
  }

  @ApiOperation({
    summary: 'Cartelera de hoy',
    description:
      'HU-003. Público. Desde ahora hasta el fin del día. Filtros opcionales por query: `cityId`, `cinemaId`, `genre`, `classification`, `language`, `roomType`, `format`, `date` (YYYY-MM-DD) y `available`.',
  })
  @ApiOkResponse({ description: 'Películas con funciones de hoy.' })
  @ApiBadRequestResponse({ description: 'Algún filtro es inválido.' })
  @Get('today')
  @Public()
  getToday(@Query() query: CatalogQueryDto) {
    return this.movieService.getToday(query);
  }

  @ApiOperation({
    summary: 'Próximos estrenos',
    description:
      'HU-005. Público. Ordenados por fecha de estreno, con `daysUntilRelease` para el contador regresivo.',
  })
  @ApiOkResponse({ description: 'Lista de próximos estrenos.' })
  @Get('upcoming')
  @Public()
  getUpcoming() {
    return this.movieService.getUpcoming();
  }

  @ApiOperation({ summary: 'Detalle de un próximo estreno', description: 'HU-005. Público.' })
  @ApiOkResponse({ description: 'Próximo estreno con su contador regresivo.' })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'No existe, ya se estrenó o está en cartelera.' })
  @Get('upcoming/:id')
  @Public()
  getUpcomingDetail(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.getUpcomingDetail(id);
  }

  @ApiOperation({
    summary: 'Funciones futuras de una película',
    description: 'HU-004. Público. `cityId` opcional filtra por ciudad.',
  })
  @ApiOkResponse({ description: 'Funciones futuras de la película.' })
  @ApiBadRequestResponse({ description: 'Id o `cityId` inválidos.' })
  @ApiNotFoundResponse({ description: 'La película no existe o no está en cartelera.' })
  @Get(':id/functions')
  @Public()
  getFunctions(@Param('id', ParseIntPipe) id: number, @Query() query: MovieCityQueryDto) {
    return this.movieService.getFunctions(id, query);
  }

  @ApiOperation({
    summary: 'Películas recomendadas',
    description:
      'HU-004. Público. Hasta 6 películas en cartelera del mismo género, mejor calificadas primero.',
  })
  @ApiOkResponse({ description: 'Películas recomendadas.' })
  @ApiBadRequestResponse({ description: 'El id no es numérico.' })
  @ApiNotFoundResponse({ description: 'La película no existe o no está en cartelera.' })
  @Get(':id/recommendations')
  @Public()
  getRecommendations(@Param('id', ParseIntPipe) id: number) {
    return this.movieService.getRecommendations(id);
  }

  // Al final: `:id` captura cualquier segmento, así que va después de las rutas fijas.
  @ApiOperation({
    summary: 'Detalle de una película',
    description:
      'HU-004. Público. Incluye formatos, idiomas, precio por formato y funciones futuras; `cityId` opcional filtra por ciudad.',
  })
  @ApiOkResponse({ description: 'Detalle de la película.' })
  @ApiBadRequestResponse({ description: 'Id o `cityId` inválidos.' })
  @ApiNotFoundResponse({ description: 'La película no existe o no está en cartelera.' })
  @Get(':id')
  @Public()
  getDetail(@Param('id', ParseIntPipe) id: number, @Query() query: MovieCityQueryDto) {
    return this.movieService.getDetail(id, query);
  }
}
