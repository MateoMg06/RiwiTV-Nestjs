const REQUIRED_VARIABLES = [
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const NUMERIC_VARIABLES = [
  'APP_PORT',
  'POSTGRES_PORT',
  'SALT_ROUNDS',
  'MAX_FAILED_ATTEMPTS',
] as const;

export function validateEnvironment(): void {
  const missing = REQUIRED_VARIABLES.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  }

  for (const key of NUMERIC_VARIABLES) {
    const value = process.env[key];
    if (value && (!Number.isInteger(Number(value)) || Number(value) <= 0)) {
      throw new Error(`La variable ${key} debe ser un número entero positivo`);
    }
  }
}
