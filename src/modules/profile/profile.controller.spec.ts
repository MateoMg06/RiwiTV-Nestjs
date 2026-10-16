import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import type { ProfileService } from './profile.service.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('ProfileController (HU-008)', () => {
  const build = () => {
    const service = {
      get: vi.fn().mockResolvedValue({ id: 7 }),
      update: vi.fn().mockResolvedValue({ id: 7, name: 'Ana' }),
    };
    return { service, controller: new ProfileController(service as unknown as ProfileService) };
  };

  it('expone GET /profile y no es público', () => {
    const handler = ProfileController.prototype.get;
    expect(Reflect.getMetadata(PATH_METADATA, ProfileController)).toBe('profile');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, ProfileController)).toBeUndefined();
  });

  it('usa la identidad del token', async () => {
    const { controller, service } = build();
    await expect(controller.get({ user: { id: 7 } } as AuthenticatedRequest)).resolves.toEqual({
      id: 7,
    });
    expect(service.get).toHaveBeenCalledWith(7);
  });

  it('401 sin identidad', () => {
    const { controller, service } = build();
    expect(() => controller.get({} as AuthenticatedRequest)).toThrow(UnauthorizedException);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('expone PUT /profile, no público, y usa la identidad del token', async () => {
    const handler = ProfileController.prototype.update;
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.PUT);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();

    const { controller, service } = build();
    await expect(
      controller.update({ name: 'Ana' }, { user: { id: 7 } } as AuthenticatedRequest),
    ).resolves.toEqual({ id: 7, name: 'Ana' });
    expect(service.update).toHaveBeenCalledWith(7, { name: 'Ana' });
  });

  it('PUT da 401 sin identidad', () => {
    const { controller, service } = build();
    expect(() => controller.update({}, {} as AuthenticatedRequest)).toThrow(UnauthorizedException);
    expect(service.update).not.toHaveBeenCalled();
  });
});
