import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, ParseIntPipe, RequestMethod } from '@nestjs/common';
import { FunctionsController } from './functions.controller.js';
import type { ShowtimeService } from './showtime.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('FunctionsController (HU-009)', () => {
  const proto = FunctionsController.prototype;
  const routes = [
    ['getById', ':id'],
    ['getPrices', ':id/prices'],
  ] as const;

  it('se monta en /functions', () => {
    expect(Reflect.getMetadata(PATH_METADATA, FunctionsController)).toBe('functions');
  });

  it.each(routes)('%s es GET %s y público', (name, path) => {
    expect(Reflect.getMetadata(PATH_METADATA, proto[name])).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, proto[name])).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, proto[name])).toBe(true);
  });

  it.each(routes)('%s valida id con ParseIntPipe (400 si no es numérico)', async (name) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, FunctionsController, name) as Record<
      string,
      { data: string; pipes: unknown[] }
    >;
    const param = Object.values(args).find((arg) => arg.data === 'id');
    expect(param?.pipes).toContain(ParseIntPipe);
    await expect(new ParseIntPipe().transform('abc', { type: 'param' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getById delega en el service con el id', async () => {
    const getById = vi.fn().mockResolvedValue({ id: 5 });
    const controller = new FunctionsController({ getById } as unknown as ShowtimeService);

    await expect(controller.getById(5)).resolves.toEqual({ id: 5 });
    expect(getById).toHaveBeenCalledWith(5);
  });

  it('getPrices delega en el service con el id', async () => {
    const getPrices = vi.fn().mockResolvedValue({ functionId: 5 });
    const controller = new FunctionsController({ getPrices } as unknown as ShowtimeService);

    await expect(controller.getPrices(5)).resolves.toEqual({ functionId: 5 });
    expect(getPrices).toHaveBeenCalledWith(5);
  });
});
