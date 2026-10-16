import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MovieStatus, ShowtimeStatus } from '../../common/enums/domain.enums.js';
import { Showtime } from './showtime.entity.js';

export interface CatalogRange {
  from: Date;
  to: Date;
  cityId?: number;
}

@Injectable()
export class ShowtimeDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<Showtime> {
    return this.dataSource.getRepository(Showtime);
  }

  /** Funciones no canceladas de películas activas en cines activos, en una sola consulta. */
  findCatalogRange({ from, to, cityId }: CatalogRange): Promise<Showtime[]> {
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

    return query.orderBy('movie.name', 'ASC').addOrderBy('showtime.startsAt', 'ASC').getMany();
  }
}
