import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetLocationDto } from './set-location.dto.js';

const check = (body: unknown) =>
  validate(plainToInstance(SetLocationDto, body));

describe('SetLocationDto (HU-002)', () => {
  it.each([
    [{}],
    [{ cityId: 0 }],
    [{ cityId: -1 }],
    [{ cityId: 1.5 }],
    [{ cityId: 'abc' }],
  ])('rechaza %j', async (body) => {
    const errors = await check(body);
    expect(errors).toHaveLength(1);
    expect(Object.values(errors[0].constraints ?? {})).toContain(
      'cityId debe ser un entero positivo',
    );
  });

  it("acepta '3' y lo convierte a número", async () => {
    const dto = plainToInstance(SetLocationDto, { cityId: '3' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.cityId).toBe(3);
  });

  it('funciona con el ValidationPipe global y rechaza propiedades extra', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const meta = { type: 'body' as const, metatype: SetLocationDto };

    await expect(pipe.transform({ cityId: '3' }, meta)).resolves.toMatchObject({
      cityId: 3,
    });
    await expect(
      pipe.transform({ cityId: 3, userId: 9 }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform({ cityId: 'abc' }, meta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
