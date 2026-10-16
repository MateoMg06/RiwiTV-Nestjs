import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MovieService } from './movie.service.js';
import type { ShowtimeDao } from '../showtime/showtime.dao.js';
import type { Showtime } from '../showtime/showtime.entity.js';
import {
  AgeRating,
  AudioType,
  MovieStatus,
  ShowFormat,
  ShowtimeStatus,
} from '../../common/enums/domain.enums.js';

const movieA = {
  id: 1,
  name: 'Alfa',
  genre: 'Acción',
  classification: AgeRating.DOCE,
  duration: 120,
  director: 'Dir A',
  posterUrl: null,
  releaseDate: new Date('2026-09-01T00:00:00Z'),
  status: MovieStatus.ACTIVE,
  audienceRating: '4.5',
};
const movieB = { ...movieA, id: 2, name: 'Beta', audienceRating: '0.0' };

const showtime = (
  id: number,
  movie: typeof movieA,
  format: ShowFormat,
  cinema = { id: 10, name: 'Centro' },
) =>
  ({
    id,
    movie,
    cinema,
    startsAt: new Date(`2026-10-1${id}T20:00:00Z`),
    format,
    language: 'Español',
    roomType: 'STANDARD',
    audioType: AudioType.DUBBED,
    status: ShowtimeStatus.ACTIVE,
  }) as unknown as Showtime;

describe('MovieService.getWeekly (HU-003)', () => {
  let dao: { findCatalogRange: ReturnType<typeof vi.fn> };
  let service: MovieService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 14, 30, 0)); // 15-oct-2026 14:30 hora local
    dao = { findCatalogRange: vi.fn().mockResolvedValue([]) };
    service = new MovieService(dao as unknown as ShowtimeDao);
  });

  afterEach(() => vi.useRealTimers());

  it('consulta de ahora al fin del día +6', async () => {
    await service.getWeekly();

    const { from, to, cityId } = dao.findCatalogRange.mock.calls[0][0];
    expect(from).toEqual(new Date(2026, 9, 15, 14, 30, 0));
    expect(to).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999));
    expect(cityId).toBeUndefined();
  });

  it('pasa cityId al DAO', async () => {
    await service.getWeekly({ cityId: 5 });

    expect(dao.findCatalogRange).toHaveBeenCalledWith(expect.objectContaining({ cityId: 5 }));
  });

  it('devuelve [] si no hay funciones', async () => {
    await expect(service.getWeekly()).resolves.toEqual([]);
  });

  it('agrupa por película conservando el orden y mapea los campos', async () => {
    dao.findCatalogRange.mockResolvedValue([
      showtime(1, movieA, ShowFormat.DOS_D),
      showtime(2, movieA, ShowFormat.IMAX, { id: 11, name: 'Sur' }),
      showtime(3, movieB, ShowFormat.TRES_D),
    ]);

    const result = await service.getWeekly();

    expect(result.map((m) => m.id)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({
      id: 1,
      name: 'Alfa',
      genre: 'Acción',
      classification: AgeRating.DOCE,
      duration: 120,
      director: 'Dir A',
      posterUrl: null,
      status: MovieStatus.ACTIVE,
    });
    expect(result[0].showtimes).toHaveLength(2);
    expect(result[0].showtimes[1]).toEqual({
      id: 2,
      startsAt: new Date('2026-10-12T20:00:00Z'),
      format: ShowFormat.IMAX,
      language: 'Español',
      roomType: 'STANDARD',
      audioType: AudioType.DUBBED,
      status: ShowtimeStatus.ACTIVE,
      cinema: { id: 11, name: 'Sur' },
    });
    expect(result[1].showtimes).toHaveLength(1);
  });

  it('formats lista cada formato una sola vez', async () => {
    dao.findCatalogRange.mockResolvedValue([
      showtime(1, movieA, ShowFormat.DOS_D),
      showtime(2, movieA, ShowFormat.DOS_D),
      showtime(3, movieA, ShowFormat.VIP),
    ]);

    const [movie] = await service.getWeekly();

    expect(movie.formats).toEqual([ShowFormat.DOS_D, ShowFormat.VIP]);
  });

  it('audienceRating es número', async () => {
    dao.findCatalogRange.mockResolvedValue([showtime(1, movieA, ShowFormat.DOS_D)]);

    const [movie] = await service.getWeekly();

    expect(movie.audienceRating).toBe(4.5);
  });
});

describe('MovieService.getToday (HU-003)', () => {
  let dao: { findCatalogRange: ReturnType<typeof vi.fn> };
  let service: MovieService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 14, 30, 0));
    dao = { findCatalogRange: vi.fn().mockResolvedValue([]) };
    service = new MovieService(dao as unknown as ShowtimeDao);
  });

  afterEach(() => vi.useRealTimers());

  it('consulta de ahora al fin del día de hoy', async () => {
    await service.getToday();

    const { from, to, cityId } = dao.findCatalogRange.mock.calls[0][0];
    expect(from).toEqual(new Date(2026, 9, 15, 14, 30, 0));
    expect(to).toEqual(new Date(2026, 9, 15, 23, 59, 59, 999));
    expect(cityId).toBeUndefined();
  });

  it('pasa cityId al DAO', async () => {
    await service.getToday({ cityId: 5 });

    expect(dao.findCatalogRange).toHaveBeenCalledWith(expect.objectContaining({ cityId: 5 }));
  });

  it('devuelve [] si no hay funciones', async () => {
    await expect(service.getToday()).resolves.toEqual([]);
  });

  it('agrupa por película y lista formats una sola vez', async () => {
    dao.findCatalogRange.mockResolvedValue([
      showtime(1, movieA, ShowFormat.DOS_D),
      showtime(2, movieA, ShowFormat.DOS_D),
      showtime(3, movieB, ShowFormat.IMAX),
    ]);

    const result = await service.getToday();

    expect(result.map((m) => m.id)).toEqual([1, 2]);
    expect(result[0].formats).toEqual([ShowFormat.DOS_D]);
    expect(result[0].showtimes).toHaveLength(2);
    expect(result[0].audienceRating).toBe(4.5);
  });
});

describe('MovieService filtros (HU-003 pasos 3-5)', () => {
  let dao: { findCatalogRange: ReturnType<typeof vi.fn> };
  let service: MovieService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 14, 30, 0));
    dao = { findCatalogRange: vi.fn().mockResolvedValue([]) };
    service = new MovieService(dao as unknown as ShowtimeDao);
  });

  afterEach(() => vi.useRealTimers());

  it('pasa los filtros al DAO sin date y conserva el rango semanal', async () => {
    const filters = {
      cityId: 1,
      cinemaId: 2,
      genre: 'Drama',
      language: 'Inglés',
      roomType: 'VIP',
      classification: AgeRating.DIECISEIS,
      format: ShowFormat.IMAX,
      available: true,
    };

    await service.getWeekly({ ...filters, date: undefined });

    const arg = dao.findCatalogRange.mock.calls[0][0];
    expect(arg).toMatchObject(filters);
    expect('date' in arg).toBe(false);
    expect(arg.from).toEqual(new Date(2026, 9, 15, 14, 30, 0));
    expect(arg.to).toEqual(new Date(2026, 9, 21, 23, 59, 59, 999));
  });

  it('date futuro: de 00:00 a 23:59:59.999 de ese día', async () => {
    await service.getWeekly({ date: '2026-10-18' });

    const { from, to } = dao.findCatalogRange.mock.calls[0][0];
    expect(from).toEqual(new Date(2026, 9, 18, 0, 0, 0, 0));
    expect(to).toEqual(new Date(2026, 9, 18, 23, 59, 59, 999));
  });

  it('date fuera de la ventana de 7 días también se consulta', async () => {
    await service.getWeekly({ date: '2026-12-25' });

    expect(dao.findCatalogRange).toHaveBeenCalledTimes(1);
  });

  it('date = hoy: from es ahora', async () => {
    await service.getWeekly({ date: '2026-10-15' });

    const { from, to } = dao.findCatalogRange.mock.calls[0][0];
    expect(from).toEqual(new Date(2026, 9, 15, 14, 30, 0));
    expect(to).toEqual(new Date(2026, 9, 15, 23, 59, 59, 999));
  });

  it('date pasado: [] sin consultar el DAO', async () => {
    await expect(service.getWeekly({ date: '2026-10-14' })).resolves.toEqual([]);
    expect(dao.findCatalogRange).not.toHaveBeenCalled();
  });

  it.each(['2026-02-30', '2026-13-01'])('date %s inexistente: BadRequest', async (date) => {
    await expect(service.getWeekly({ date })).rejects.toBeInstanceOf(BadRequestException);
    expect(dao.findCatalogRange).not.toHaveBeenCalled();
  });

  it('getToday acepta date y filtros', async () => {
    await service.getToday({ date: '2026-10-17', available: true });

    const arg = dao.findCatalogRange.mock.calls[0][0];
    expect(arg.from).toEqual(new Date(2026, 9, 17, 0, 0, 0, 0));
    expect(arg.to).toEqual(new Date(2026, 9, 17, 23, 59, 59, 999));
    expect(arg.available).toBe(true);
  });

  it('getToday con date pasado devuelve []', async () => {
    await expect(service.getToday({ date: '2026-10-01' })).resolves.toEqual([]);
    expect(dao.findCatalogRange).not.toHaveBeenCalled();
  });

  it('incluye roomType en cada función y formats solo de las devueltas', async () => {
    const vip = showtime(2, movieA, ShowFormat.VIP);
    (vip as unknown as { roomType: string }).roomType = 'VIP';
    dao.findCatalogRange.mockResolvedValue([vip]);

    const [movie] = await service.getWeekly({ roomType: 'VIP' });

    expect(movie.showtimes[0].roomType).toBe('VIP');
    expect(movie.formats).toEqual([ShowFormat.VIP]);
  });
});
