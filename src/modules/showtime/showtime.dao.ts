import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  AgeRating,
  MovieStatus,
  ShowFormat,
  ShowtimeStatus,
} from '../../common/enums/domain.enums.js';
import { Showtime } from './showtime.entity.js';

export interface CatalogRange {
  from: Date;
  to: Date;
  cityId?: number;
  cinemaId?: number;
  genre?: string;
  classification?: AgeRating;
  language?: string;
  format?: ShowFormat;
  roomType?: string;
  available?: boolean;
}

@Injectable()
export class ShowtimeDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<Showtime> {
    return this.dataSource.getRepository(Showtime);
  }

  /** Funciones no canceladas de películas activas en cines activos, en una sola consulta. */
  findCatalogRange({
    from,
    to,
    cityId,
    cinemaId,
    genre,
    classification,
    language,
    format,
    roomType,
    available,
  }: CatalogRange): Promise<Showtime[]> {
    const query = this.repo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.movie', 'movie')
      .innerJoinAndSelect('showtime.cinema', 'cinema')
      .where('movie.status = :movieStatus', { movieStatus: MovieStatus.ACTIVE })
      .andWhere('showtime.status <> :cancelled', { cancelled: ShowtimeStatus.CANCELLED })
      .andWhere('cinema.isActive = true')
      .andWhere('showtime.startsAt BETWEEN :from AND :to', { from, to });

    if (cityId !== undefined) {
      query.andWhere('cinema.city = :cityId', { cityId });
    }
    if (cinemaId !== undefined) query.andWhere('cinema.id = :cinemaId', { cinemaId });
    if (genre !== undefined) query.andWhere('movie.genre = :genre', { genre });
    if (classification !== undefined) {
      query.andWhere('movie.classification = :classification', { classification });
    }
    if (language !== undefined) query.andWhere('showtime.language = :language', { language });
    if (format !== undefined) query.andWhere('showtime.format = :format', { format });
    if (roomType !== undefined) query.andWhere('showtime.roomType = :roomType', { roomType });
    if (available === true) {
      query.andWhere('showtime.status <> :soldOut', { soldOut: ShowtimeStatus.SOLD_OUT });
    }

    return query.orderBy('movie.name', 'ASC').addOrderBy('showtime.startsAt', 'ASC').getMany();
  }

  /** Funciones futuras (RN-014) de una película: incluye SOLD_OUT, excluye CANCELLED y cines inactivos. */
  findFutureByMovie(movieId: number, cityId?: number): Promise<Showtime[]> {
    const query = this.repo
      .createQueryBuilder('showtime')
      .innerJoinAndSelect('showtime.movie', 'movie')
      .innerJoinAndSelect('showtime.cinema', 'cinema')
      .where('movie.id = :movieId', { movieId })
      .andWhere('showtime.startsAt > :now', { now: new Date() })
      .andWhere('showtime.status <> :cancelled', { cancelled: ShowtimeStatus.CANCELLED })
      .andWhere('cinema.isActive = true');

    if (cityId !== undefined) query.andWhere('cinema.city = :cityId', { cityId });

    return query.orderBy('showtime.startsAt', 'ASC').getMany();
  }
}
