import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { ConflictException, RequestMethod, UnauthorizedException } from '@nestjs/common';
import { MembershipController } from './membership.controller.js';
import type { MembershipService } from './membership.service.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

describe('MembershipController (HU-006)', () => {
  const build = () => {
    const service = {
      getMine: vi.fn().mockResolvedValue({ code: 'RTV-0123456789' }),
      getBenefits: vi.fn().mockResolvedValue({ level: 'BRONCE' }),
      create: vi.fn().mockResolvedValue({
        id: 1,
        userId: 7,
        code: 'RTV-0123456789',
        status: MembershipStatus.ACTIVE,
      }),
    };
    return {
      service,
      controller: new MembershipController(service as unknown as MembershipService),
    };
  };

  it('expone POST /membership/create con 201 por defecto y no es público', () => {
    const handler = MembershipController.prototype.create;
    expect(Reflect.getMetadata(PATH_METADATA, MembershipController)).toBe('membership');
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('create');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.POST);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, handler)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, MembershipController)).toBeUndefined();
  });

  it('usa la identidad del token y devuelve solo { code, status }', async () => {
    const { controller, service } = build();

    await expect(controller.create({ user: { id: 7 } } as AuthenticatedRequest)).resolves.toEqual({
      code: 'RTV-0123456789',
      status: MembershipStatus.ACTIVE,
    });
    expect(service.create).toHaveBeenCalledWith(7);
  });

  it('propaga el 409 cuando ya existe la membresía', async () => {
    const { controller, service } = build();
    service.create.mockRejectedValue(new ConflictException('El usuario ya tiene una membresía'));

    await expect(controller.create({ user: { id: 7 } } as AuthenticatedRequest)).rejects.toThrow(
      ConflictException,
    );
  });

  it('401 si no hay identidad en la petición', async () => {
    const { controller, service } = build();

    await expect(controller.create({} as AuthenticatedRequest)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('expone GET /membership y GET /membership/benefits sin ser públicos', () => {
    for (const [name, path] of [
      ['getMine', '/'],
      ['getBenefits', 'benefits'],
    ] as const) {
      const handler = MembershipController.prototype[name];
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBeUndefined();
    }
  });

  it('getMine y getBenefits usan la identidad del token', async () => {
    const { controller, service } = build();
    const req = { user: { id: 7 } } as AuthenticatedRequest;

    await expect(controller.getMine(req)).resolves.toEqual({ code: 'RTV-0123456789' });
    await expect(controller.getBenefits(req)).resolves.toEqual({ level: 'BRONCE' });
    expect(service.getMine).toHaveBeenCalledWith(7);
    expect(service.getBenefits).toHaveBeenCalledWith(7);
  });

  it('getMine y getBenefits dan 401 sin identidad', () => {
    const { controller, service } = build();

    expect(() => controller.getMine({} as AuthenticatedRequest)).toThrow(UnauthorizedException);
    expect(() => controller.getBenefits({} as AuthenticatedRequest)).toThrow(UnauthorizedException);
    expect(service.getMine).not.toHaveBeenCalled();
  });
});
