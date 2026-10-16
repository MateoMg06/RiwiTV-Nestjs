import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import { NotificationController } from './notification.controller.js';
import type { NotificationService } from './notification.service.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('NotificationController (HU-005)', () => {
  const build = () => {
    const service = { requestUpcoming: vi.fn().mockResolvedValue({ id: 1 }) };
    return {
      service,
      controller: new NotificationController(service as unknown as NotificationService),
    };
  };

  it('expone POST /notifications/upcoming con 201 por defecto y no es público', () => {
    const handler = NotificationController.prototype.requestUpcoming;
    expect(Reflect.getMetadata(PATH_METADATA, NotificationController)).toBe('notifications');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('upcoming');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, NotificationController)).toBeUndefined();
  });

  it('usa la identidad del token', async () => {
    const { controller, service } = build();
    const request = { user: { id: 7 } } as AuthenticatedRequest;

    await expect(controller.requestUpcoming({ movieId: 3, cityId: 2 }, request)).resolves.toEqual({
      id: 1,
    });
    expect(service.requestUpcoming).toHaveBeenCalledWith(7, { movieId: 3, cityId: 2 });
  });

  it('401 si no hay identidad en la petición', () => {
    const { controller, service } = build();

    expect(() => controller.requestUpcoming({ movieId: 3 }, {} as AuthenticatedRequest)).toThrow(
      new UnauthorizedException('Usuario no autenticado'),
    );
    expect(service.requestUpcoming).not.toHaveBeenCalled();
  });
});
