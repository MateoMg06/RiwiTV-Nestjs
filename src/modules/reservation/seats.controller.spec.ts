import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { ParseIntPipe, RequestMethod } from '@nestjs/common';
import { SeatsController } from './seats.controller.js';
import type { ReservationService } from './reservation.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('SeatsController (HU-010)', () => {
  it('expone GET /functions/:id/seats público', () => {
    const handler = SeatsController.prototype.getSeatMap;
    expect(Reflect.getMetadata(PATH_METADATA, SeatsController)).toBe('functions');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':id/seats');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('valida :id con ParseIntPipe', () => {
    const args = Reflect.getMetadata('__routeArguments__', SeatsController, 'getSeatMap');
    const pipes = Object.values(args as Record<string, { pipes: unknown[] }>).flatMap(
      (a) => a.pipes,
    );
    expect(pipes).toContain(ParseIntPipe);
  });

  it('delega en el service', async () => {
    const service = { getSeatMap: vi.fn().mockResolvedValue({ functionId: 5, seats: [] }) };
    const controller = new SeatsController(service as unknown as ReservationService);

    await expect(controller.getSeatMap(5)).resolves.toEqual({ functionId: 5, seats: [] });
    expect(service.getSeatMap).toHaveBeenCalledWith(5);
  });
});
