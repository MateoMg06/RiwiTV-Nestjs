import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError, type DataSource } from 'typeorm';
import { ReleaseNotificationDao } from './release-notification.dao.js';
import { ReleaseNotification } from './release-notification.entity.js';

function setup(save: ReturnType<typeof vi.fn>) {
  const repo = { create: vi.fn((data: object) => ({ ...data })), save };
  const dataSource = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as DataSource;
  return { repo, dataSource, dao: new ReleaseNotificationDao(dataSource) };
}

const queryFailed = (code: string) =>
  new QueryFailedError('INSERT', [], Object.assign(new Error('db'), { code }));

describe('ReleaseNotificationDao (HU-005)', () => {
  it('crea la solicitud sobre ReleaseNotification', async () => {
    const saved = { id: 1, userId: 7, movieId: 3, cityId: null };
    const { repo, dataSource, dao } = setup(vi.fn().mockResolvedValue(saved));

    await expect(dao.create({ userId: 7, movieId: 3, cityId: null })).resolves.toBe(saved);

    expect(dataSource.getRepository).toHaveBeenCalledWith(ReleaseNotification);
    expect(repo.create).toHaveBeenCalledWith({ userId: 7, movieId: 3, cityId: null });
  });

  it('409 si Postgres devuelve 23505 (duplicado)', async () => {
    const { dao } = setup(vi.fn().mockRejectedValue(queryFailed('23505')));

    await expect(dao.create({ userId: 7, movieId: 3, cityId: null })).rejects.toThrow(
      new ConflictException('Ya existe una solicitud de notificación para esta película'),
    );
  });

  it('relanza otros errores de BD', async () => {
    const error = queryFailed('23503');
    const { dao } = setup(vi.fn().mockRejectedValue(error));

    await expect(dao.create({ userId: 7, movieId: 3, cityId: null })).rejects.toBe(error);
  });

  it('relanza errores que no son de consulta', async () => {
    const error = new Error('conexión caída');
    const { dao } = setup(vi.fn().mockRejectedValue(error));

    await expect(dao.create({ userId: 7, movieId: 3, cityId: null })).rejects.toBe(error);
  });
});
