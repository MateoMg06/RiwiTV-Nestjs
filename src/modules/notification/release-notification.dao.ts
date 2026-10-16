import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { ReleaseNotification } from './release-notification.entity.js';

/** Código de Postgres para violación de restricción única. */
const UNIQUE_VIOLATION = '23505';

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
}
