import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateUserDto } from './update-user.dto.js';

describe('UpdateUserDto', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
  const meta = { type: 'body' as const, metatype: UpdateUserDto };

  it('rechaza cityId (la ciudad solo cambia por POST /users/location, RN-006)', async () => {
    await expect(pipe.transform({ cityId: 3 }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('sigue aceptando otros campos', async () => {
    await expect(pipe.transform({ name: 'Ana' }, meta)).resolves.toMatchObject({
      name: 'Ana',
    });
  });
});
