import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { MovieStatus, NotificationStatus } from '../../common/enums/domain.enums.js';
import { Movie } from '../movie/movie.entity.js';
import { User } from '../user/user.entity.js';
import { ReleaseNotification } from './release-notification.entity.js';

/** Código de Postgres para violación de restricción única. */
const UNIQUE_VIOLATION = '23505';

/** Solicitud pendiente de aviso, con los datos planos que necesita el correo (RN-020). */
export interface PendingRelease {
  id: number;
  email: string;
  name: string;
  movieTitle: string;
}

@Injectable()
export class ReleaseNotificationDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<ReleaseNotification> {
    return this.dataSource.getRepository(ReleaseNotification);
  }

  /**
   * Sin consulta previa: el índice único decide el duplicado (RN-019), así que dos peticiones
   * simultáneas no pueden crear dos filas.
   */
  async create(data: {
    userId: number;
    movieId: number;
    cityId: number | null;
  }): Promise<ReleaseNotification> {
    try {
      return await this.repo.save(this.repo.create(data));
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string } | undefined)?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException('Ya existe una solicitud de notificación para esta película');
      }
      throw error;
    }
  }

  /**
   * Solicitudes `PENDING` cuya película ya está `ACTIVE`. Cruza `Movie` y `User` en este DAO
   * (excepción a "solo su entidad", como `ShowtimeDao`) para traer columnas planas en una sola
   * consulta y evitar un N+1 por solicitud.
   */
  async findPendingForActiveMovies(limit = 200): Promise<PendingRelease[]> {
    const rows = await this.repo
      .createQueryBuilder('rn')
      .innerJoin(Movie, 'm', 'm.id = rn.movieId')
      .innerJoin(User, 'u', 'u.id = rn.userId')
      .select(['rn.id AS id', 'u.email AS email', 'u.name AS name', 'm.name AS "movieTitle"'])
      .where('rn.status = :pending', { pending: NotificationStatus.PENDING })
      .andWhere('m.status = :active', { active: MovieStatus.ACTIVE })
      .orderBy('rn.id', 'ASC')
      .limit(limit)
      .getRawMany<PendingRelease>();

    return rows.map(({ id, email, name, movieTitle }) => ({ id, email, name, movieTitle }));
  }

  /** `PENDING` → `SENT`; devuelve false si otra ejecución ya la había marcado. */
  async markSent(id: number): Promise<boolean> {
    const result = await this.repo.update(
      { id, status: NotificationStatus.PENDING },
      { status: NotificationStatus.SENT },
    );
    return result.affected === 1;
  }
}
