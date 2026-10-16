import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoreThan, type DataSource } from 'typeorm';
import { MovieDao } from './movie.dao.js';
import { Movie } from './movie.entity.js';
import { MovieStatus } from '../../common/enums/domain.enums.js';

function setup(result: unknown = []) {
  const qb = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue(result),
  };
  const repo = {
    findOne: vi.fn().mockResolvedValue(result),
    find: vi.fn().mockResolvedValue(result),
    createQueryBuilder: vi.fn().mockReturnValue(qb),
  };
  const dataSource = {
    getRepository: vi.fn().mockReturnValue(repo),
  } as unknown as DataSource;
  return { qb, repo, dataSource, dao: new MovieDao(dataSource) };
}

describe('MovieDao (HU-004)', () => {
  it('findActiveById busca por id y status ACTIVE', async () => {
    const movie = { id: 3 };
    const { repo, dataSource, dao } = setup(movie);

    await expect(dao.findActiveById(3)).resolves.toBe(movie);

    expect(dataSource.getRepository).toHaveBeenCalledWith(Movie);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 3, status: MovieStatus.ACTIVE },
    });
  });

  it('findRecommendations: mismo género, otra película, ACTIVE, orden y tope de 6', async () => {
    const rows = [{ id: 5 }];
    const { qb, repo, dao } = setup(rows);

    await expect(dao.findRecommendations({ id: 3, genre: 'Drama' } as Movie)).resolves.toBe(rows);

    expect(repo.createQueryBuilder).toHaveBeenCalledWith('movie');
    expect(qb.where).toHaveBeenCalledWith('movie.genre = :genre', {
      genre: 'Drama',
    });
    expect(qb.andWhere).toHaveBeenCalledWith('movie.id <> :id', { id: 3 });
    expect(qb.andWhere).toHaveBeenCalledWith('movie.status = :status', {
      status: MovieStatus.ACTIVE,
    });
    expect(qb.orderBy).toHaveBeenCalledWith('movie.audienceRating', 'DESC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('movie.name', 'ASC');
    expect(qb.limit).toHaveBeenCalledWith(6);
  });
});

describe('MovieDao próximos estrenos (HU-005)', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const upcomingWhere = { status: MovieStatus.UPCOMING, releaseDate: MoreThan(now) };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it('findUpcoming: UPCOMING con estreno futuro, por fecha y nombre', async () => {
    const rows = [{ id: 8 }];
    const { repo, dao } = setup(rows);

    await expect(dao.findUpcoming()).resolves.toBe(rows);

    expect(repo.find).toHaveBeenCalledWith({
      where: upcomingWhere,
      order: { releaseDate: 'ASC', name: 'ASC' },
    });
  });

  it('findUpcomingById: mismo filtro que el listado', async () => {
    const movie = { id: 8 };
    const { repo, dao } = setup(movie);

    await expect(dao.findUpcomingById(8)).resolves.toBe(movie);

    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 8, ...upcomingWhere } });
  });
});
