import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ParseIntPipe, RequestMethod, UnauthorizedException } from '@nestjs/common';
import { ReservationController } from './reservation.controller.js';
import type { ReservationService } from './reservation.service.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

const build = () => {
  const service = {
    lockSeats: vi.fn().mockResolvedValue({ ok: 'lock' }),
    releaseSeats: vi.fn().mockResolvedValue({ ok: 'release' }),
    getSummary: vi.fn().mockResolvedValue({ ok: 'summary' }),
  };
  return {
    service,
    controller: new ReservationController(service as unknown as ReservationService),
  };
};
const request = { user: { id: 7 } } as AuthenticatedRequest;
const anonymous = {} as AuthenticatedRequest;
const proto = ReservationController.prototype;

describe('ReservationController (HU-010)', () => {
  it('rutas, métodos y códigos', () => {
    expect(Reflect.getMetadata(PATH_METADATA, ReservationController)).toBe('reservations');
    expect(Reflect.getMetadata(PATH_METADATA, proto.lockSeats)).toBe('lock-seats');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.lockSeats)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, proto.lockSeats)).toBe(200);
    expect(Reflect.getMetadata(PATH_METADATA, proto.releaseSeats)).toBe('release-seats');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.releaseSeats)).toBe(RequestMethod.DELETE);
    expect(Reflect.getMetadata(PATH_METADATA, proto.getSummary)).toBe('summary');
    expect(Reflect.getMetadata(METHOD_METADATA, proto.getSummary)).toBe(RequestMethod.GET);
  });

  it('ninguna ruta de reservas es pública', () => {
    for (const handler of [proto.lockSeats, proto.releaseSeats, proto.getSummary]) {
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    }
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, ReservationController)).toBeUndefined();
  });

  it('functionId del query pasa por ParseIntPipe', () => {
    const args = Reflect.getMetadata('__routeArguments__', ReservationController, 'getSummary');
    const pipes = Object.values(args as Record<string, { pipes: unknown[] }>).flatMap(
      (a) => a.pipes,
    );
    expect(pipes).toContain(ParseIntPipe);
  });

  it('usa el userId del token', async () => {
    const { controller, service } = build();
    const lock = { functionId: 5, seatIds: [1] };
    const release = { functionId: 5 };

    await controller.lockSeats(lock, request);
    await controller.releaseSeats(release, request);
    await controller.getSummary(5, request);

    expect(service.lockSeats).toHaveBeenCalledWith(7, lock);
    expect(service.releaseSeats).toHaveBeenCalledWith(7, release);
    expect(service.getSummary).toHaveBeenCalledWith(7, 5);
  });

  it('401 si no hay identidad en la petición', () => {
    const { controller, service } = build();
    const error = new UnauthorizedException('Usuario no autenticado');

    expect(() => controller.lockSeats({ functionId: 5, seatIds: [1] }, anonymous)).toThrow(error);
    expect(() => controller.releaseSeats({ functionId: 5 }, anonymous)).toThrow(error);
    expect(() => controller.getSummary(5, anonymous)).toThrow(error);
    expect(service.lockSeats).not.toHaveBeenCalled();
    expect(service.releaseSeats).not.toHaveBeenCalled();
    expect(service.getSummary).not.toHaveBeenCalled();
  });
});
