import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

const base = {
  name: 'Ana',
  lastName: 'Pérez',
  email: 'ana@example.com',
  confirmEmail: 'ana@example.com',
  password: 'Abcdef1!xy',
  confirmPassword: 'Abcdef1!xy',
  phone: '3001234567',
  documentType: 'CC',
  documentNumber: '1234567890',
  birthDate: '1995-05-20',
  acceptsDataProcessing: true,
  acceptsTerms: true,
  acceptsNotifications: false,
};

/** Reproduce el ValidationPipe con `transform`: JSON plano -> instancia -> validación. */
const check = (payload: object) =>
  validate(plainToInstance(CreateUserDto, payload, { enableImplicitConversion: true }) as object);

describe('CreateUserDto (HU-006)', () => {
  it('acepta una contraseña de 10 caracteres', async () => {
    expect(await check(base)).toHaveLength(0);
  });

  it('rechaza una contraseña de 9 caracteres (RN-022)', async () => {
    const errors = await check({ ...base, password: 'Abcdef1!x' });
    expect(errors.map((e) => e.property)).toContain('password');
  });

  it('gender y favoriteCinemaId son opcionales', async () => {
    expect(await check(base)).toHaveLength(0);
  });

  it('acepta gender y favoriteCinemaId válidos y rechaza favoriteCinemaId 0', async () => {
    expect(await check({ ...base, gender: 'Femenino', favoriteCinemaId: 2 })).toHaveLength(0);
    const errors = await check({ ...base, favoriteCinemaId: 0 });
    expect(errors.map((e) => e.property)).toContain('favoriteCinemaId');
  });

  it('valida birthDate como cadena JSON "1995-05-20"', async () => {
    const dto = plainToInstance(CreateUserDto, base, { enableImplicitConversion: true });
    expect(dto.birthDate).toBeInstanceOf(Date);
    expect(await validate(dto as object)).toHaveLength(0);
  });
});
