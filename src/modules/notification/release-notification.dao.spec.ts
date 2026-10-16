import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError, type DataSource } from 'typeorm';
import { ReleaseNotificationDao } from './release-notification.dao.js';
import { Movie } from '../movie/movie.entity.js';
import { User } from '../user/user.entity.js';
import { MovieStatus, NotificationStatus } from '../../common/enums/domain.enums.js';
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

  describe('findPendingForActiveMovies', () => {
    function qbSetup(rows: object[]) {
      const qb = {
        innerJoin: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        getRawMany: vi.fn().mockResolvedValue(rows),
      };
      const repo = { createQueryBuilder: vi.fn().mockReturnValue(qb) };
      const dataSource = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as DataSource;
      return { qb, repo, dao: new ReleaseNotificationDao(dataSource) };
    }

    it('una sola consulta con join a Movie y User, PENDING + ACTIVE, orden por id y límite', async () => {
      const { qb, repo, dao } = qbSetup([
        { id: 1, email: 'a@b.co', name: 'Ana', movieTitle: 'Peli', extra: 'x' },
      ]);

      const result = await dao.findPendingForActiveMovies();

      expect(repo.createQueryBuilder).toHaveBeenCalledTimes(1);
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('rn');
      expect(qb.innerJoin).toHaveBeenCalledWith(Movie, 'm', 'm.id = rn.movieId');
      expect(qb.innerJoin).toHaveBeenCalledWith(User, 'u', 'u.id = rn.userId');
      expect(qb.where).toHaveBeenCalledWith('rn.status = :pending', {
        pending: NotificationStatus.PENDING,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('m.status = :active', {
        active: MovieStatus.ACTIVE,
      });
      expect(qb.orderBy).toHaveBeenCalledWith('rn.id', 'ASC');
      expect(qb.limit).toHaveBeenCalledWith(200);
      expect(result).toEqual([{ id: 1, email: 'a@b.co', name: 'Ana', movieTitle: 'Peli' }]);
    });

    it('respeta el límite indicado', async () => {
      const { qb, dao } = qbSetup([]);

      await expect(dao.findPendingForActiveMovies(5)).resolves.toEqual([]);

      expect(qb.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('markSent', () => {
    it('actualiza solo si sigue PENDING y devuelve true si afectó una fila', async () => {
      const update = vi.fn().mockResolvedValue({ affected: 1 });
      const dataSource = {
        getRepository: vi.fn().mockReturnValue({ update }),
      } as unknown as DataSource;

      await expect(new ReleaseNotificationDao(dataSource).markSent(4)).resolves.toBe(true);

      expect(update).toHaveBeenCalledWith(
        { id: 4, status: NotificationStatus.PENDING },
        { status: NotificationStatus.SENT },
      );
    });

    it('devuelve false si ya estaba marcada', async () => {
      const update = vi.fn().mockResolvedValue({ affected: 0 });
      const dataSource = {
        getRepository: vi.fn().mockReturnValue({ update }),
      } as unknown as DataSource;

      await expect(new ReleaseNotificationDao(dataSource).markSent(4)).resolves.toBe(false);
    });
  });
});
