import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ForgotPasswordDto } from './forgot-password.dto.js';
import { ResetPasswordDto } from './reset-password.dto.js';

const base = { token: 'a'.repeat(64), password: 'Abcdef1!xy', confirmPassword: 'Abcdef1!xy' };

const check = <T extends object>(cls: new () => T, payload: object) =>
  validate(plainToInstance(cls, payload) as object);

describe('ResetPasswordDto (HU-007)', () => {
  it('acepta un token de 64 hex y una contraseña de 10 caracteres', async () => {
    expect(await check(ResetPasswordDto, base)).toHaveLength(0);
  });

  it('rechaza un token que no es hexadecimal de 64 caracteres', async () => {
    expect(await check(ResetPasswordDto, { ...base, token: 'z'.repeat(64) })).toHaveLength(1);
    expect(await check(ResetPasswordDto, { ...base, token: 'a'.repeat(63) })).toHaveLength(1);
  });

  it('rechaza una contraseña de menos de 10 caracteres', async () => {
    const errors = await check(ResetPasswordDto, { ...base, password: 'Abcde1!xy' });
    expect(errors.map((e) => e.property)).toContain('password');
  });

  it('exige confirmPassword', async () => {
    const errors = await check(ResetPasswordDto, { ...base, confirmPassword: '' });
    expect(errors.map((e) => e.property)).toContain('confirmPassword');
  });
});

describe('ForgotPasswordDto (HU-007)', () => {
  it('exige un correo válido', async () => {
    expect(await check(ForgotPasswordDto, { email: 'ana@example.com' })).toHaveLength(0);
    expect(await check(ForgotPasswordDto, { email: 'no-es-correo' })).toHaveLength(1);
  });
});
