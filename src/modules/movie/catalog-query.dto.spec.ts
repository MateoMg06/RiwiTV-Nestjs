import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CatalogQueryDto } from './catalog-query.dto.js';

// Mismas opciones que el ValidationPipe global (main.ts).
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const meta = { type: 'query' as const, metatype: CatalogQueryDto };
const run = (query: object) => pipe.transform(query, meta) as Promise<CatalogQueryDto>;
const check = (query: object) => validate(plainToInstance(CatalogQueryDto, query));

describe('CatalogQueryDto filtros (HU-003)', () => {
  it('acepta una query vacía', async () => {
    expect(await check({})).toHaveLength(0);
  });

  it.each([['0'], ['abc']])('rechaza cinemaId=%s', async (cinemaId) => {
    await expect(run({ cinemaId })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acepta cinemaId numérico', async () => {
    await expect(run({ cinemaId: '2' })).resolves.toMatchObject({ cinemaId: 2 });
  });

  it('rechaza classification fuera del enum y acepta 12+', async () => {
    await expect(run({ classification: '20+' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(run({ classification: '12+' })).resolves.toMatchObject({ classification: '12+' });
  });

  it('rechaza format=4D y acepta IMAX', async () => {
    await expect(run({ format: '4D' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(run({ format: 'IMAX' })).resolves.toMatchObject({ format: 'IMAX' });
  });

  it.each([['2026-1-5'], ['hoy']])('rechaza date=%s', async (date) => {
    await expect(run({ date })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acepta date=2026-10-16', async () => {
    await expect(run({ date: '2026-10-16' })).resolves.toMatchObject({ date: '2026-10-16' });
  });

  it("available: 'true' -> true y 'false' -> false (con conversión implícita)", async () => {
    await expect(run({ available: 'true' })).resolves.toMatchObject({ available: true });
    await expect(run({ available: 'false' })).resolves.toMatchObject({ available: false });
  });

  it("rechaza available='abc'", async () => {
    await expect(run({ available: 'abc' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([['genre'], ['language'], ['roomType']])('rechaza %s vacío', async (key) => {
    expect(await check({ [key]: '' })).toHaveLength(1);
  });

  it('rechaza propiedades desconocidas', async () => {
    await expect(run({ foo: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
