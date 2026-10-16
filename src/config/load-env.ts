import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

/**
 * Carga el `.env` de la raiz del proyecto en `process.env`.
 *
 * Debe importarse ANTES que cualquier otro modulo en `main.ts`: `database.ts`,
 * `cors.ts` y otros leen `process.env` al importarse, no al ejecutarse.
 *
 * El archivo es OBLIGATORIO en todos los entornos: sin el la aplicacion no
 * arranca. En Docker no va dentro de la imagen (`.dockerignore` lo excluye
 * para no hornear secretos); `docker-compose.yml` lo monta como volumen.
 *
 * Las variables ya definidas en `process.env` tienen prioridad: dotenv no las
 * sobrescribe.
 */
export function loadEnv(): void {
  const envFilePath = path.resolve(__dirname, '..', '..', '.env');

  if (!fs.existsSync(envFilePath)) {
    console.error(
      `.env no encontrado en ${envFilePath}. Copia .env.example a .env y completa los valores.`,
    );
    process.exit(1);
  }

  config({ path: envFilePath, quiet: true });
}

loadEnv();
