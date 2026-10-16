import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationStatus } from '../../common/enums/domain.enums.js';
import { CityDao } from '../country/city/city.dao.js';
import { MovieDao } from '../movie/movie.dao.js';
import { ReleaseNotificationDao } from './release-notification.dao.js';
import type { UpcomingNotificationDto } from './upcoming-notification.dto.js';

export interface ReleaseNotificationResult {
  id: number;
  userId: number;
  movieId: number;
  cityId: number | null;
  status: NotificationStatus;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly movieDao: MovieDao,
    private readonly cityDao: CityDao,
    private readonly dao: ReleaseNotificationDao,
  ) {}

  /**
   * Registra la solicitud de aviso de un próximo estreno. El correo (RN-020) llega con HU-006:
   * por ahora la solicitud queda `PENDING`.
   */
  async requestUpcoming(
    userId: number,
    { movieId, cityId }: UpcomingNotificationDto,
  ): Promise<ReleaseNotificationResult> {
    const movie = await this.movieDao.findUpcomingById(movieId);
    if (!movie) throw new NotFoundException('Próximo estreno no encontrado');

    if (cityId !== undefined) {
      const city = await this.cityDao.findById(cityId);
      if (!city) throw new NotFoundException('Ciudad no encontrada');
    }

    const saved = await this.dao.create({ userId, movieId, cityId: cityId ?? null });
    return {
      id: saved.id,
      userId: saved.userId,
      movieId: saved.movieId,
      cityId: saved.cityId,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }
}
