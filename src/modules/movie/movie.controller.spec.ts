import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MovieController } from './movie.controller.js';
import { CatalogQueryDto } from './catalog-query.dto.js';
import { ShowFormat } from '../../common/enums/domain.enums.js';
import type { MovieService } from './movie.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('MovieController (HU-003)', () => {
  it('GET /movies, /movies/weekly y /movies/filter son públicos', () => {
    const handler = MovieController.prototype.getWeekly;
    expect(Reflect.getMetadata(PATH_METADATA, MovieController)).toBe('movies');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toEqual(['', 'weekly', 'filter']);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('delega en el service con el DTO completo', async () => {
    const getWeekly = vi.fn().mockResolvedValue([{ id: 1 }]);
    const controller = new MovieController({ getWeekly } as unknown as MovieService);
    const query = { cityId: 3, format: ShowFormat.IMAX, available: true, date: '2026-10-18' };

    await expect(controller.getWeekly(query)).resolves.toEqual([{ id: 1 }]);
    expect(getWeekly).toHaveBeenCalledWith(query);
  });

  it('GET /movies/today es público', () => {
    const handler = MovieController.prototype.getToday;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('today');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('today delega en el service con el DTO completo', async () => {
    const getToday = vi.fn().mockResolvedValue([{ id: 1 }]);
    const controller = new MovieController({ getToday } as unknown as MovieService);
    const query = { cityId: 3, roomType: 'VIP', date: '2026-10-18' };

    await expect(controller.getToday(query)).resolves.toEqual([{ id: 1 }]);
    expect(getToday).toHaveBeenCalledWith(query);
  });
});

describe('CatalogQueryDto (HU-003)', () => {
  const check = (query: unknown) => validate(plainToInstance(CatalogQueryDto, query));

  it('acepta una query vacía', async () => {
    expect(await check({})).toHaveLength(0);
  });

  it("acepta '3' y lo convierte a número", async () => {
    const dto = plainToInstance(CatalogQueryDto, { cityId: '3' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.cityId).toBe(3);
  });

  it.each([['abc'], ['0'], ['-1'], ['1.5']])('rechaza cityId=%s', async (cityId) => {
    expect(await check({ cityId })).toHaveLength(1);
  });
});
