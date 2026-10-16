import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MovieStatus } from '../../common/enums/domain.enums.js';
import { Movie } from './movie.entity.js';

/** Máximo de recomendaciones por película. */
const RECOMMENDATIONS_LIMIT = 6;

@Injectable()
export class MovieDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<Movie> {
    return this.dataSource.getRepository(Movie);
  }

  /** El detalle solo existe para películas en cartelera; los próximos estrenos son HU-005. */
  findActiveById(id: number): Promise<Movie | null> {
    return this.repo.findOne({ where: { id, status: MovieStatus.ACTIVE } });
  }

  /** Mismo género, activas, sin la propia película; mejor calificadas primero. */
  findRecommendations(movie: Movie): Promise<Movie[]> {
    return this.repo
      .createQueryBuilder('movie')
      .where('movie.genre = :genre', { genre: movie.genre })
      .andWhere('movie.id <> :id', { id: movie.id })
      .andWhere('movie.status = :status', { status: MovieStatus.ACTIVE })
      .orderBy('movie.audienceRating', 'DESC')
      .addOrderBy('movie.name', 'ASC')
      .limit(RECOMMENDATIONS_LIMIT)
      .getMany();
  }
}
