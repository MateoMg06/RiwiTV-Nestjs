import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MovieService } from './movie.service.js';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { GetMovieCatalogDto } from './dto/get-movie-catalog.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

@ApiTags('Movies')
@Controller('movies')
export class MovieController {
  constructor(private readonly movieService: MovieService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtiene la cartelera completa de películas' })
  @ApiOkResponse({ type: [GetMovieCatalogDto] })
  getCatalog() {
    return this.movieService.getCatalog();
  }

  @Public()
  @Get(':id/cinemas')
  @ApiOperation({ summary: 'Obtiene los cines donde se proyecta una película' })
  @ApiBadRequestResponse({ description: 'El ID debe ser un número entero positivo' })
  @ApiNotFoundResponse({ description: 'Película no encontrada' })
  getMovieCinemas(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST })) id: number,
  ) {
    return this.movieService.getMovieCinemas(id);
  }

  @Public()
  @Get(':name')
  @ApiOperation({ summary: 'Obtiene una película por nombre' })
  @ApiOkResponse({ type: GetMovieCatalogDto })
  @ApiNotFoundResponse({ description: 'Película no encontrada' })
  getByName(@Param('name') name: string) {
    return this.movieService.getByName(name);
  }

  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crea una nueva película' })
  @ApiCreatedResponse({ type: GetMovieCatalogDto })
  create(@Body() createMovieDto: CreateMovieDto) {
    return this.movieService.create(createMovieDto);
  }
}
