import { Injectable } from '@nestjs/common';
import { DataSource, MoreThan, Repository } from 'typeorm';
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

  /** El detalle solo existe para películas en cartelera; los próximos estrenos usan `findUpcomingById`. */
  findActiveById(id: number): Promise<Movie | null> {
    return this.repo.findOne({ where: { id, status: MovieStatus.ACTIVE } });
  }

  /** Próximos estrenos: `UPCOMING` con estreno futuro, el más cercano primero. */
  findUpcoming(): Promise<Movie[]> {
    return this.repo.find({
      where: { status: MovieStatus.UPCOMING, releaseDate: MoreThan(new Date()) },
      order: { releaseDate: 'ASC', name: 'ASC' },
    });
  }

  /** Mismo filtro que `findUpcoming`: una película ya estrenada o activa no es un próximo estreno. */
  findUpcomingById(id: number): Promise<Movie | null> {
    return this.repo.findOne({
      where: { id, status: MovieStatus.UPCOMING, releaseDate: MoreThan(new Date()) },
    });
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
