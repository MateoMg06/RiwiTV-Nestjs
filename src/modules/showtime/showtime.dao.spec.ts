import { describe, it, expect, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { ShowtimeDao } from './showtime.dao.js';
import { Showtime } from './showtime.entity.js';
import { MovieStatus, ShowtimeStatus } from '../../common/enums/domain.enums.js';

function setup(result: unknown[] = []) {
  const qb = {
    innerJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    addOrderBy: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue(result),
  };
  const repo = { createQueryBuilder: vi.fn().mockReturnValue(qb) };
  const dataSource = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as DataSource;
  return { qb, repo, dataSource, dao: new ShowtimeDao(dataSource) };
}

const from = new Date('2026-10-15T10:00:00Z');
const to = new Date('2026-10-22T04:59:59Z');

describe('ShowtimeDao.findCatalogRange (HU-003)', () => {
  it('trae películas y cines en una sola consulta', async () => {
    const rows = [{ id: 1 }];
    const { qb, repo, dataSource, dao } = setup(rows);

    await expect(dao.findCatalogRange({ from, to })).resolves.toBe(rows);

    expect(dataSource.getRepository).toHaveBeenCalledWith(Showtime);
    expect(repo.createQueryBuilder).toHaveBeenCalledWith('showtime');
    expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('showtime.movie', 'movie');
    expect(qb.innerJoinAndSelect).toHaveBeenCalledWith('showtime.cinema', 'cinema');
    expect(qb.getMany).toHaveBeenCalledTimes(1);
  });

  it('filtra película activa, función no cancelada (incluye SOLD_OUT), cine activo y rango', async () => {
    const { qb, dao } = setup();

    await dao.findCatalogRange({ from, to });

    expect(qb.where).toHaveBeenCalledWith('movie.status = :movieStatus', {
      movieStatus: MovieStatus.ACTIVE,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('showtime.status <> :cancelled', {
      cancelled: ShowtimeStatus.CANCELLED,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('cinema.isActive = true');
    expect(qb.andWhere).toHaveBeenCalledWith('showtime.startsAt BETWEEN :from AND :to', {
      from,
      to,
    });
  });

  it('no filtra por ciudad si no viene cityId', async () => {
    const { qb, dao } = setup();

    await dao.findCatalogRange({ from, to });

    expect(qb.andWhere).toHaveBeenCalledTimes(3);
    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('city'),
      expect.anything(),
    );
  });

  it('filtra por ciudad cuando viene cityId', async () => {
    const { qb, dao } = setup();

    await dao.findCatalogRange({ from, to, cityId: 7 });

    expect(qb.andWhere).toHaveBeenCalledWith('cinema.city = :cityId', { cityId: 7 });
  });

  it('ordena por nombre de película y luego por inicio', async () => {
    const { qb, dao } = setup();

    await dao.findCatalogRange({ from, to });

    expect(qb.orderBy).toHaveBeenCalledWith('movie.name', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('showtime.startsAt', 'ASC');
  });
});
