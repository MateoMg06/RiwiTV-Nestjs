import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { ProfileService } from './profile.service.js';
import { MembershipLevel, MembershipStatus } from '../../common/enums/domain.enums.js';

const buildUser = (over: Record<string, unknown> = {}) => ({
  id: 7,
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  pendingEmail: null,
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
  const userService = { assertEmailIsFree: vi.fn().mockResolvedValue(undefined) };
  const mail = { sendActivation: vi.fn().mockResolvedValue(undefined) };
  return {
    userDao,
    membershipService,
    userService,
    mail,
    service: new ProfileService(
      userDao as never,
      userService as never,
      membershipService as never,
      mail as never,
    ),
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
      pendingEmail: null,
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

describe('ProfileService.update: cambio de correo (RN-034)', () => {
  const sha = (t: string) => createHash('sha256').update(t).digest('hex');
  const dto = { email: 'nuevo@example.com', confirmEmail: 'nuevo@example.com' };

  it('guarda pendingEmail y el SHA-256 del token, y envía el correo al nuevo', async () => {
    const { service, userDao, userService, mail } = setup();

    const result = await service.update(7, dto);

    expect(userService.assertEmailIsFree).toHaveBeenCalledWith('nuevo@example.com');
    const [id, data] = userDao.update.mock.calls[0];
    expect(id).toBe(7);
    expect(data.pendingEmail).toBe('nuevo@example.com');
    expect(data.activationToken).toMatch(/^[0-9a-f]{64}$/);
    expect(data.activationTokenExpires.getTime()).toBeGreaterThan(Date.now() + 23 * 3_600_000);
    // No toca el correo actual, el estado de la cuenta ni las sesiones.
    expect(data).not.toHaveProperty('email');
    expect(data).not.toHaveProperty('accountStatus');

    // Al correo va el token en claro; en BD, solo su hash.
    const [to, name, token] = mail.sendActivation.mock.calls[0];
    expect(to).toBe('nuevo@example.com');
    expect(name).toBe('Ana');
    expect(sha(token)).toBe(data.activationToken);
    expect(token).not.toBe(data.activationToken);

    expect(result).toMatchObject({
      email: 'ana@example.com',
      pendingEmail: 'nuevo@example.com',
      emailVerificationRequired: true,
    });
  });

  it('409 si el correo ya lo usa otro usuario, sin escribir ni enviar', async () => {
    const { service, userDao, userService, mail } = setup();
    userService.assertEmailIsFree.mockRejectedValue(new ConflictException('en uso'));

    await expect(service.update(7, dto)).rejects.toBeInstanceOf(ConflictException);
    expect(userDao.update).not.toHaveBeenCalled();
    expect(mail.sendActivation).not.toHaveBeenCalled();
  });

  it('400 si los correos no coinciden o falta la confirmación', async () => {
    const { service, userDao } = setup();

    await expect(
      service.update(7, { email: 'nuevo@example.com', confirmEmail: 'otro@example.com' }),
    ).rejects.toThrow('Correos no coinciden');
    await expect(service.update(7, { email: 'nuevo@example.com' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userDao.update).not.toHaveBeenCalled();
  });

  it('un correo igual al actual (sin mayúsculas) se ignora', async () => {
    const { service, userDao, userService, mail } = setup();

    const result = await service.update(7, {
      email: 'ANA@example.com',
      confirmEmail: 'ANA@example.com',
    });

    expect(userService.assertEmailIsFree).not.toHaveBeenCalled();
    expect(userDao.update).not.toHaveBeenCalled();
    expect(mail.sendActivation).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('emailVerificationRequired');
  });

  it('el correo actual con un cambio pendiente cancela ese cambio', async () => {
    const pending = buildUser({
      pendingEmail: 'nuevo@example.com',
      activationToken: 'a'.repeat(64),
      activationTokenExpires: new Date(Date.now() + 3_600_000),
    });
    const { service, userDao, userService, mail } = setup(pending);

    const result = await service.update(7, {
      email: 'ANA@example.com',
      confirmEmail: 'ANA@example.com',
    });

    expect(userService.assertEmailIsFree).not.toHaveBeenCalled();
    expect(userDao.update).toHaveBeenCalledWith(7, {
      pendingEmail: null,
      activationToken: null,
      activationTokenExpires: null,
    });
    expect(mail.sendActivation).not.toHaveBeenCalled();
    expect(result.pendingEmail).toBeNull();
    expect(result).not.toHaveProperty('emailVerificationRequired');
  });

  it('si el envío del correo falla, la actualización igual termina bien', async () => {
    const { service, mail } = setup();
    mail.sendActivation.mockRejectedValue(new Error('smtp caido'));

    await expect(service.update(7, dto)).resolves.toMatchObject({
      emailVerificationRequired: true,
    });
    await Promise.resolve();
  });

  it('combina el correo con otros campos en un solo UPDATE', async () => {
    const { service, userDao } = setup();

    await service.update(7, { ...dto, name: 'Luisa' });

    expect(userDao.update).toHaveBeenCalledTimes(1);
    expect(userDao.update.mock.calls[0][1]).toMatchObject({
      name: 'Luisa',
      pendingEmail: 'nuevo@example.com',
    });
  });
});
