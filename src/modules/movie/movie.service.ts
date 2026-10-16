import { BadRequestException, Injectable } from '@nestjs/common';
import { CatalogQueryDto } from './catalog-query.dto.js';
import {
  AgeRating,
  AudioType,
  MovieStatus,
  ShowFormat,
  ShowtimeStatus,
} from '../../common/enums/domain.enums.js';
import { ShowtimeDao } from '../showtime/showtime.dao.js';

export interface WeeklyShowtime {
  id: number;
  startsAt: Date;
  format: ShowFormat;
  language: string;
  roomType: string;
  audioType: AudioType;
  status: ShowtimeStatus;
  cinema: { id: number; name: string };
}

export interface WeeklyMovie {
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
  formats: ShowFormat[];
  showtimes: WeeklyShowtime[];
}

/** Días siguientes a hoy que cubre la cartelera (RN-012: 7 días en total). */
const EXTRA_DAYS = 6;

@Injectable()
export class MovieService {
  constructor(private readonly showtimeDao: ShowtimeDao) {}

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
      const { movie, cinema } = showtime;
      let entry = movies.get(movie.id);
      if (!entry) {
        entry = {
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
          formats: [],
          showtimes: [],
        };
        movies.set(movie.id, entry);
      }
      if (!entry.formats.includes(showtime.format)) entry.formats.push(showtime.format);
      entry.showtimes.push({
        id: showtime.id,
        startsAt: showtime.startsAt,
        format: showtime.format,
        language: showtime.language,
        roomType: showtime.roomType,
        audioType: showtime.audioType,
        status: showtime.status,
        cinema: { id: cinema.id, name: cinema.name },
      });
    }
    return [...movies.values()];
  }
}
