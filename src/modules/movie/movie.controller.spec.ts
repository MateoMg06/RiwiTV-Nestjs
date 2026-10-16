import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, ParseIntPipe, RequestMethod } from '@nestjs/common';
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

describe('MovieController detalle (HU-004)', () => {
  const proto = MovieController.prototype;
  const routes = [
    ['getDetail', ':id'],
    ['getFunctions', ':id/functions'],
    ['getRecommendations', ':id/recommendations'],
  ] as const;

  it.each(routes)('%s es GET %s y público', (name, path) => {
    expect(Reflect.getMetadata(PATH_METADATA, proto[name])).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, proto[name])).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto[name])).toBe(true);
  });

  it.each(routes)('%s valida id con ParseIntPipe (400 si no es numérico)', async (name) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, MovieController, name) as Record<
      string,
      { data: string; pipes: unknown[] }
    >;
    const param = Object.values(args).find((arg) => arg.data === 'id');
    expect(param?.pipes).toContain(ParseIntPipe);
    await expect(new ParseIntPipe().transform('abc', { type: 'param' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it(':id se declara después de weekly y today', () => {
    const names = Object.getOwnPropertyNames(proto);
    const index = (name: string) => names.indexOf(name);
    expect(index('getDetail')).toBeGreaterThan(index('getWeekly'));
    expect(index('getDetail')).toBeGreaterThan(index('getToday'));
    expect(index('getDetail')).toBeGreaterThan(index('getFunctions'));
    expect(index('getDetail')).toBeGreaterThan(index('getRecommendations'));
  });

  it('delega en el service', async () => {
    const service = {
      getDetail: vi.fn().mockResolvedValue({ id: 1 }),
      getFunctions: vi.fn().mockResolvedValue([]),
      getRecommendations: vi.fn().mockResolvedValue([]),
    };
    const controller = new MovieController(service as unknown as MovieService);

    await controller.getDetail(1, { cityId: 2 });
    await controller.getFunctions(1, { cityId: 2 });
    await controller.getRecommendations(1);

    expect(service.getDetail).toHaveBeenCalledWith(1, { cityId: 2 });
    expect(service.getFunctions).toHaveBeenCalledWith(1, { cityId: 2 });
    expect(service.getRecommendations).toHaveBeenCalledWith(1);
  });
});

describe('MovieController próximos estrenos (HU-005)', () => {
  const proto = MovieController.prototype;
  const routes = [
    ['getUpcoming', 'upcoming'],
    ['getUpcomingDetail', 'upcoming/:id'],
  ] as const;

  it.each(routes)('%s es GET %s y público', (name, path) => {
    expect(Reflect.getMetadata(PATH_METADATA, proto[name])).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, proto[name])).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto[name])).toBe(true);
  });

  it('upcoming/:id valida id con ParseIntPipe', () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      MovieController,
      'getUpcomingDetail',
    ) as Record<string, { data: string; pipes: unknown[] }>;
    const param = Object.values(args).find((arg) => arg.data === 'id');
    expect(param?.pipes).toContain(ParseIntPipe);
  });

  it('upcoming se declara después de today y antes de :id/functions, :id/recommendations y :id', () => {
    const names = Object.getOwnPropertyNames(proto);
    const index = (name: string) => names.indexOf(name);
    for (const upcoming of ['getUpcoming', 'getUpcomingDetail']) {
      for (const other of ['getFunctions', 'getRecommendations', 'getDetail']) {
        expect(index(upcoming)).toBeLessThan(index(other));
      }
      expect(index(upcoming)).toBeGreaterThan(index('getToday'));
    }
  });

  it('delega en el service', async () => {
    const service = {
      getUpcoming: vi.fn().mockResolvedValue([{ id: 1 }]),
      getUpcomingDetail: vi.fn().mockResolvedValue({ id: 2 }),
    };
    const controller = new MovieController(service as unknown as MovieService);

    await expect(controller.getUpcoming()).resolves.toEqual([{ id: 1 }]);
    await expect(controller.getUpcomingDetail(2)).resolves.toEqual({ id: 2 });
    expect(service.getUpcomingDetail).toHaveBeenCalledWith(2);
  });
});
