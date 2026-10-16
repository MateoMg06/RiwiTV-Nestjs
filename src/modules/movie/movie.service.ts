import { Injectable } from '@nestjs/common';
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
  async getWeekly(cityId?: number): Promise<WeeklyMovie[]> {
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + EXTRA_DAYS);
    to.setHours(23, 59, 59, 999);
    return this.getCatalog(from, to, cityId);
  }

  /** Cartelera de hoy: de ahora al fin del día (zona horaria `TZ`). */
  async getToday(cityId?: number): Promise<WeeklyMovie[]> {
    const from = new Date();
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return this.getCatalog(from, to, cityId);
  }

  private async getCatalog(from: Date, to: Date, cityId?: number): Promise<WeeklyMovie[]> {
    const showtimes = await this.showtimeDao.findCatalogRange({ from, to, cityId });

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
        audioType: showtime.audioType,
        status: showtime.status,
        cinema: { id: cinema.id, name: cinema.name },
      });
    }
    return [...movies.values()];
  }
}
