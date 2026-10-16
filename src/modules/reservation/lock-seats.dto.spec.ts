import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LockSeatsDto } from './lock-seats.dto.js';
import { ReleaseSeatsDto } from './release-seats.dto.js';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const metaFor = (metatype: new () => object) => ({ type: 'body' as const, metatype });
const ids = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe.each([
  ['LockSeatsDto', LockSeatsDto, [{ functionId: 5 }]],
  ['ReleaseSeatsDto', ReleaseSeatsDto, []],
] as const)('%s (HU-010)', (_name, Dto, extraInvalid) => {
  const check = (body: unknown) => validate(plainToInstance(Dto, body));

  it.each([
    [{ functionId: 5, seatIds: [] }],
    [{ functionId: 5, seatIds: [1, 1] }],
    [{ functionId: 5, seatIds: [1.5] }],
    [{ functionId: 5, seatIds: ['abc'] }],
    [{ functionId: 5, seatIds: [0] }],
    [{ functionId: 5, seatIds: [-2] }],
    [{ functionId: 5, seatIds: 3 }],
    [{ functionId: 5, seatIds: ids(51) }],
    [{ seatIds: [1] }],
    [{ functionId: 0, seatIds: [1] }],
    [{ functionId: 1.5, seatIds: [1] }],
    [{ functionId: 'abc', seatIds: [1] }],
    ...extraInvalid.map((b) => [b]),
  ])('rechaza %j', async (body) => {
    expect((await check(body)).length).toBeGreaterThan(0);
  });

  it('acepta enteros válidos y convierte strings numéricos', async () => {
    const dto = plainToInstance(Dto, { functionId: '5', seatIds: ['1', 2] });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ functionId: 5, seatIds: [1, 2] });
    expect(await check({ functionId: 5, seatIds: ids(50) })).toHaveLength(0);
  });

  it('con el ValidationPipe global rechaza campos extra (p. ej. userId)', async () => {
    await expect(
      pipe.transform({ functionId: 5, seatIds: [1], userId: 2 }, metaFor(Dto)),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      pipe.transform({ functionId: '5', seatIds: [1] }, metaFor(Dto)),
    ).resolves.toMatchObject({
      functionId: 5,
      seatIds: [1],
    });
  });
});

describe('ReleaseSeatsDto sin seatIds', () => {
  it('lo acepta (libera todas las propias)', async () => {
    expect(await validate(plainToInstance(ReleaseSeatsDto, { functionId: 5 }))).toHaveLength(0);
  });
});
