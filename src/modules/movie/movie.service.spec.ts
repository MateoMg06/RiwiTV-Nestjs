import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovieService } from './movie.service.js';
import type { ShowtimeDao } from '../showtime/showtime.dao.js';
import type { MovieDao } from './movie.dao.js';
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
    price: '14000.00',
  }) as unknown as Showtime;

describe('MovieService.getWeekly (HU-003)', () => {
  let dao: { findCatalogRange: ReturnType<typeof vi.fn> };
  let service: MovieService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 15, 14, 30, 0)); // 15-oct-2026 14:30 hora local
    dao = { findCatalogRange: vi.fn().mockResolvedValue([]) };
    service = new MovieService(dao as unknown as ShowtimeDao, {} as unknown as MovieDao);
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
      price: 14000,
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
    service = new MovieService(dao as unknown as ShowtimeDao, {} as unknown as MovieDao);
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
    service = new MovieService(dao as unknown as ShowtimeDao, {} as unknown as MovieDao);
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

const detailMovie = {
  ...movieA,
  synopsis: 'Sinopsis',
  cast: ['Actor Uno', 'Actor Dos'],
  bannerUrl: 'https://img/banner.jpg',
  trailerUrl: 'https://www.youtube.com/watch?v=abc',
};

const futureShowtime = (
  id: number,
  format: ShowFormat,
  price: string,
  extra: Partial<{ language: string; status: ShowtimeStatus }> = {},
) =>
  ({
    ...showtime(id, movieA, format),
    price,
    ...extra,
  }) as unknown as Showtime;

function setupDetail() {
  const showtimeDao = { findFutureByMovie: vi.fn().mockResolvedValue([]) };
  const movieDao = {
    findActiveById: vi.fn().mockResolvedValue(detailMovie),
    findRecommendations: vi.fn().mockResolvedValue([]),
  };
  const service = new MovieService(
    showtimeDao as unknown as ShowtimeDao,
    movieDao as unknown as MovieDao,
  );
  return { showtimeDao, movieDao, service };
}

describe('MovieService.getDetail (HU-004)', () => {
  it('404 si la película no existe o no está ACTIVE', async () => {
    const { movieDao, showtimeDao, service } = setupDetail();
    movieDao.findActiveById.mockResolvedValue(null);

    await expect(service.getDetail(99)).rejects.toThrow(
      new NotFoundException('Película no encontrada'),
    );
    expect(movieDao.findActiveById).toHaveBeenCalledWith(99);
    expect(showtimeDao.findFutureByMovie).not.toHaveBeenCalled();
  });

  it('mapea el detalle completo con números', async () => {
    const { showtimeDao, service } = setupDetail();
    showtimeDao.findFutureByMovie.mockResolvedValue([
      futureShowtime(1, ShowFormat.IMAX, '24000.00'),
    ]);

    const detail = await service.getDetail(1);

    expect(detail).toMatchObject({
      id: 1,
      name: 'Alfa',
      genre: 'Acción',
      classification: AgeRating.DOCE,
      duration: 120,
      director: 'Dir A',
      posterUrl: null,
      status: MovieStatus.ACTIVE,
      audienceRating: 4.5,
      synopsis: 'Sinopsis',
      cast: ['Actor Uno', 'Actor Dos'],
      bannerUrl: 'https://img/banner.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=abc',
      formats: [ShowFormat.IMAX],
      languages: ['Español'],
      prices: [{ format: ShowFormat.IMAX, price: 24000 }],
    });
    expect(detail.showtimes).toEqual([
      {
        id: 1,
        startsAt: new Date('2026-10-11T20:00:00Z'),
        format: ShowFormat.IMAX,
        language: 'Español',
        roomType: 'STANDARD',
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
        price: 24000,
        cinema: { id: 10, name: 'Centro' },
      },
    ]);
  });

  it('formats y languages sin repetidos', async () => {
    const { showtimeDao, service } = setupDetail();
    showtimeDao.findFutureByMovie.mockResolvedValue([
      futureShowtime(1, ShowFormat.DOS_D, '14000.00'),
      futureShowtime(2, ShowFormat.DOS_D, '14000.00', { language: 'Inglés' }),
      futureShowtime(3, ShowFormat.VIP, '32000.00'),
    ]);

    const detail = await service.getDetail(1);

    expect(detail.formats).toEqual([ShowFormat.DOS_D, ShowFormat.VIP]);
    expect(detail.languages).toEqual(['Español', 'Inglés']);
  });

  it('prices: precio mínimo por formato', async () => {
    const { showtimeDao, service } = setupDetail();
    showtimeDao.findFutureByMovie.mockResolvedValue([
      futureShowtime(1, ShowFormat.TRES_D, '18000.00'),
      futureShowtime(2, ShowFormat.TRES_D, '17000.00'),
      futureShowtime(3, ShowFormat.DOS_D, '14000.00'),
      futureShowtime(4, ShowFormat.TRES_D, '19000.00'),
    ]);

    const detail = await service.getDetail(1);

    expect(detail.prices).toEqual([
      { format: ShowFormat.TRES_D, price: 17000 },
      { format: ShowFormat.DOS_D, price: 14000 },
    ]);
  });

  it('incluye funciones SOLD_OUT con su status', async () => {
    const { showtimeDao, service } = setupDetail();
    showtimeDao.findFutureByMovie.mockResolvedValue([
      futureShowtime(1, ShowFormat.IMAX, '24000.00', {
        status: ShowtimeStatus.SOLD_OUT,
      }),
    ]);

    const detail = await service.getDetail(1);

    expect(detail.showtimes[0].status).toBe(ShowtimeStatus.SOLD_OUT);
  });

  it('pasa cityId al DAO de funciones', async () => {
    const { showtimeDao, service } = setupDetail();

    await service.getDetail(1, { cityId: 5 });

    expect(showtimeDao.findFutureByMovie).toHaveBeenCalledWith(1, 5);
  });

  it('sin cityId consulta todas las ciudades', async () => {
    const { showtimeDao, service } = setupDetail();

    await service.getDetail(1);

    expect(showtimeDao.findFutureByMovie).toHaveBeenCalledWith(1, undefined);
  });

  it('sin funciones: showtimes, formats, languages y prices vacíos', async () => {
    const { service } = setupDetail();

    const detail = await service.getDetail(1);

    expect(detail.showtimes).toEqual([]);
    expect(detail.formats).toEqual([]);
    expect(detail.languages).toEqual([]);
    expect(detail.prices).toEqual([]);
  });
});

describe('MovieService.getFunctions (HU-004)', () => {
  it('404 si la película no existe o no está ACTIVE', async () => {
    const { movieDao, showtimeDao, service } = setupDetail();
    movieDao.findActiveById.mockResolvedValue(null);

    await expect(service.getFunctions(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(showtimeDao.findFutureByMovie).not.toHaveBeenCalled();
  });

  it('devuelve solo el array de funciones mapeadas', async () => {
    const { showtimeDao, service } = setupDetail();
    showtimeDao.findFutureByMovie.mockResolvedValue([
      futureShowtime(1, ShowFormat.VIP, '32000.00'),
    ]);

    const result = await service.getFunctions(1);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 1,
      format: ShowFormat.VIP,
      price: 32000,
    });
  });

  it('pasa cityId al DAO', async () => {
    const { showtimeDao, service } = setupDetail();

    await service.getFunctions(1, { cityId: 3 });

    expect(showtimeDao.findFutureByMovie).toHaveBeenCalledWith(1, 3);
  });
});

describe('MovieService.getRecommendations (HU-004)', () => {
  it('404 si la película no existe o no está ACTIVE', async () => {
    const { movieDao, service } = setupDetail();
    movieDao.findActiveById.mockResolvedValue(null);

    await expect(service.getRecommendations(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(movieDao.findRecommendations).not.toHaveBeenCalled();
  });

  it('pide al MovieDao las recomendaciones de la película y las mapea', async () => {
    const { movieDao, service } = setupDetail();
    movieDao.findRecommendations.mockResolvedValue([movieB]);

    const result = await service.getRecommendations(1);

    expect(movieDao.findRecommendations).toHaveBeenCalledWith(detailMovie);
    expect(result).toEqual([
      {
        id: 2,
        name: 'Beta',
        genre: 'Acción',
        classification: AgeRating.DOCE,
        duration: 120,
        director: 'Dir A',
        posterUrl: null,
        releaseDate: movieA.releaseDate,
        status: MovieStatus.ACTIVE,
        audienceRating: 0,
      },
    ]);
  });
});

describe('MovieService próximos estrenos (HU-005)', () => {
  const now = new Date('2026-10-15T12:00:00Z');
  const DAY = 86_400_000;
  const upcoming = (id: number, releaseDate: Date) => ({
    ...movieA,
    id,
    status: MovieStatus.UPCOMING,
    releaseDate,
    synopsis: 'Sinopsis',
    cast: ['A', 'B'],
    bannerUrl: 'https://img/banner.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=abc',
  });
  let movieDao: {
    findUpcoming: ReturnType<typeof vi.fn>;
    findUpcomingById: ReturnType<typeof vi.fn>;
  };
  let service: MovieService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    movieDao = { findUpcoming: vi.fn(), findUpcomingById: vi.fn() };
    service = new MovieService({} as unknown as ShowtimeDao, movieDao as unknown as MovieDao);
  });

  afterEach(() => vi.useRealTimers());

  it('getUpcoming mapea campos, trailerUrl y synopsis, y conserva el orden del DAO', async () => {
    movieDao.findUpcoming.mockResolvedValue([
      upcoming(5, new Date(now.getTime() + 2 * DAY)),
      upcoming(6, new Date(now.getTime() + 9 * DAY)),
    ]);

    const result = await service.getUpcoming();

    expect(result.map((m) => m.id)).toEqual([5, 6]);
    expect(result[0]).toMatchObject({
      id: 5,
      name: 'Alfa',
      audienceRating: 4.5,
      synopsis: 'Sinopsis',
      cast: ['A', 'B'],
      bannerUrl: 'https://img/banner.jpg',
      trailerUrl: 'https://www.youtube.com/watch?v=abc',
      daysUntilRelease: 2,
    });
    expect(result[1].daysUntilRelease).toBe(9);
  });

  it('getUpcoming devuelve [] si no hay estrenos', async () => {
    movieDao.findUpcoming.mockResolvedValue([]);
    await expect(service.getUpcoming()).resolves.toEqual([]);
  });

  it.each([
    ['exactamente +2 días', 2 * DAY, 2],
    ['+2 días y 2,4 horas', 2 * DAY + 8_640_000, 3],
    ['+1 ms', 1, 1],
    ['en el pasado', -3 * DAY, 0],
    ['ahora mismo', 0, 0],
  ])('contador: %s', async (_label, offset, expected) => {
    movieDao.findUpcomingById.mockResolvedValue(upcoming(5, new Date(now.getTime() + offset)));

    const result = await service.getUpcomingDetail(5);

    expect(result.daysUntilRelease).toBe(expected);
    expect(result.daysUntilRelease).toBeGreaterThanOrEqual(0);
  });

  it('getUpcomingDetail devuelve los mismos campos que el listado', async () => {
    const movie = upcoming(5, new Date(now.getTime() + 2 * DAY));
    movieDao.findUpcoming.mockResolvedValue([movie]);
    movieDao.findUpcomingById.mockResolvedValue(movie);

    const [fromList] = await service.getUpcoming();
    await expect(service.getUpcomingDetail(5)).resolves.toEqual(fromList);
    expect(movieDao.findUpcomingById).toHaveBeenCalledWith(5);
  });

  it('getUpcomingDetail: 404 si no es un próximo estreno', async () => {
    movieDao.findUpcomingById.mockResolvedValue(null);

    await expect(service.getUpcomingDetail(99)).rejects.toThrow(
      new NotFoundException('Próximo estreno no encontrado'),
    );
  });
});
