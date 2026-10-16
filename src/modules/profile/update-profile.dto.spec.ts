import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateProfileDto } from './update-profile.dto.js';

describe('UpdateProfileDto (HU-008)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const meta = { type: 'body' as const, metatype: UpdateProfileDto };

  it('acepta los campos editables, todos opcionales', async () => {
    await expect(pipe.transform({}, meta)).resolves.toBeDefined();
    await expect(
      pipe.transform(
        {
          name: 'Ana',
          lastName: 'Pérez',
          phone: '+573001112233',
          gender: 'F',
          photoUrl: 'https://cdn.example.com/a.png',
          acceptsNotifications: false,
        },
        meta,
      ),
    ).resolves.toMatchObject({ name: 'Ana', acceptsNotifications: false });
  });

  it('acepta email + confirmEmail y rechaza correos mal formados', async () => {
    await expect(
      pipe.transform({ email: 'a@b.co', confirmEmail: 'a@b.co' }, meta),
    ).resolves.toMatchObject({ email: 'a@b.co' });
    await expect(pipe.transform({ email: 'no-es-correo' }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('admite photoUrl null para quitar la foto', async () => {
    await expect(pipe.transform({ photoUrl: null }, meta)).resolves.toMatchObject({
      photoUrl: null,
    });
  });

  it.each([
    ['http://cdn.example.com/a.png'],
    ['cdn.example.com/a.png'],
    ['no es url'],
    [`https://example.com/${'a'.repeat(500)}`],
  ])('rechaza photoUrl inválida (%s)', async (photoUrl) => {
    await expect(pipe.transform({ photoUrl }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reutiliza los validadores de CreateUserDto', async () => {
    await expect(pipe.transform({ name: 'A' }, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(pipe.transform({ phone: 'abc' }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it.each([
    ['role', 'admin'],
    ['accountStatus', 'active'],
    ['password', 'Contrasena1!x'],
    ['membership', 'ORO'],
    ['level', 'PLATINO'],
    ['cityId', 3],
    ['favoriteCinemaId', 2],
    ['birthDate', '1990-01-01'],
    ['documentType', 'CC'],
    ['documentNumber', '12345678'],
  ])('rechaza %s (forbidNonWhitelisted)', async (field, value) => {
    await expect(pipe.transform({ [field]: value }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
