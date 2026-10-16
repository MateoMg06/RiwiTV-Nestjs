import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpcomingNotificationDto } from './upcoming-notification.dto.js';

const check = (body: unknown) => validate(plainToInstance(UpcomingNotificationDto, body));

describe('UpcomingNotificationDto (HU-005)', () => {
  it.each([
    [{}],
    [{ movieId: 0 }],
    [{ movieId: -1 }],
    [{ movieId: 1.5 }],
    [{ movieId: 'abc' }],
    [{ movieId: 3, cityId: 0 }],
    [{ movieId: 3, cityId: 'abc' }],
    [{ movieId: 3, cityId: 2.5 }],
  ])('rechaza %j', async (body) => {
    expect((await check(body)).length).toBeGreaterThan(0);
  });

  it('acepta solo movieId y convierte strings numéricos', async () => {
    const dto = plainToInstance(UpcomingNotificationDto, { movieId: '3', cityId: '2' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ movieId: 3, cityId: 2 });
    expect(await check({ movieId: 3 })).toHaveLength(0);
  });

  it('con el ValidationPipe global rechaza propiedades extra (p. ej. userId)', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });
    const meta = { type: 'body' as const, metatype: UpcomingNotificationDto };

    await expect(pipe.transform({ movieId: '3' }, meta)).resolves.toMatchObject({ movieId: 3 });
    await expect(pipe.transform({ movieId: 3, userId: 9 }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
