// Primero: database.ts lee process.env al importarse.
import '../config/load-env.js';
import 'reflect-metadata';
import { DataSource, type DeepPartial, type ObjectLiteral, type Repository } from 'typeorm';
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
  refresh = false,
): Promise<T> {
  const found = await repo.findOne({ where });
  if (found) {
    if (refresh) {
      // Para que una BD ya sembrada reciba las columnas nuevas (HU-004).
      console.log(`Actualizado: ${label}`);
      return repo.save(repo.merge(found, data as DeepPartial<T>));
    }
    console.log(`Ya existe: ${label}`);
    return found;
  }
  const created = await repo.save(repo.create(data as T));
  console.log(`Creado: ${label}`);
  return created;
}

/** Precio base por formato (COP). */
function priceFor(format: ShowFormat): number {
  const prices = {
    [ShowFormat.DOS_D]: 14000,
    [ShowFormat.TRES_D]: 18000,
    [ShowFormat.IMAX]: 24000,
    [ShowFormat.VIP]: 32000,
  };
  return prices[format];
}

/** Medianoche de hoy (zona `TZ`) + `days` días, a la hora `hour`. */
function dayAt(days: number, hour: number, minutes = 0): Date {
  const date = new Date();
  date.setHours(hour, minutes, 0, 0);
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

    // Películas: 5 activas, 2 próximas y 1 inactiva (solo las activas salen en la cartelera).
    // «Sombras del Pasado» y «Corazón de Barrio» no tienen funciones.
    const movieData = [
      {
        name: 'Noche en Medellín',
        synopsis: 'Una noche cambia para siempre la vida de tres amigos en las calles de Medellín.',
        cast: ['Valentina Cruz', 'Andrés Londoño', 'Camila Henao'],
        posterUrl: 'https://picsum.photos/seed/noche-en-medellin-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/noche-en-medellin-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Drama',
        classification: AgeRating.DIECISEIS,
        duration: 118,
        director: 'Ana Restrepo',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.2',
      },
      {
        name: 'Aventura Galáctica',
        synopsis: 'Una tripulación cruza la galaxia para salvar su planeta de una amenaza antigua.',
        cast: ['Daniel Ortiz', 'Laura Vélez', 'Mateo Serna'],
        posterUrl: 'https://picsum.photos/seed/aventura-galactica-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/aventura-galactica-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Ciencia ficción',
        classification: AgeRating.DOCE,
        duration: 135,
        director: 'Luis Ocampo',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.7',
      },
      {
        name: 'Risas en Familia',
        synopsis: 'Una familia numerosa convierte unas vacaciones en una cadena de enredos.',
        cast: ['Carolina Mora', 'Julián Pineda', 'Sara Botero'],
        posterUrl: 'https://picsum.photos/seed/risas-en-familia-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/risas-en-familia-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Comedia',
        classification: AgeRating.TODOS,
        duration: 95,
        director: 'Marta Gil',
        status: MovieStatus.ACTIVE,
        audienceRating: '3.9',
      },
      {
        name: 'El Último Testigo',
        synopsis: 'Un testigo clave debe sobrevivir 48 horas antes de declarar.',
        cast: ['Felipe Ramírez', 'Isabel Zapata', 'Nicolás Cano'],
        posterUrl: 'https://picsum.photos/seed/el-ultimo-testigo-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/el-ultimo-testigo-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Thriller',
        classification: AgeRating.DIECIOCHO,
        duration: 110,
        director: 'Pablo Duque',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.0',
      },
      {
        name: 'El Regreso del Rey',
        synopsis: 'Un reino olvidado espera el regreso de su legítimo heredero.',
        cast: ['Tomás Giraldo', 'Elena Uribe', 'Simón Arango'],
        posterUrl: 'https://picsum.photos/seed/el-regreso-del-rey-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/el-regreso-del-rey-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Fantasía',
        classification: AgeRating.DOCE,
        duration: 140,
        director: 'Sofía Mejía',
        status: MovieStatus.UPCOMING,
        audienceRating: '0.0',
      },
      {
        name: 'Clásico Retirado',
        synopsis: 'Un romance de época que dejó la cartelera hace tiempo.',
        cast: ['Marina Salazar', 'Esteban Rojas'],
        posterUrl: 'https://picsum.photos/seed/clasico-retirado-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/clasico-retirado-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Romance',
        classification: AgeRating.TODOS,
        duration: 100,
        director: 'Jorge Arias',
        status: MovieStatus.INACTIVE,
        audienceRating: '3.5',
      },
      {
        name: 'Sombras del Pasado',
        synopsis: 'Una periodista investiga un caso archivado que involucra a su propia familia.',
        cast: ['Natalia Correa', 'Héctor Medina'],
        posterUrl: 'https://picsum.photos/seed/sombras-del-pasado-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/sombras-del-pasado-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Drama',
        classification: AgeRating.DIECISEIS,
        duration: 112,
        director: 'Camilo Vargas',
        status: MovieStatus.ACTIVE,
        audienceRating: '4.5',
      },
      {
        name: 'Corazón de Barrio',
        synopsis: 'La historia de un barrio que se une para salvar su cancha de fútbol.',
        cast: ['Luz Marina Duarte', 'Brayan Tobón'],
        posterUrl: 'https://picsum.photos/seed/corazon-de-barrio-poster/400/600',
        bannerUrl: 'https://picsum.photos/seed/corazon-de-barrio-banner/1280/480',
        trailerUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        genre: 'Drama',
        classification: AgeRating.DOCE,
        duration: 105,
        director: 'Paula Echeverri',
        status: MovieStatus.UPCOMING,
        audienceRating: '4.8',
      },
    ];
    const movieRows: Movie[] = [];
    for (const data of movieData) {
      const releaseDate = data.status === MovieStatus.UPCOMING ? dayAt(30, 0) : dayAt(-60, 0);
      movieRows.push(
        await findOrCreate(
          movies,
          `película ${data.name} (${data.status})`,
          { name: data.name },
          { ...data, releaseDate },
          true,
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
      // Para probar filtros (idioma, tipo de sala, "Disponible", cine y fecha).
      {
        movie: noche,
        cinema: centro,
        startsAt: dayAt(0, 23, 30),
        format: ShowFormat.DOS_D,
        audioType: AudioType.SUBTITLED,
        status: ShowtimeStatus.ACTIVE,
        language: 'Inglés',
        roomType: 'STANDARD',
      },
      {
        movie: galactica,
        cinema: centro,
        startsAt: dayAt(1, 22),
        format: ShowFormat.IMAX,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.SOLD_OUT,
        roomType: 'VIP',
      },
      {
        movie: noche,
        cinema: sur,
        startsAt: dayAt(3, 17),
        format: ShowFormat.TRES_D,
        audioType: AudioType.DUBBED,
        status: ShowtimeStatus.ACTIVE,
        roomType: 'STANDARD',
        price: 17000, // Excepción: más barata en Sur.
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
        {
          ...data,
          language: data.language ?? 'Español',
          roomType: data.roomType ?? 'STANDARD',
          price: data.price ?? priceFor(data.format),
        },
        true,
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
