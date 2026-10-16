import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service.js';
import { MembershipLevel, MembershipStatus } from '../../common/enums/domain.enums.js';

const buildUser = (over: Record<string, unknown> = {}) => ({
  id: 7,
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  phone: '+573001112233',
  documentType: 'CC',
  documentNumber: '12345678',
  birthDate: '1990-01-01',
  gender: 'F',
  cityId: 3,
  favoriteCinemaId: 2,
  photoUrl: null,
  acceptsNotifications: true,
  password: 'hash',
  role: 'admin',
  accountStatus: 'active',
  activationToken: 'x',
  resetToken: 'y',
  lockedUntil: null,
  failedLoginAttempts: 2,
  ...over,
});

function setup(user: unknown = buildUser(), membership: unknown = null) {
  const userDao = {
    findById: vi.fn().mockResolvedValue(user),
    update: vi
      .fn()
      .mockImplementation((_id: number, data: object) =>
        Promise.resolve({ ...(user as object), ...data }),
      ),
  };
  const membershipService = { findByUserId: vi.fn().mockResolvedValue(membership) };
  return {
    userDao,
    membershipService,
    service: new ProfileService(userDao as never, membershipService as never),
  };
}

describe('ProfileService.get (HU-008)', () => {
  it('devuelve el perfil con membresía y listas provisionales vacías', async () => {
    const { service } = setup(buildUser(), {
      code: 'RTV-0123456789',
      level: MembershipLevel.ORO,
      status: MembershipStatus.ACTIVE,
      userId: 7,
    });

    await expect(service.get(7)).resolves.toEqual({
      id: 7,
      name: 'Ana',
      lastName: 'Pérez',
      email: 'ana@example.com',
      phone: '+573001112233',
      documentType: 'CC',
      documentNumber: '12345678',
      birthDate: '1990-01-01',
      gender: 'F',
      cityId: 3,
      favoriteCinemaId: 2,
      photoUrl: null,
      preferences: { acceptsNotifications: true },
      membership: {
        code: 'RTV-0123456789',
        level: MembershipLevel.ORO,
        status: MembershipStatus.ACTIVE,
      },
      purchaseHistory: [],
      activeReservations: [],
    });
  });

  it('nunca expone campos sensibles', async () => {
    const { service } = setup();
    const profile = await service.get(7);

    for (const key of [
      'password',
      'role',
      'accountStatus',
      'activationToken',
      'resetToken',
      'lockedUntil',
      'failedLoginAttempts',
    ]) {
      expect(profile).not.toHaveProperty(key);
    }
  });

  it('membership es null si no tiene', async () => {
    const { service } = setup();
    await expect(service.get(7)).resolves.toMatchObject({ membership: null });
  });

  it('404 si el usuario no existe', async () => {
    const { service } = setup(null);
    await expect(service.get(7)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProfileService.update (HU-008)', () => {
  it('actualiza solo los campos recibidos y devuelve el perfil', async () => {
    const { service, userDao } = setup();

    const result = await service.update(7, { name: 'Luisa', acceptsNotifications: false });

    expect(userDao.update).toHaveBeenCalledWith(7, { name: 'Luisa', acceptsNotifications: false });
    expect(result).toMatchObject({
      name: 'Luisa',
      lastName: 'Pérez',
      preferences: { acceptsNotifications: false },
    });
  });

  it('photoUrl null quita la foto; una URL la fija', async () => {
    const { service, userDao } = setup(buildUser({ photoUrl: 'https://a.example.com/x.png' }));

    await service.update(7, { photoUrl: null });
    expect(userDao.update).toHaveBeenLastCalledWith(7, { photoUrl: null });

    await service.update(7, { photoUrl: 'https://b.example.com/y.png' });
    expect(userDao.update).toHaveBeenLastCalledWith(7, { photoUrl: 'https://b.example.com/y.png' });
  });

  it('sin campos no escribe y devuelve el perfil', async () => {
    const { service, userDao } = setup();

    await expect(service.update(7, {})).resolves.toMatchObject({ id: 7 });
    expect(userDao.update).not.toHaveBeenCalled();
  });

  it('solo toca campos editables aunque el DTO traiga otros', async () => {
    const { service, userDao } = setup();

    await service.update(7, { role: 'admin', cityId: 9, name: 'Ana' } as never);

    expect(userDao.update).toHaveBeenCalledWith(7, { name: 'Ana' });
  });

  it('404 si el usuario no existe', async () => {
    const { service, userDao } = setup(null);

    await expect(service.update(7, { name: 'Ana' })).rejects.toBeInstanceOf(NotFoundException);
    expect(userDao.update).not.toHaveBeenCalled();
  });
});
