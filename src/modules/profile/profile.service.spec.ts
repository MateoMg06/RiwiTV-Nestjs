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
  const userDao = { findById: vi.fn().mockResolvedValue(user) };
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
