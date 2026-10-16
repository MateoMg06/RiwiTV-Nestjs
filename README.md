# RiwiTV — API de Multicine (NestJS)

Backend de la plataforma de cine **Multicine RiwiTV**. Es la migración del proyecto original (Node/Express + Sequelize) a **NestJS + TypeORM**. El alcance son las historias de usuario **HU-001 a HU-010** (`docs/historias-de-usuario.md`); el resto del backlog (HU-011 a HU-029) no se implementa.

## Estado por historia

| HU     | Tema                                                                | Estado                                                      |
| ------ | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| HU-001 | Arquitectura, entorno, Docker, health, Swagger, logger, tests, lint | Parcial: faltan migraciones automáticas (hoy `synchronize`) |
| HU-002 | Países, departamentos, ciudades, ubicación del usuario              | Completa salvo prueba manual                                |
| HU-003 | Cartelera semanal y de hoy con filtros                              | Completa salvo prueba manual                                |
| HU-004 | Detalle de película, funciones y recomendaciones                    | Completa salvo prueba manual                                |
| HU-005 | Próximos estrenos y aviso por correo                                | Completa salvo prueba manual                                |
| HU-006 | Registro, activación de cuenta y membresía                          | Completa salvo prueba manual                                |
| HU-007 | Login, refresh, logout, recuperación de contraseña y auditoría      | Completa salvo prueba manual                                |
| HU-008 | Perfil, membresía y beneficios                                      | Completa salvo prueba manual                                |
| HU-009 | Detalle y precio de funciones                                       | Completa salvo prueba manual                                |
| HU-010 | Mapa de sillas, bloqueo, liberación y resumen                       | Completa salvo prueba manual                                |

La prueba manual contra PostgreSQL real está pendiente en todas: los tests usan dobles, sin base de datos. El detalle vive en `memory.md`.

## Stack

- Node 22 (CommonJS) y NestJS 12
- TypeORM con PostgreSQL 15 (en Docker)
- `class-validator` / `class-transformer`, `helmet`, `cors`, `cookie-parser`
- `jsonwebtoken` y `bcryptjs` para la autenticación
- `@nestjs/schedule` (tareas programadas) y `nodemailer` (correo)
- `@nestjs/swagger` (documentación)
- Vitest (tests), oxlint (lint) y Prettier (formato)

## Puesta en marcha

### Requisitos

- Node 22 y npm
- Docker y Docker Compose (o un PostgreSQL propio)

### Variables de entorno

El archivo `.env` es **obligatorio**: sin él la aplicación no arranca (`src/config/load-env.ts`). Cópialo de la plantilla y completa los valores; nunca lo subas al repositorio.

```bash
cp .env.example .env
```

Variables clave, por grupo (los valores de ejemplo están en `.env.example`):

| Grupo                   | Variables                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL              | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_HOST_PORT`. Con Docker Compose el host es `db`; fuera de Docker usa `localhost` y el puerto expuesto (`POSTGRES_HOST_PORT`) |
| Aplicación              | `APP_PORT`, `NODE_ENV`, `TZ` (define «hoy» y los 7 días de la cartelera)                                                                                                                                                     |
| CORS                    | `CORS_ORIGIN`: orígenes separados por coma; vacío permite cualquiera                                                                                                                                                         |
| JWT                     | `JWT_SECRET` y `JWT_REFRESH_SECRET` (distintos entre sí), `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `SALT_ROUNDS`, `MAX_FAILED_ATTEMPTS`, `RESET_TOKEN_EXPIRES_IN`                                                  |
| Correo                  | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Con `SMTP_HOST` vacío el correo es emulado. `FRONTEND_URL` es la base de los enlaces de los correos                                                         |
| Sillas                  | `SEAT_LOCK_MINUTES` (bloqueo, 10 por defecto), `MAX_SEATS_PER_RESERVATION` (máximo si la función no define el suyo, 8 por defecto)                                                                                           |
| Observabilidad y Docker | `OBSERVER_APP_KEY`, `OBSERVE_APP_SECRET` y los límites `*_CPU_LIMIT` / `*_MEM_LIMIT`                                                                                                                                         |

### Con Docker Compose

```bash
docker compose up --build
docker compose exec app npm run seed   # datos de demostración (idempotente)
```

### En local

Necesitas un PostgreSQL accesible con los datos del `.env`. Puedes levantar solo la base con `docker compose up db` y usar `POSTGRES_HOST=localhost` y `POSTGRES_PORT=5433`.

```bash
npm install
npm run start:dev          # desarrollo con recarga
npm run build && npm run seed
```

> **Esquema de base de datos:** todavía no hay migraciones. TypeORM crea y modifica las tablas con `synchronize: true` al arrancar. No lo uses con datos que importen.

## Scripts de npm

| Script                                                    | Qué hace                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `npm run start` / `start:dev` / `start:debug`             | Arranca con Nest (normal, con recarga, con depurador)                 |
| `npm run start:prod`                                      | Ejecuta `dist/main.js`                                                |
| `npm run build`                                           | `nest build` con `tsconfig.build.json` (incluye el plugin de Swagger) |
| `npm run seed`                                            | Carga datos de demostración desde `dist/` (hay que compilar antes)    |
| `npm run test` / `test:watch` / `test:cov` / `test:debug` | Tests con Vitest                                                      |
| `npm run test:e2e`                                        | Vitest con `vitest.config.e2e.ts` (hoy no hay pruebas e2e)            |
| `npm run lint`                                            | `oxlint src/ test/`                                                   |
| `npm run format`                                          | Prettier sobre `src/` y `test/`                                       |
| `npm run deploy`                                          | `nest deploy`                                                         |

## API

- Prefijo global: `/api`.
- Swagger: **`/api/docs`** (JSON en `/api/docs-json`). Se genera a partir de los decoradores y de los DTO.
- Health check: **`GET /api/v1/health`**. Es la única ruta versionada; responde 200 aunque la base de datos esté caída (`status: degraded`).
- Errores: `{ statusCode, message, path, timestamp }`.

### Endpoints por historia

«JWT» significa `Authorization: Bearer <token>` o cookie `accessToken`. Todo lo que no es `@Public()` exige JWT.

| HU      | Método y ruta                                                   | Auth                             |
| ------- | --------------------------------------------------------------- | -------------------------------- |
| HU-001  | `GET /api/v1/health`                                            | Pública                          |
| HU-001  | `GET /api` (texto fijo)                                         | Pública                          |
| HU-002  | `GET /api/countries`                                            | Pública                          |
| HU-002  | `GET /api/departments/:countryId`                               | Pública                          |
| HU-002  | `GET /api/cities/:departmentId` (solo activas)                  | Pública                          |
| HU-002  | `POST /api/users/location`                                      | JWT                              |
| HU-003  | `GET /api/movies`, `/movies/weekly`, `/movies/filter` (7 días)  | Pública                          |
| HU-003  | `GET /api/movies/today`                                         | Pública                          |
| HU-004  | `GET /api/movies/:id`                                           | Pública                          |
| HU-004  | `GET /api/movies/:id/functions`                                 | Pública                          |
| HU-004  | `GET /api/movies/:id/recommendations`                           | Pública                          |
| HU-005  | `GET /api/movies/upcoming`, `/movies/upcoming/:id`              | Pública                          |
| HU-005  | `POST /api/notifications/upcoming`                              | JWT                              |
| HU-006  | `GET /api/auth/captcha`                                         | Pública                          |
| HU-006  | `POST /api/auth/register`                                       | Pública                          |
| HU-006  | `POST /api/auth/verify-email` (alias `POST /api/auth/activate`) | Pública                          |
| HU-006  | `POST /api/membership/create`                                   | JWT                              |
| HU-007  | `POST /api/auth/login`                                          | Pública                          |
| HU-007  | `POST /api/auth/refresh`                                        | Pública (usa el refresh token)   |
| HU-007  | `POST /api/auth/logout`                                         | Pública (usa el refresh token)   |
| HU-007  | `POST /api/auth/logout-all`, `GET /api/auth/me`                 | JWT                              |
| HU-007  | `POST /api/auth/forgot-password`, `/auth/reset-password`        | Pública                          |
| HU-008  | `GET /api/profile`, `PUT /api/profile`                          | JWT                              |
| HU-008  | `GET /api/membership`, `GET /api/membership/benefits`           | JWT                              |
| HU-009  | `GET /api/functions/:id`, `GET /api/functions/:id/prices`       | Pública                          |
| HU-010  | `GET /api/functions/:id/seats`                                  | Pública                          |
| HU-010  | `POST /api/reservations/lock-seats`                             | JWT                              |
| HU-010  | `DELETE /api/reservations/release-seats`                        | JWT                              |
| HU-010  | `GET /api/reservations/summary?functionId=`                     | JWT                              |
| Soporte | `POST /api/user`, `GET /api/user`                               | JWT, rol `ADMIN`                 |
| Soporte | `GET`, `PATCH`, `DELETE /api/user/:id`                          | JWT, el propio usuario o `ADMIN` |

El CRUD `/api/user` no lo pide ninguna historia: se mantiene solo como soporte interno.

## Autenticación

- Access token de **15 min** y refresh token de **7 días**, firmados con secretos distintos.
- **Una sesión viva por usuario** (RN-030): cada login revoca las anteriores. El refresh token se guarda como hash SHA-256 en la tabla `Sessions`; reutilizar uno revocado cierra todas las sesiones.
- Cookies httpOnly: `accessToken` (path `/`) y `refresh_token` (path `/api/auth`). Los clientes sin cookies pueden mandar el refresh token en el cuerpo.
- Bloqueo de 15 minutos tras 5 intentos fallidos (`MAX_FAILED_ATTEMPTS`). Solo entran cuentas activas.
- Recuperación de contraseña: `forgot-password` responde siempre igual y `reset-password` consume un token de un solo uso (`RESET_TOKEN_EXPIRES_IN`).
- Los accesos se auditan en `AccessAudits` (IP y dispositivo).

## Correo y tareas programadas

- **Correo emulado:** sin `SMTP_HOST` no se envía nada; el mensaje se registra en el log. Fuera de producción el log (y la respuesta del registro) incluyen el token de activación para poder probar sin SMTP.
- **Aviso de estreno:** cada hora, `ReleaseNotificationJob` envía el correo a quienes lo pidieron cuando la película pasa a En Cartelera.
- **Sillas:** cada minuto, `SeatLockExpiryJob` libera los bloqueos vencidos y los audita.

## Arquitectura

Patrón **Controller → Service → DAO → TypeORM**:

- Controller: HTTP, cookies y lectura de la petición; sin lógica de negocio.
- Service: reglas de negocio; lanza las excepciones HTTP de Nest.
- DAO: acceso a datos de su propia entidad.

```
src/
├── main.ts, app.module.ts, database.ts
├── config/        # load-env (exige .env), ConfigService, CORS, Swagger
├── common/        # decorators (@Public, @Roles, ApiAuth), enums, filtro de errores, guard global, utilidades
├── seeders/       # npm run seed
└── modules/       # auth, user, country, cinema, movie, notification, membership,
                   # profile, showtime, reservation, health
```

El **guard global** protege todo por defecto: una ruta pública necesita `@Public()` y `@Roles(...)` restringe por rol.

## Tests y calidad

```bash
npm run test    # 49 archivos, 530 tests (dobles con vi.fn(), sin base de datos)
npm run lint
npm run build
```

## Documentación del proyecto

- `agent.md`: reglas para agentes de IA y personas (arquitectura, convenciones, seguridad).
- `memory.md`: estado por historia, decisiones, pendientes, bugs y registro de cambios (las entradas antiguas están en `memory-archive.md`).
- `docs/historias-de-usuario.md`: backlog oficial HU-001 a HU-010 (transcripción del PDF `docs/Historia de usuario NodeJS Multicine Riwi (1).pdf`).
- `.claude/`: flujo `/hu` con subagentes (analista, implementador y revisor) y la skill `nestjs-best-practices`.

## Pendientes principales

- Migraciones de TypeORM al arrancar y quitar `synchronize` (HU-001).
- Prueba manual de todas las historias contra PostgreSQL.
- Políticas de sillas preferenciales (RN-042, HU-010).
- Los correos distinguen mayúsculas (`Ana@x.com` ≠ `ana@x.com`).
- Rate limiting en `forgot-password` (propuesta; ninguna historia lo exige).
