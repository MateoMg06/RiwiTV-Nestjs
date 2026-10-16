import { describe, it, expect } from 'vitest';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { MovieCityQueryDto } from './movie-city-query.dto.js';

// Mismas opciones que el ValidationPipe global (main.ts).
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});
const run = (query: object) =>
  pipe.transform(query, {
    type: 'query',
    metatype: MovieCityQueryDto,
  }) as Promise<MovieCityQueryDto>;

describe('MovieCityQueryDto (HU-004)', () => {
  it('acepta una query vacía', async () => {
    await expect(run({})).resolves.toBeInstanceOf(MovieCityQueryDto);
  });

  it("acepta cityId='3' y lo convierte a número", async () => {
    await expect(run({ cityId: '3' })).resolves.toMatchObject({ cityId: 3 });
  });

  it.each([['abc'], ['0'], ['-1'], ['1.5']])('rechaza cityId=%s', async (cityId) => {
    await expect(run({ cityId })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza filtros de la cartelera que aquí no aplican', async () => {
    await expect(run({ genre: 'Drama' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
