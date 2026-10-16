import { describe, it, expect, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import type { MovieDao } from '../movie/movie.dao.js';
import type { CityDao } from '../country/city/city.dao.js';
import type { ReleaseNotificationDao } from './release-notification.dao.js';
import { NotificationStatus } from '../../common/enums/domain.enums.js';

const createdAt = new Date('2026-10-15T12:00:00Z');

function build() {
  const movieDao = { findUpcomingById: vi.fn().mockResolvedValue({ id: 3 }) };
  const cityDao = { findById: vi.fn().mockResolvedValue({ id: 2 }) };
  const dao = {
    create: vi.fn().mockImplementation((data: object) =>
      Promise.resolve({
        id: 1,
        ...data,
        status: NotificationStatus.PENDING,
        createdAt,
        extra: 'no debe salir',
      }),
    ),
  };
  const service = new NotificationService(
    movieDao as unknown as MovieDao,
    cityDao as unknown as CityDao,
    dao as unknown as ReleaseNotificationDao,
  );
  return { service, movieDao, cityDao, dao };
}

describe('NotificationService.requestUpcoming (HU-005)', () => {
  it('registra la solicitud PENDING y devuelve la proyección', async () => {
    const { service, dao, cityDao } = build();

    const result = await service.requestUpcoming(7, { movieId: 3, cityId: 2 });

    expect(cityDao.findById).toHaveBeenCalledWith(2);
    expect(dao.create).toHaveBeenCalledWith({ userId: 7, movieId: 3, cityId: 2 });
    expect(result).toEqual({
      id: 1,
      userId: 7,
      movieId: 3,
      cityId: 2,
      status: NotificationStatus.PENDING,
      createdAt,
    });
  });

  it('sin cityId guarda null y no consulta la ciudad', async () => {
    const { service, dao, cityDao } = build();

    const result = await service.requestUpcoming(7, { movieId: 3 });

    expect(cityDao.findById).not.toHaveBeenCalled();
    expect(dao.create).toHaveBeenCalledWith({ userId: 7, movieId: 3, cityId: null });
    expect(result.cityId).toBeNull();
  });

  it('404 si la película no es un próximo estreno, sin crear', async () => {
    const { service, movieDao, cityDao, dao } = build();
    movieDao.findUpcomingById.mockResolvedValue(null);

    await expect(service.requestUpcoming(7, { movieId: 99 })).rejects.toThrow(
      new NotFoundException('Próximo estreno no encontrado'),
    );
    expect(movieDao.findUpcomingById).toHaveBeenCalledWith(99);
    expect(cityDao.findById).not.toHaveBeenCalled();
    expect(dao.create).not.toHaveBeenCalled();
  });

  it('404 si la ciudad no existe, sin crear', async () => {
    const { service, cityDao, dao } = build();
    cityDao.findById.mockResolvedValue(null);

    await expect(service.requestUpcoming(7, { movieId: 3, cityId: 99 })).rejects.toThrow(
      new NotFoundException('Ciudad no encontrada'),
    );
    expect(dao.create).not.toHaveBeenCalled();
  });

  it('propaga el 409 del DAO por solicitud duplicada', async () => {
    const { service, dao } = build();
    dao.create.mockRejectedValue(
      new ConflictException('Ya existe una solicitud de notificación para esta película'),
    );

    await expect(service.requestUpcoming(7, { movieId: 3 })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
