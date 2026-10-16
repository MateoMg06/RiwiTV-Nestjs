// Primero: database.ts lee process.env al importarse.
import '../config/load-env.js';
import 'reflect-metadata';
import { DataSource, type ObjectLiteral, type Repository } from 'typeorm';
import { typeOrmOptions } from '../database.js';
import { Country } from '../modules/country/country.entity.js';
import { Department } from '../modules/country/department/department.entity.js';
import { City } from '../modules/country/city/city.entity.js';
import { Cinema } from '../modules/cinema/cinema.entity.js';

/**
 * Seed para probar a mano RN-006 (HU-002). Idempotente: busca por nombre
 * (y padre) antes de insertar. Uso: `npm run seed` (requiere `npm run build`).
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

async function seed(): Promise<void> {
  const dataSource = await new DataSource(typeOrmOptions).initialize();
  try {
    const countries = dataSource.getRepository(Country);
    const departments = dataSource.getRepository(Department);
    const cities = dataSource.getRepository(City);
    const cinemas = dataSource.getRepository(Cinema);

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
    const [medellin] = created;

    // Solo Medellín tiene cine: Envigado (sin cines) y Bello (inactiva) deben dar 422.
    await findOrCreate(
      cinemas,
      'cine Multicine Riwi Centro (Medellín)',
      { name: 'Multicine Riwi Centro', city: { id: medellin.id } },
      { name: 'Multicine Riwi Centro', isActive: true, city: medellin },
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('No fue posible ejecutar el seed', error);
  process.exit(1);
});
