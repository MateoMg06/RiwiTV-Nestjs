import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CatalogQueryDto } from './catalog-query.dto.js';
import {
  AgeRating,
  AudioType,
  MovieStatus,
  ShowFormat,
  ShowtimeStatus,
} from '../../common/enums/domain.enums.js';
import { ShowtimeDao } from '../showtime/showtime.dao.js';
import type { Showtime } from '../showtime/showtime.entity.js';
import { MovieDao } from './movie.dao.js';
import type { Movie } from './movie.entity.js';
import type { MovieCityQueryDto } from './movie-city-query.dto.js';

export interface WeeklyShowtime {
  id: number;
  startsAt: Date;
  format: ShowFormat;
  language: string;
  roomType: string;
  audioType: AudioType;
  status: ShowtimeStatus;
  price: number;
  cinema: { id: number; name: string };
}

export interface MovieBase {
  id: number;
  name: string;
  genre: string;
  classification: AgeRating;
  duration: number;
  director: string;
  posterUrl: string | null;
  releaseDate: Date;
  status: MovieStatus;
  audienceRating: number;
}

export interface WeeklyMovie extends MovieBase {
  formats: ShowFormat[];
  showtimes: WeeklyShowtime[];
}

export interface FormatPrice {
  format: ShowFormat;
  price: number;
}

export interface MovieDetail extends WeeklyMovie {
  synopsis: string;
  cast: string[];
  bannerUrl: string | null;
  trailerUrl: string | null;
  languages: string[];
  prices: FormatPrice[];
}

const toShowtime = (showtime: Showtime): WeeklyShowtime => ({
  id: showtime.id,
  startsAt: showtime.startsAt,
  format: showtime.format,
  language: showtime.language,
  roomType: showtime.roomType,
  audioType: showtime.audioType,
  status: showtime.status,
  price: Number(showtime.price),
  cinema: { id: showtime.cinema.id, name: showtime.cinema.name },
});

const toMovieBase = (movie: Movie): MovieBase => ({
  id: movie.id,
  name: movie.name,
  genre: movie.genre,
  classification: movie.classification,
  duration: movie.duration,
  director: movie.director,
  posterUrl: movie.posterUrl,
  releaseDate: movie.releaseDate,
  status: movie.status,
  audienceRating: Number(movie.audienceRating),
});

/** Días siguientes a hoy que cubre la cartelera (RN-012: 7 días en total). */
const EXTRA_DAYS = 6;

@Injectable()
export class MovieService {
  constructor(
    private readonly showtimeDao: ShowtimeDao,
    private readonly movieDao: MovieDao,
  ) {}

  /**
   * Cartelera semanal: de ahora al fin del día +6 (zona horaria `TZ`).
   * Sin caché (RN-013): cada petición consulta la BD.
   */
  async getWeekly(filters: CatalogQueryDto = {}): Promise<WeeklyMovie[]> {
    return this.getCatalog('WEEK', filters);
  }

  /** Cartelera de hoy: de ahora al fin del día (zona horaria `TZ`). */
  async getToday(filters: CatalogQueryDto = {}): Promise<WeeklyMovie[]> {
    return this.getCatalog('TODAY', filters);
  }

  /**
   * Sin `date`: la ventana de cada cartelera. Con `date` (YYYY-MM-DD): ese día completo,
   * pero sin funciones ya pasadas (`from` = max(inicio del día, ahora)). `null` si no queda rango.
   */
  private resolveRange(range: 'WEEK' | 'TODAY', date?: string): { from: Date; to: Date } | null {
    if (date === undefined) {
      const from = new Date();
      const to = new Date(from);
      if (range === 'WEEK') to.setDate(to.getDate() + EXTRA_DAYS);
      to.setHours(23, 59, 59, 999);
      return { from, to };
    }

    const day = new Date(`${date}T00:00:00`);
    const [year, month, dayOfMonth] = date.split('-').map(Number);
    if (
      Number.isNaN(day.getTime()) ||
      day.getFullYear() !== year ||
      day.getMonth() + 1 !== month ||
      day.getDate() !== dayOfMonth
    ) {
      throw new BadRequestException('date debe tener formato YYYY-MM-DD');
    }
    const to = new Date(day);
    to.setHours(23, 59, 59, 999);
    const now = new Date();
    const from = day > now ? day : now;
    return from > to ? null : { from, to };
  }

  private async getCatalog(
    range: 'WEEK' | 'TODAY',
    { date, ...filters }: CatalogQueryDto,
  ): Promise<WeeklyMovie[]> {
    const window = this.resolveRange(range, date);
    if (!window) return [];

    const showtimes = await this.showtimeDao.findCatalogRange({ ...window, ...filters });

    const movies = new Map<number, WeeklyMovie>();
    for (const showtime of showtimes) {
      const { movie } = showtime;
      let entry = movies.get(movie.id);
      if (!entry) {
        entry = { ...toMovieBase(movie), formats: [], showtimes: [] };
        movies.set(movie.id, entry);
      }
      if (!entry.formats.includes(showtime.format)) entry.formats.push(showtime.format);
      entry.showtimes.push(toShowtime(showtime));
    }
    return [...movies.values()];
  }

  /** Detalle de una película en cartelera con sus funciones futuras (HU-004). */
  async getDetail(id: number, { cityId }: MovieCityQueryDto = {}): Promise<MovieDetail> {
    const movie = await this.findActiveOrFail(id);
    const showtimes = await this.findFutureShowtimes(id, cityId);

    const formats: ShowFormat[] = [];
    const languages: string[] = [];
    const cheapest = new Map<ShowFormat, number>();
    for (const showtime of showtimes) {
      if (!formats.includes(showtime.format)) formats.push(showtime.format);
      if (!languages.includes(showtime.language)) languages.push(showtime.language);
      const current = cheapest.get(showtime.format);
      if (current === undefined || showtime.price < current) {
        cheapest.set(showtime.format, showtime.price);
      }
    }

    return {
      ...toMovieBase(movie),
      synopsis: movie.synopsis,
      cast: movie.cast,
      bannerUrl: movie.bannerUrl,
      trailerUrl: movie.trailerUrl,
      formats,
      languages,
      prices: [...cheapest].map(([format, price]) => ({ format, price })),
      showtimes,
    };
  }

  /** Solo las funciones futuras de la película (mismo criterio que el detalle). */
  async getFunctions(id: number, { cityId }: MovieCityQueryDto = {}): Promise<WeeklyShowtime[]> {
    await this.findActiveOrFail(id);
    return this.findFutureShowtimes(id, cityId);
  }

  /** Hasta 6 películas activas del mismo género, mejor calificadas primero. */
  async getRecommendations(id: number): Promise<MovieBase[]> {
    const movie = await this.findActiveOrFail(id);
    const recommended = await this.movieDao.findRecommendations(movie);
    return recommended.map(toMovieBase);
  }

  private async findActiveOrFail(id: number): Promise<Movie> {
    const movie = await this.movieDao.findActiveById(id);
    if (!movie) throw new NotFoundException('Película no encontrada');
    return movie;
  }

  private async findFutureShowtimes(id: number, cityId?: number): Promise<WeeklyShowtime[]> {
    const showtimes = await this.showtimeDao.findFutureByMovie(id, cityId);
    return showtimes.map(toShowtime);
  }
}
