import { describe, it, expect, vi } from 'vitest';
import {
  PATH_METADATA,
  METHOD_METADATA,
  HTTP_CODE_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import { UsersLocationController } from './users-location.controller.js';
import type { UserService } from './user.service.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { UserRole } from '../../common/enums/domain.enums.js';

describe('UsersLocationController (HU-002)', () => {
  const fullUser = {
    id: 7,
    name: 'Ana',
    lastName: 'Restrepo',
    email: 'ana@example.com',
    role: UserRole.USUARIO,
    cityId: 5,
    password: 'hash',
    activationToken: 'a',
    resetToken: 'r',
    failedLoginAttempts: 2,
    lockedUntil: new Date(),
  };

  const build = () => {
    const userService = { setLocation: vi.fn().mockResolvedValue(fullUser) };
    const controller = new UsersLocationController(
      userService as unknown as UserService,
    );
    return { controller, userService };
  };

  it('expone POST /users/location, responde 200 y no es público', () => {
    const handler = UsersLocationController.prototype.setLocation;
    expect(Reflect.getMetadata(PATH_METADATA, UsersLocationController)).toBe(
      'users',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('location');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBe(200);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, UsersLocationController),
    ).toBeUndefined();
  });

  it('usa la identidad del token y responde { message, user } sin campos sensibles', async () => {
    const { controller, userService } = build();
    const request = { user: { id: 7 } } as AuthenticatedRequest;

    const result = await controller.setLocation({ cityId: 5 }, request);

    expect(userService.setLocation).toHaveBeenCalledWith(7, 5);
    expect(result).toEqual({
      message: 'Ubicación actualizada correctamente',
      user: {
        id: 7,
        name: 'Ana',
        lastName: 'Restrepo',
        email: 'ana@example.com',
        role: UserRole.USUARIO,
        cityId: 5,
      },
    });
    for (const key of [
      'password',
      'activationToken',
      'resetToken',
      'failedLoginAttempts',
      'lockedUntil',
    ]) {
      expect(result.user).not.toHaveProperty(key);
    }
  });

  it('401 si no hay identidad en la petición', async () => {
    const { controller, userService } = build();

    await expect(
      controller.setLocation({ cityId: 5 }, {} as AuthenticatedRequest),
    ).rejects.toThrow(new UnauthorizedException('Usuario no autenticado'));
    expect(userService.setLocation).not.toHaveBeenCalled();
  });
});
