// Primero: database.ts lee process.env al importarse.
import '../config/load-env.js';
import 'reflect-metadata';
import { DataSource, type ObjectLiteral, type Repository } from 'typeorm';
import { typeOrmOptions } from '../database.js';
import { Country } from '../modules/country/country.entity.js';
import { Department } from '../modules/country/department/department.entity.js';
import { City } from '../modules/country/city/city.entity.js';
import { Cinema } from '../modules/cinema/cinema.entity.js';
import { Movie } from '../modules/movie/movie.entity.js';
import { Showtime } from '../modules/showtime/showtime.entity.js';
import {
  AgeRating,
  AudioType,
  MovieStatus,
  ShowFormat,
  ShowtimeStatus,
} from '../common/enums/domain.enums.js';

/**
 * Seed para probar a mano RN-006 (HU-002) y la cartelera (HU-003). Idempotente:
 * busca por nombre (y padre) antes de insertar. Uso: `npm run seed` (requiere `npm run build`).
 */
async function findOrCreate<T extends ObjectLiteral>(
  repo: Repository<T>,
  label: string,
  where: object,
  data: object,
): Promise<T> {
  const found = await repo.findOne({ where });
  if (found) {
    console.log(`Ya existe: ${label}`);
    return found;
  }
  const created = await repo.save(repo.create(data as T));
  console.log(`Creado: ${label}`);
  return created;
}

/** Medianoche de hoy (zona `TZ`) + `days` días, a la hora `hour`. */
function dayAt(days: number, hour: number): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

async function seed(): Promise<void> {
  const dataSource = await new DataSource(typeOrmOptions).initialize();
  try {
    const countries = dataSource.getRepository(Country);
    const departments = dataSource.getRepository(Department);
    const cities = dataSource.getRepository(City);
    const cinemas = dataSource.getRepository(Cinema);
    const movies = dataSource.getRepository(Movie);
    const showtimes = dataSource.getRepository(Showtime);

    const country = await findOrCreate(
      countries,
      'país Colombia',
      { name: 'Colombia' },
      { name: 'Colombia', isActive: true },
    );
    const department = await findOrCreate(
      departments,
      'departamento Antioquia',
      { name: 'Antioquia', country: { id: country.id } },
      { name: 'Antioquia', isActive: true, country },
    );

    const cityData = [
      { name: 'Medellín', isActive: true },
      { name: 'Envigado', isActive: true },
      { name: 'Bello', isActive: false },
      { name: 'Itagüí', isActive: true },
    ];
    const created: City[] = [];
    for (const data of cityData) {
      created.push(
        await findOrCreate(
          cities,
          `ciudad ${data.name} (activa: ${data.isActive})`,
          { name: data.name, department: { id: department.id } },
          { ...data, department, country },
        ),
      );
    }
    const [medellin, , , itagui] = created;

    // Medellín e Itagüí tienen cine: Envigado (sin cines) y Bello (inactiva) deben dar 422.
    const cinemaData = [
      { name: 'Multicine Riwi Centro', isActive: true, city: medellin },
      { name: 'Multicine Riwi Cerrado', isActive: false, city: medellin },
      { name: 'Multicine Riwi Sur', isActive: true, city: itagui },
    ];
    const cinemaRows: Cinema[] = [];
    for (const data of cinemaData) {
      cinemaRows.push(
        await findOrCreate(
          cinemas,
          `cine ${data.name} (${data.city.name}, activo: ${data.isActive})`,
          { name: data.name, city: { id: data.city.id } },
          data,
        ),
      );
    }
    const [centro, cerrado, sur] = cinemaRows;

    // Películas: 4 activas, 1 próxima y 1 inactiva (solo las activas salen en la cartelera).
    const movieData = [
      {
        name: 'Noche en Medellín',
        genre: 'Drama',
        classification: AgeRating.DIECISEIS,
        duration: 118,
        director: 'Ana Restrepo',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.2',
      },
      {
        name: 'Aventura Galáctica',
        genre: 'Ciencia ficción',
        classification: AgeRating.DOCE,
        duration: 135,
        director: 'Luis Ocampo',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.7',
      },
      {
        name: 'Risas en Familia',
        genre: 'Comedia',
        classification: AgeRating.TODOS,
        duration: 95,
        director: 'Marta Gil',
        status: MovieStatus.ACTIVE,
        audienceRating: '3.9',
      },
      {
        name: 'El Último Testigo',
        genre: 'Thriller',
        classification: AgeRating.DIECIOCHO,
        duration: 110,
        director: 'Pablo Duque',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.0',
      },
      {
        name: 'El Regreso del Rey',
        genre: 'Fantasía',
        classification: AgeRating.DOCE,
        duration: 140,
        director: 'Sofía Mejía',
        status: MovieStatus.UPCOMING,
        audienceRating: '0.0',
      },
      {
        name: 'Clásico Retirado',
        genre: 'Romance',
        classification: AgeRating.TODOS,
        duration: 100,
        director: 'Jorge Arias',
        status: MovieStatus.INACTIVE,
        audienceRating: '3.5',
      },
    ];
    const movieRows: Movie[] = [];
    for (const data of movieData) {
      const releaseDate =
        data.status === MovieStatus.UPCOMING ? dayAt(30, 0) : dayAt(-60, 0);
      movieRows.push(
        await findOrCreate(
          movies,
          `película ${data.name} (${data.status})`,
          { name: data.name },
          { ...data, posterUrl: null, releaseDate },
        ),
      );
    }
    const [noche, galactica, risas, testigo, proxima, inactiva] = movieRows;

    // Cada bloque indica si la cartelera semanal debe mostrar esas funciones.
    const showtimeData = [
      // Centro: incluidas.
      {
        movie: galactica,
        cinema: centro,
        startsAt: dayAt(0, 23),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: noche,
        cinema: centro,
        startsAt: dayAt(1, 20),
        format: ShowFormat.TRES_D,
        audioType: AudioType.SUBTITLED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: galactica,
        cinema: centro,
        startsAt: dayAt(3, 19),
        format: ShowFormat.IMAX,
        audioType: AudioType.ORIGINAL,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: risas,
        cinema: centro,
        startsAt: dayAt(6, 18),
        format: ShowFormat.VIP,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: testigo,
        cinema: centro,
        startsAt: dayAt(4, 21),
        format: ShowFormat.DOS_D,
        audioType: AudioType.ORIGINAL,
        status: ShowtimeStatus.SOLD_OUT,
      },
      // Centro: excluidas (día +7, ayer, cancelada, película próxima, película inactiva).
      {
        movie: noche,
        cinema: centro,
        startsAt: dayAt(7, 20),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: noche,
        cinema: centro,
        startsAt: dayAt(-1, 20),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: testigo,
        cinema: centro,
        startsAt: dayAt(2, 21),
        format: ShowFormat.DOS_D,
        audioType: AudioType.ORIGINAL,
        status: ShowtimeStatus.CANCELLED,
      },
      {
        movie: proxima,
        cinema: centro,
        startsAt: dayAt(2, 17),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: inactiva,
        cinema: centro,
        startsAt: dayAt(2, 15),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      // Cine inactivo: excluida.
      {
        movie: noche,
        cinema: cerrado,
        startsAt: dayAt(2, 18),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      // Itagüí: incluidas.
      {
        movie: risas,
        cinema: sur,
        startsAt: dayAt(1, 16),
        format: ShowFormat.DOS_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
      },
      {
        movie: testigo,
        cinema: sur,
        startsAt: dayAt(2, 19),
        format: ShowFormat.TRES_D,
        audioType: AudioType.SUBTITLED,
        status: ShowtimeStatus.ACTIVE,
      },
    ];
    for (const data of showtimeData) {
      await findOrCreate(
        showtimes,
        `función ${data.movie.name} en ${data.cinema.name} (${data.startsAt.toISOString()}, ${data.status})`,
        {
          movie: { id: data.movie.id },
          cinema: { id: data.cinema.id },
          startsAt: data.startsAt,
        },
        { ...data, language: 'Español' },
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('No fue posible ejecutar el seed', error);
  process.exit(1);
});
