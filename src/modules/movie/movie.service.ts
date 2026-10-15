import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto.js';
import { GetMovieCatalogDto } from './dto/get-movie-catalog.dto.js';
import { MovieDao } from './movie.dao.js';
import { Movie } from './movie.entity.js';

@Injectable()
export class MovieService {
  constructor(private readonly movieDao: MovieDao) {}

  async create(dto: CreateMovieDto): Promise<GetMovieCatalogDto> {
    const movie = await this.movieDao.create(dto);
    return this.toDto(movie);
  }

  async getCatalog(): Promise<GetMovieCatalogDto[]> {
    const movies = await this.movieDao.findAll();
    return movies.map((movie) => this.toDto(movie));
  }

  async getByName(name: string): Promise<GetMovieCatalogDto> {
    const movie = await this.movieDao.findByName(name);
    if (!movie) throw new NotFoundException(`Película "${name}" no encontrada`);
    return this.toDto(movie);
  }

  async getMovieCinemas(id: number): Promise<object[]> {
    const movie = await this.movieDao.findById(id);
    if (!movie) throw new NotFoundException('Película no encontrada');
    return this.movieDao.findCinemasByMovieId(id);
  }

  private toDto(movie: Movie): GetMovieCatalogDto {
    return {
      id: movie.id,
      name: movie.name,
      clasification: movie.clasification,
      duration: movie.duration,
      gener: movie.gener,
    };
  }
}
