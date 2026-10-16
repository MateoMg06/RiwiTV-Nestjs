# memory.md — RiwiTV NestJS

> Memoria de trabajo del proyecto. **Se actualiza con cada cambio** (ver `agent.md`, sección 0).
> Rama: `feature/develop` (incluye `feature/authentication` hasta `35c326d` feat: docker).
> **Alcance: solo HU-001 a HU-010.** Requisitos: `docs/historias-de-usuario.md` (backlog oficial). Ver `agent.md` §1.

## Estado por historia (HU-001 a HU-010)

| HU | Estado | Hecho en Nest | Falta |
|---|---|---|---|
| HU-001 | Parcial | Capas, `.env` obligatorio, Docker Compose, Swagger, logger, Vitest, oxlint, Prettier, Helmet, CORS, `GET /api/v1/health` | Migraciones automáticas al arrancar (hoy `synchronize: true`), ambientes Dev/QA/Prod |
| HU-002 | Completa salvo prueba manual | Entidades; `GET /countries`, `/departments/:countryId`, `/cities/:departmentId` (públicas, ciudades solo activas); `POST /users/location` (JWT) con RN-006; entidad `Cinema` mínima; `npm run seed` | Prueba manual contra Postgres (seed + `POST /api/users/location`) |
| HU-003 | Completa salvo prueba manual | Entidades `Movie` y `Showtime` (con `roomType`); `GET /movies`, `/movies/weekly`, `/movies/filter` y `/movies/today` (públicos; filtros `cityId`, `cinemaId`, `genre`, `classification`, `language`, `roomType`, `format`, `date`, `available`; 7 días, RN-011/012); seed con películas y funciones | Prueba manual contra Postgres |
| HU-004 | No iniciada | — | Detalle completo (incluye precio por formato y calificación promedio), funciones futuras de la ciudad, recomendaciones |
| HU-005 | No iniciada | — | Próximos estrenos ordenados por fecha, contador regresivo, `ReleaseNotification` sin duplicados (RN-019), correo al pasar a "En Cartelera" (RN-020) |
| HU-006 | Parcial | Captcha, registro, BCrypt, validador de contraseña (≥10 + complejidad), activación por token 24 h | Crear perfil, membresía **Activa** con código único, historial vacío, billetera vacía y preferencias; correo de activación (SMTP); `POST /auth/verify-email`; `POST /membership/create`; DTO con mínimo 10 |
| HU-007 | Parcial | JWT 15 min, refresh 7 d en BD con rotación, logout, bloqueo 15 min tras intentos, solo cuentas activas, cookies | Invalidar el refresh anterior en cada login (RN-030); respuesta de login con membresía, beneficios y perfil; forgot/reset password; auditoría de accesos con IP y dispositivo |
| HU-008 | No iniciada | — | `GET`/`PUT /profile`, `GET /membership`, `/membership/benefits`: QR único, nivel, descuentos por nivel, bonos, historial de compras, reservas activas, preferencias; cambio de correo con nueva validación (RN-034) |
| HU-009 | No iniciada | — | `GET /functions/:id` y `/prices`; solo funciones activas y no iniciadas; precio según formato, sala y horario |
| HU-010 | No iniciada | — | Seat y SeatLock con 7 estados; mapa de sillas; bloqueo transaccional 10 min; liberación manual y automática; máximo por función; auditoría de bloqueos y liberaciones; resumen con total |

## Contexto de la migración

- Requisitos: `docs/historias-de-usuario.md`, transcripción de las páginas 1–35 del PDF `Historia de usuario NodeJS Multicine Riwi (1).pdf` (backlog con HU-001 a HU-029; solo aplican las 10 primeras).
- Origen del código: `github.com/MateoMg06/RIWI-TV-PUBLIC`, rama **`main`** (`abbf621`). Sirve para detalles que el backlog no fija; si lo contradice, gana el backlog.
- Ramas `feature/controller` y `feature/movie-module` del repo Nest usan otra estructura y su diff borra `auth`/`user`: **no hacer merge**, traer archivos a mano.

## Decisiones

- **Alcance limitado a HU-001 a HU-010** (indicación de la persona responsable, 2026-10-15).
- **El backlog (`docs/historias-de-usuario.md`) manda sobre el código original.**
- Rutas bajo `/api` sin versión; `/api/v1` solo para el health check (la API versionada es HU-029, fuera de alcance).
- La membresía nace **Activa** al registrarse (backlog HU-006), no `pending` como en el original.
- Sesiones en tabla `Sessions` (N por usuario), refresh token guardado como SHA-256.
- Refresh firmado con secreto distinto al access; refresh sin rol ni email.
- El rol nunca se acepta del cliente en `UserService.create/update`; registro público usa `RegisterDto` sin `role`.
- `cityId` numérico en lugar de nombre de ciudad en el usuario.
- Teléfono y documento como `string`.
- Cookie del access token: `accessToken` (igual que el original).
- `.env` obligatorio en todos los entornos; en Docker se monta como volumen.
- HU-001: `HealthService` usa `DataSource` directamente (`SELECT 1`), sin DAO ni `@nestjs/terminus`: no hay entidad y sería una capa o dependencia con un solo uso (`agent.md` §4.1).
- HU-002: las respuestas de `/countries`, `/departments/:countryId` y `/cities/:departmentId` usan los nombres de campo del original (`{id, country}`, `{id, department, countryId}`, `{id, city, departmentId, active}`) por compatibilidad con el frontend; las entidades conservan `name`/`isActive` y el service hace el mapeo.
- HU-002: solo las ciudades se filtran por activas; países y departamentos se listan todos (igual que el original).
- HU-002: RN-006 se aplica al guardar la ubicación (`POST /users/location`), no en el listado de ciudades.
- HU-002: solo `POST /users/location` (el `PUT` del original queda fuera). Mensajes y orden de validación del original: 404 usuario, 404 ciudad, 422 ciudad inactiva, 422 sin cines activos.
- HU-002: la respuesta es `{ message, user: { id, name, lastName, email, role, cityId } }`; nunca la entidad completa (sin `password`, tokens ni contadores de bloqueo). La identidad es `request.user.id` del token; cualquier rol.
- HU-002: `cityId` solo cambia por `/users/location`. `UpdateUserDto` ya no lo acepta (`PATCH /user/:id` con `cityId` da 400) para no saltarse RN-006. El alta/registro sigue aceptándolo (no se cambió).
- HU-002: tabla `Cinemas` con `name`, `isActive` y `city` (estilo Nest, no `active`/`cityId` del original). Solo `CinemaDao.countActiveByCityId`; sin service ni controller.
- HU-002: seed mínimo `src/seeders/seed.ts`, idempotente (busca por nombre). Crea Colombia, Antioquia, Medellín (activa, con cine «Multicine Riwi Centro»), Envigado (activa, sin cines) y Bello (inactiva). Ejecutar: `npm run build && npm run seed` (en Docker: `docker compose exec app npm run seed`). Reutiliza `typeOrmOptions` exportado de `src/database.ts`. (HU-003 lo amplía: ver abajo.)
- HU-003: las funciones `SOLD_OUT` **sí** salen en la cartelera; solo se excluyen las `CANCELLED`. Desviación consciente del original, que filtraba `status = ACTIVE`. El filtro "Disponible" (RN-011, paso 5) las quitará.
- HU-003: `classification` usa el enum `AgeRating` existente (`todos`, `12+`, `16+`, `18+`). `status`, `audioType` y formatos usan los valores del original (`ACTIVE`/`SOLD_OUT`/`CANCELLED`; `UPCOMING`/`ACTIVE`/`INACTIVE`; `DUBBED`/`SUBTITLED`/`ORIGINAL`; `2D`/`3D`/`IMAX`/`VIP`).
- HU-003: la zona horaria es `TZ=America/Bogota`; define «hoy» y los 7 días (`from` = ahora, `to` = fin del día +6, RN-012). Node la aplica también si se asigna a `process.env.TZ` en runtime (verificado en Node 24 con `node -e`), así que vale con que `load-env.ts` cargue el `.env`; en Docker llega por `env_file`.
- HU-003: `cityId` es opcional como en el original; sin él se devuelven todas las ciudades. `formats` (formatos distintos por película) es un campo derivado añadido; no existe en el original. Nombres de campo del original donde coinciden (`id, name, genre, classification, duration, director, posterUrl, releaseDate, status, audienceRating` numérico); el original además devuelve `synopsis`, `cast`, `bannerUrl` y `trailerUrl` (HU-004, aún no existen) y `showtimes` crudos; aquí cada función va con `{ id, startsAt, format, language, audioType, status, cinema: { id, name } }`.
- HU-003: RN-013 sin caché: cada petición consulta la BD.
- HU-003: «hoy» = de ahora al fin del día (23:59:59.999 en `TZ`). Desviación consciente del original, que usa el inicio del día y muestra funciones ya iniciadas. Decisión de la persona.
- HU-003: las rutas fijas de `/movies` (`weekly`, luego `today`, `filter`) deben declararse antes de `:id` (HU-004).
- HU-003: seed ampliado: Itagüí (activa) con «Multicine Riwi Sur», «Multicine Riwi Cerrado» (inactivo) en Medellín, 6 películas (4 `ACTIVE`, 1 `UPCOMING`, 1 `INACTIVE`) y 13 funciones relativas a hoy (incluidas: hoy 23:00, +1, +3, +6, una `SOLD_OUT`, 2 en Itagüí; excluidas: +7, ayer, `CANCELLED`, película próxima, película inactiva, cine inactivo).
- HU-003: «Disponible» (RN-011) = `status <> SOLD_OUT` (`available=true`); no se añade `availableSeats`. `available=false` o ausente no filtra. Decisión de la persona.
- HU-003: `GET /movies/today` también acepta `date` (como el original). Decisión de la persona.
- HU-003: `date` (YYYY-MM-DD) puede estar fuera de la ventana de 7 días; muestra ese día completo, pero sin funciones ya iniciadas (`from` = max(inicio del día, ahora)); día pasado → `[]`; fecha inexistente (`2026-02-30`) → 400. Decisión de la persona.
- HU-003: `roomType` es string libre (`varchar(30)`, default `'STANDARD'`), sin enum ni tabla. Filtros por igualdad exacta (sensible a mayúsculas). `classification=12+` se envía como `12%2B`. Decisión de la persona.
- HU-003: seed con 3 funciones más (16 en total): Centro hoy 23:30 en inglés, Centro +1 22:00 IMAX `SOLD_OUT` en sala `VIP`, Sur +3 17:00 3D.

## Pendientes

Transversales:
- [ ] **Decidir** qué contrato manda (original o Nest): formato de error, 201 vs 200, respuesta de register, prefijos `/api/v1` y sin prefijo. Ver `agent.md` §5.
- [ ] Revisar flujo completo: registro → activación → login → refresh → logout.
- [ ] Migrar tests de contrato del original (`hu001-hu010.routes.test.ts` y relacionados).

Por historia:
- [x] HU-001: `GET /api/v1/health` (200).
- [ ] HU-001: migración inicial TypeORM ejecutada al arrancar y quitar `synchronize: true`; seeders de demostración.
- [x] HU-002 paso 1: lecturas de ubicación.
- [x] HU-002 paso 2: `POST /users/location` con Cinema mínima y RN-006 al guardar.
- [ ] HU-002: prueba manual contra Postgres (seed + login + `POST /api/users/location`: 200, 404, 422 inactiva, 422 sin cines).
- [x] HU-003 paso 1: entidades `Movie`/`Showtime`, `GET /movies` y `/movies/weekly`, seed.
- [x] HU-003 paso 2: `GET /movies/today`.
- [x] HU-003 pasos 3–5: filtros y "Disponible"; columna `roomType` en `Showtime`.
- [ ] HU-003: prueba manual contra Postgres (seed + `GET /api/movies/weekly?cityId=`); añadir `TZ=America/Bogota` al `.env` local (ya está en `.env.example`). Consultas de los filtros (la columna `roomType` la crea `synchronize`; en BD con funciones previas toma `STANDARD`): `?format=IMAX`, `?format=IMAX&available=true`, `?roomType=VIP`, `?language=Inglés`, `?cinemaId=<Sur>`, `?genre=Drama`, `?classification=16%2B`, `?date=<hoy+3>`, `?date=<ayer>` (→ `[]`), `?date=2026-13-01` (→ 400), `/today?available=true`.
- [ ] HU-004: detalle completo con precio por formato; funciones futuras de la ciudad; recomendaciones.
- [ ] HU-005: próximos estrenos; `POST /notifications/upcoming` sin duplicados; correo al pasar a "En Cartelera".
- [ ] HU-006: `register` crea `Profile`, `Membership` **Activa** con código único, historial vacío, billetera vacía y preferencias; correo de activación (nodemailer); `POST /auth/verify-email`; `POST /membership/create`; `CreateUserDto` con mínimo 10 caracteres.
- [ ] HU-007: invalidar el refresh anterior en cada login (RN-030); login devuelve membresía, beneficios y perfil; `POST /auth/forgot-password` y `/reset-password` + `PasswordResetToken`; `AccessAudit` (IP y dispositivo) en login, login fallido, refresh, logout, reset y activación.
- [ ] HU-008: `GET`/`PUT /profile`, `GET /membership`, `/membership/benefits`; reservas activas; cambio de correo con nueva validación.
- [ ] HU-009: `GET /functions/:id`, `/prices`; solo funciones activas y no iniciadas.
- [ ] HU-010: `GET /functions/:id/seats`, `POST /reservations/lock-seats`, `DELETE /reservations/release-seats`, `GET /reservations/summary`; job de liberación (`@nestjs/schedule`); máximo de sillas por función; auditoría de bloqueos; variable `SEAT_LOCK_MINUTES`.

## Código sin uso

Para borrar en un commit aparte:
- `src/modules/country/create-country.dto.ts`, `department/create-department.dto.ts`, `city/create-city.dto.ts`.
- Métodos `create` y `delete` de `CountryDao`, `DepartmentDao` y `CityDao`.

## Fuera de alcance

No se implementa (no pertenece a HU-001 a HU-010):
- HU-011 a HU-029 del backlog: carrito, confitería, pagos, entradas y facturas, notificaciones generales (HU-015), reprogramación y transferencia de reservas, bonos de regalo, Cine Flash, panel administrativo, IA, puntos, validación de QR, dashboard, promociones, encuestas, PQRS y API pública `/api/v1` (HU-029).
- Del original: `POST /api/movies`, `POST /api/cinemas`, `POST/DELETE /api/cinemas/:id/movies/:movieId`, `GET /api/cinemas/:id/movies`, `GET /api/cinemas/:id/showtimes`; `POST` de países, departamentos y ciudades; `GET /cities/:id/cinemas`; rutas heredadas `/api/users/auth`, `/api/users/legacy-login`, `/api/users/getUsers`, `/api/users/register`.
- Ampliar el CRUD `/api/user` (existe como soporte interno; no lo pide ninguna historia).

## Bugs conocidos

1. [x] `GET /auth/captcha` expone `answer` — `src/modules/auth/auth.controller.ts`, `src/common/utils/captcha.ts`.
2. [x] Cookie `refresh_token` con `path: '/auth'` pero la ruta real es `/api/auth` — `auth.controller.ts`.
3. [x] `revokedAt: undefined` no filtra en TypeORM; usar `IsNull()` — `src/modules/auth/auth.dao.ts`.
4. [x] `__dirname` en ESM — `src/config/config.service.ts`. (Resuelto por `35c326d`: el proyecto pasó a CommonJS.)
5. [x] `.env` no se carga en `process.env` pero varios módulos lo leen de ahí — `database.ts`, `cors.ts`, `auth.service.ts`, `user.service.ts`.
6. [x] `/user/:id` sin control de propiedad; `POST /user` sin `@Roles`; `+id` sin `ParseIntPipe` — `src/modules/user/user.controller.ts`.
7. [ ] Política de contraseña inconsistente (DTO 8–72 vs validador ≥10 + complejidad). **Resuelto por el backlog (RN-022): mínimo 10.** Falta ajustar `CreateUserDto`.
8. [ ] `AuthPayload` declara `name`/`membership` que el token no trae.
9. [ ] Credenciales de ejemplo de ObserveModule en `app.module.ts`; nombres de variables inconsistentes en `.env.example`.
10. [ ] Captcha en memoria (no escala; limpieza nunca se ejecuta).
11. [ ] Sin migraciones (`synchronize: true`).
12. [ ] Swagger con datos de relleno y puerto 3000 fijo en el log.
13. [ ] `tsconfig.build.tsbuildinfo` versionado.
14. [x] `.env.example` con secretos que parecen reales (JWT, Observe, `SEED_API_KEY`): reemplazar y rotar.
15. [ ] Email no implementado (nodemailer instalado sin uso).
16. [x] `agent.md` §2 y §4 dicen ESM / `import.meta.dirname`, pero desde `35c326d` el proyecto es CommonJS (`__dirname` es válido).
17. [ ] HU-007 RN-030: el login no invalida el refresh token anterior; `Sessions` permite N sesiones simultáneas — `src/modules/auth/auth.service.ts`.
18. [ ] HU-007: la respuesta de login no incluye membresía, beneficios ni datos del perfil — `src/modules/auth/auth.service.ts`.

## Registro de cambios

### 2026-10-15 — chore(HU-003): restaurar `.env.example` con `TZ`
- **Archivos:** `.env.example`
- **Qué:** se restaura `.env.example` (la persona lo había renombrado a `.env`) con el mismo contenido limpio y se añade `TZ=America/Bogota` en la sección Aplicación.
- **Por qué:** decisión de HU-003 (zona horaria de la cartelera); el pendiente de la entrada anterior.
- **Impacto:** variable de entorno `TZ`. Hay que añadirla también al `.env` local.
- **Verificación:** no aplica (solo configuración de ejemplo).
- **Pendiente derivado:** ninguno.

### 2026-10-15 — feat(HU-003): cartelera semanal `GET /movies` y `/movies/weekly` (paso 1 de 5)
- **Archivos:** `src/common/enums/domain.enums.ts` (`ShowtimeStatus`, `MovieStatus`, `AudioType`, `ShowFormat.VIP`), `src/modules/movie/{movie.entity,movie.service,movie.controller,movie.module,catalog-query.dto}.ts` y specs de service y controller, `src/modules/showtime/{showtime.entity,showtime.dao,showtime.module}.ts` y `showtime.dao.spec.ts`, `src/database.ts`, `src/seeders/seed.ts`, `agent.md` (§5.1 fila HU-003/004/005).
- **Qué:** endpoints públicos `GET /api/movies` y `GET /api/movies/weekly` (misma respuesta; `?cityId=` opcional, entero ≥ 1 o 400). Una sola consulta (QueryBuilder con join a película y cine): película `ACTIVE`, función no `CANCELLED`, cine activo, `startsAt` entre ahora y el fin del día +6, ordenado por nombre y hora. El service agrupa por película y añade `formats`. Tablas nuevas `Movies` y `Showtimes` (índice en `startsAt`) por `synchronize: true`.
- **Por qué:** HU-003 (cartelera semanal, RN-012, RN-013).
- **Impacto:** rutas nuevas sin token; nuevas tablas; `ShowFormat` gana `VIP` (sin otros usos en el código). Variable de entorno: `TZ=America/Bogota` (la lee Node, no `Config`); **no se pudo añadir a `.env.example` porque ese archivo está borrado en el working tree** (`D .env.example`, cambio de la persona): hay que añadir `TZ=America/Bogota` (sección Aplicación, «define "hoy" y los 7 días de la cartelera») al restaurarlo y al `.env` local. Sin `TZ` se usa la zona del sistema.
- **Verificación:** `npm run test` ✅ (158/158, 19 nuevos) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual: no hay Postgres levantado; el seed no se ejecutó.
- **Pendiente derivado:** pasos 2–5 de HU-003; prueba manual; `TZ` en `.env.example`.

### 2026-10-15 — feat(HU-003): cartelera de hoy `GET /movies/today` (paso 2 de 5)
- **Archivos:** `src/modules/movie/{movie.service,movie.controller}.ts` y sus specs, `agent.md` (§5.1 fila HU-003/004/005), `memory.md`.
- **Qué:** endpoint público `GET /api/movies/today` (`?cityId=` opcional). El service extrae la consulta y el agrupado a `getCatalog(from, to, cityId)`, compartido con `getWeekly` (comportamiento sin cambios); `getToday` usa de ahora a hoy 23:59:59.999. Declarado tras `weekly`.
- **Por qué:** HU-003 (cartelera de hoy).
- **Impacto:** ruta nueva sin token; sin cambios de BD ni variables de entorno.
- **Verificación:** `npm run test` ✅ (164/164, 6 nuevos) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** pasos 3–5 de HU-003; prueba manual.

### 2026-10-15 — chore(HU-001): `.env.example` limpio
- **Archivos:** `.env.example`
- **Qué:** secretos sustituidos por `change-me` (JWT, Observe, Postgres). Solo quedan las variables que usa el código o `docker-compose.yml`; se añaden `CORS_ORIGIN`, `JWT_ACCESS_EXPIRES_IN` y `JWT_REFRESH_EXPIRES_IN`. Se quitan las que nada usa (`POSTGRES_TEST_DB`, `POSTGRES_QA_DB`, `POSTGRES_PROD_DB`, `OBSERVE_APP_NAME`, `APP_URL`, `SEED_API_KEY`, `SMTP_*`). `SMTP_*` y `RESET_TOKEN_EXPIRES_IN` vuelven cuando se implemente el correo (HU-006) y el reset (HU-007).
- **Por qué:** bug #14; RN-002 (toda configuración por variables de entorno).
- **Impacto:** variables de entorno. Si los secretos antiguos se usaron en algún entorno, hay que rotarlos.
- **Verificación:** no aplica (solo configuración de ejemplo).
- **Pendiente derivado:** rotar los secretos antiguos si se usaron.

### 2026-10-15 — feat(HU-002): `POST /users/location` con RN-006, Cinema mínima y seed (paso 2)
- **Archivos:** `src/modules/cinema/{cinema.entity,cinema.dao,cinema.module,cinema.dao.spec}.ts` (nuevos), `src/modules/user/{set-location.dto,users-location.controller}.ts` y sus specs (nuevos), `src/modules/user/update-user.dto.spec.ts` (nuevo), `src/modules/user/user.service.ts`, `user.service.spec.ts`, `user.module.ts`, `update-user.dto.ts`, `src/database.ts`, `src/seeders/seed.ts` (nuevo), `package.json` (script `seed`), `agent.md` (§5.1 fila HU-002 `/users/location`).
- **Qué:** `POST /api/users/location` (JWT, cualquier rol, 200) guarda `cityId` del usuario del token. Orden: 404 «Usuario no encontrado», 404 «Ciudad no encontrada», 422 «La ciudad está inactiva», 422 «La ciudad no tiene cines activos» (RN-006). `UpdateUserDto` pierde `cityId` y `UserService.update` ya no lo trata aparte: `PATCH /user/:id` con `cityId` da 400. `database.ts` exporta `typeOrmOptions` (usado por app y seed) y registra `Cinema`. Script `npm run seed` (`node dist/seeders/seed.js`). `UserModule` importa `CountryModule` y `CinemaModule` (sin dependencia circular: build correcto).
- **Por qué:** HU-002 (ubicación del usuario) y RN-006; cierra el bypass de RN-006 por `PATCH /user/:id`.
- **Impacto:** endpoint nuevo; nueva tabla `Cinemas` (por `synchronize: true`); `PATCH /api/user/:id` ya no admite `cityId`. Sin variables de entorno nuevas.
- **Verificación:** `npm run test` ✅ (139/139) · `npm run lint` ✅ · `npm run build` ✅ (`dist/seeders/seed.js` generado). Sin prueba manual: no hay Postgres levantado; el seed no se ejecutó.
- **Pendiente derivado:** prueba manual con Postgres; borrar código sin uso.

### 2026-10-15 — test(HU-002): 400 por id no numérico en departamentos y ciudades
- **Archivos:** `src/modules/country/location.controller.spec.ts`.
- **Qué:** 2 tests que comprueban (vía `ROUTE_ARGS_METADATA`) que `countryId` y `departmentId` usan `ParseIntPipe` y que este rechaza `'abc'` con `BadRequestException`. Sin cambio de comportamiento.
- **Por qué:** corrección de la revisión del paso 1 de HU-002.
- **Impacto:** ninguno en runtime.
- **Verificación:** `npm run test` ✅ (120/120) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** ninguno.

### 2026-10-15 — feat(HU-002): lecturas de ubicación (paso 1)
- **Archivos:** `src/modules/country/location.controller.ts` (nuevo), `country.module.ts`, `country.service.ts`, `country.dao.ts`, `department/department.service.ts`, `department/department.dao.ts`, `city/city.service.ts`, `city/city.dao.ts`, specs de los tres services y del controller; eliminado `country.controller.ts`; `agent.md` (§5.1 fila HU-002).
- **Qué:** `GET /api/countries`, `GET /api/departments/:countryId`, `GET /api/cities/:departmentId`, públicos, ids con `ParseIntPipe` (400). País o departamento inexistente: 404 «País no encontrado» / «Departamento no encontrado». Ciudades solo activas y ordenadas por nombre. Se elimina la ruta stub `pais` y los métodos stub de `CountryService`.
- **Por qué:** HU-002 (lecturas); mismas rutas y formas de respuesta que el original.
- **Impacto:** nuevas rutas sin token; `GET /api/pais` deja de existir. `CountryModule` exporta `CityDao` (para el paso 2).
- **Verificación:** `npm run test` ✅ (118/118, 9 nuevos) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba contra Postgres.
- **Pendiente derivado:** paso 2 (`POST /users/location`, Cinema mínima, RN-006); borrar código sin uso.

### 2026-10-15 — feat(HU-001): health check `GET /api/v1/health`
- **Archivos:** `src/modules/health/health.module.ts`, `src/modules/health/health.controller.ts`, `src/modules/health/health.service.ts`, `src/modules/health/health.controller.spec.ts`, `src/modules/health/health.service.spec.ts`, `src/app.module.ts`, `docker-compose.yml`
- **Qué:** nuevo endpoint público `GET /api/v1/health`. Responde siempre 200 con `{ status, service, version, environment, database, uptimeSeconds, timestamp }`; si Postgres no responde a `SELECT 1`, `status: 'degraded'` y `database: 'down'` (mismo contrato que el original). El healthcheck del contenedor `app` pasa de `/api/docs` a `/api/v1/health`.
- **Por qué:** HU-001, criterio "Health Check responde HTTP 200" y endpoint `GET /api/v1/health` del backlog.
- **Impacto:** endpoint nuevo `GET /api/v1/health` (sin token). Docker usa ese endpoint para marcar el contenedor como sano.
- **Verificación:** `npm run test` ✅ (109/109, 5 nuevos) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual: no hay Postgres levantado en esta máquina.
- **Pendiente derivado:** probar con `docker compose up` que el contenedor queda `healthy`.

### 2026-10-15 — docs: alcance limitado a HU-001 a HU-010
- **Archivos:** `agent.md`, `memory.md`
- **Archivos (además):** `docs/historias-de-usuario.md` (nuevo).
- **Qué:** se transcriben las HU-001 a HU-010 del backlog oficial (PDF, páginas 1–35) a `docs/historias-de-usuario.md`, que pasa a ser la fuente de verdad. `agent.md` se reescribe sobre ese alcance: tabla de historias (§1.2), fuera de alcance HU-011 a HU-029 (§1.3), contrato por historia (§5.1) y conflictos entre backlog y código actual (§5.3). Se corrige el stack a CommonJS (§2, §4) y la rama de trabajo a `feature/develop`. `memory.md` pasa a "Estado por historia", pendientes por HU y "Fuera de alcance". Bugs nuevos #17 (RN-030) y #18 (respuesta de login). `INSTRUCTIONS.md` (borrado en `35c326d`) deja de ser referencia.
- **Por qué:** indicación de la persona responsable: solo se entregan HU-001 a HU-010. Bug #16.
- **Impacto:** ninguno en código.
- **Verificación:** no aplica (solo documentación).
- **Pendiente derivado:** implementar las historias pendientes según la tabla de estado.

### 2026-10-15 — fix: `.env` obligatorio y cargado en `process.env` antes del arranque
- **Archivos:** `src/config/load-env.ts` (nuevo), `src/config/config.service.ts`, `src/main.ts`, `docker-compose.yml`
- **Qué:** `load-env.ts` exige el `.env` de la raíz (si falta: mensaje y `exit(1)`) y lo carga en `process.env` sin sobrescribir variables ya definidas. Se importa primero en `main.ts`, porque `database.ts`, `cors.ts` y otros leen `process.env` al importarse. `ConfigService` ya no lee el archivo, solo `process.env`. `docker-compose.yml` monta `./.env` en solo lectura (`.dockerignore` lo deja fuera de la imagen).
- **Por qué:** Bug #5. Además, antes la app hacía `exit(0)` sin `.env` y el contenedor se cerraba "con éxito". Decisión: el `.env` es obligatorio en todos los entornos.
- **Impacto:** variables de entorno: hace falta `.env` para arrancar (local y Docker).
- **Verificación:** `npm run test` ✅ (104/104) · `npm run lint` ✅ · `npm run build` ✅ (ejecutados sobre el conjunto de arreglos de esta sesión). Probado con `dist/`: sin `.env` sale con código 1; con `.env` carga las variables. Docker no probado.
- **Pendiente derivado:** probar `docker compose up` con el volumen montado.

### 2026-10-15 — fix: `POST /user` solo admin y `ParseIntPipe` en `/user/:id`
- **Archivos:** `src/modules/user/user.controller.ts`, `src/modules/user/user.controller.spec.ts`
- **Qué:** `POST /user` pasa de `@Public()` a `@Roles(UserRole.ADMIN)`. Los `:id` usan `ParseIntPipe` (id no numérico ⇒ 400). Roles con `UserRole` en vez de strings. Los `it.fails` de roles pasan a tests normales.
- **Por qué:** Bug #6. Con `@Public()` se creaban cuentas sin captcha ni token de activación (quedaban inactivas para siempre).
- **Impacto:** `POST /api/user` exige token de admin. El registro público sigue en `POST /api/auth/register`.
- **Verificación:** `npm run test` ✅ (104/104) · `npm run lint` ✅ · `npm run build` ✅ (ejecutados sobre el conjunto de arreglos de esta sesión).
- **Pendiente derivado:** ninguno.

### 2026-10-15 — fix: el captcha no expone la respuesta y se reparan los specs de servicios
- **Archivos:** `src/common/utils/captcha.ts`, `src/modules/auth/auth.service.spec.ts`, `src/modules/user/user.service.spec.ts`
- **Qué:** `CaptchaChallenge` ya no incluye `answer`; `GET /auth/captcha` devuelve `{ token, question }`. Los specs fallaban desde `ca1a330` (15 tests): `UserService` no recibía `Password` y `register` no enviaba captcha. Se añaden tests de captcha ausente, incorrecto y de que no se expone la respuesta.
- **Por qué:** Bug #1 y suite en rojo.
- **Impacto:** contrato de `GET /api/auth/captcha` (sin `answer`).
- **Verificación:** `npm run test` ✅ (104/104) · `npm run lint` ✅ · `npm run build` ✅ (ejecutados sobre el conjunto de arreglos de esta sesión).
- **Pendiente derivado:** ninguno.

### 2026-10-15 — fix: `IsNull()` para filtrar sesiones no revocadas
- **Archivos:** `src/modules/auth/auth.dao.ts`, `src/modules/auth/auth.dao.spec.ts`
- **Qué:** `findActiveSessions` y `revokeAllSessions` filtran con `revokedAt: IsNull()`. Con `undefined` TypeORM quitaba la condición del WHERE: se devolvían sesiones revocadas y `logout-all` reescribía su fecha de revocación.
- **Por qué:** Bug #3. Los tests que documentaban el comportamiento erróneo se sustituyen por tests del correcto.
- **Impacto:** ninguno en el contrato HTTP.
- **Verificación:** `npm run test` ✅ (104/104) · `npm run lint` ✅ · `npm run build` ✅ (ejecutados sobre el conjunto de arreglos de esta sesión).
- **Pendiente derivado:** ninguno.

### 2026-10-15 — fix: cookie de refresh con path `/api/auth`
- **Archivos:** `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.controller.spec.ts`
- **Qué:** la cookie `refresh_token` se emite y se borra con `path: '/api/auth'` (constante `REFRESH_COOKIE_PATH`). Antes era `/auth` y el navegador no la enviaba a `/api/auth/refresh` ni a `/api/auth/logout`.
- **Por qué:** Bug #2.
- **Impacto:** refresh y logout por cookie funcionan en navegador.
- **Verificación:** `npm run test` ✅ (104/104) · `npm run lint` ✅ · `npm run build` ✅ (ejecutados sobre el conjunto de arreglos de esta sesión).
- **Pendiente derivado:** si cambia el prefijo global en `main.ts`, actualizar `REFRESH_COOKIE_PATH`.

### 2026-10-15 — fix: el guard lee la cookie `accessToken`
- **Archivos:** `src/common/guards/auth.guard.ts`, `src/common/guards/auth.guard.spec.ts`
- **Qué:** el guard leía la cookie `access_token`, pero desde `35c326d` el controller la emite como `accessToken`. Con cookie (navegador) ninguna ruta protegida reconocía la sesión.
- **Por qué:** regresión del commit `35c326d`. Se mantiene `accessToken` porque es el nombre del Express original (compatibilidad con el frontend).
- **Impacto:** autenticación por cookie vuelve a funcionar. Contrato: cookie `accessToken`.
- **Verificación:** `npm run test` ✅ (104/104) · `npm run lint` ✅ · `npm run build` ✅ (ejecutados sobre el conjunto de arreglos de esta sesión).
- **Pendiente derivado:** ninguno.

### 2026-10-15 — docs: añadir contexto del repo original a agent.md y memory.md
- **Archivos:** `agent.md`, `memory.md`
- **Qué:** se documentan el repo origen (`RIWI-TV-PUBLIC`), la diferencia entre `develop` y `main`, la hoja de ruta global, la advertencia sobre las ramas `feature/controller` y `feature/movie-module`, las rutas de auth/usuarios no migradas y las diferencias de contrato. También se añaden los bugs 14 y 15.
- **Por qué:** comparación de `origin/main` del original con `feature/authentication`.
- **Impacto:** ninguno en código.
- **Verificación:** no aplica (solo documentación).
- **Pendiente derivado:** decidir qué contrato manda (original o Nest).

### 2026-10-15 — docs: crear agent.md y memory.md
- **Archivos:** `agent.md`, `memory.md`
- **Qué:** guía para agentes de IA y memoria inicial con estado, decisiones, pendientes y bugs detectados en la revisión de `feature/authentication`.
- **Por qué:** dar contexto persistente a los agentes y obligar a registrar cada cambio.
- **Impacto:** ninguno en código.
- **Verificación:** no aplica (solo documentación).
- **Pendiente derivado:** resolver los bugs listados, uno por cambio.

### 2026-10-15 — feat(HU-003): filtros de la cartelera (pasos 3, 4 y 5 de 5)
- **Archivos:** `src/modules/movie/{catalog-query.dto,movie.service,movie.controller}.ts` y specs (nuevo `catalog-query.dto.spec.ts`), `src/modules/showtime/{showtime.entity,showtime.dao}.ts` y `showtime.dao.spec.ts`, `src/seeders/seed.ts`, `agent.md` (§5.1 fila HU-003/004/005), `memory.md`.
- **Qué:** `GET /api/movies`, `/weekly`, `/filter` y `/today` aceptan `cityId`, `cinemaId`, `genre`, `classification`, `language`, `roomType`, `format`, `date` y `available`. Nueva columna `Showtime.roomType`; cada función de la respuesta incluye `roomType`. `getWeekly`/`getToday` reciben el DTO; `resolveRange` calcula el rango (con `date`, sin funciones pasadas); el DAO añade un `andWhere` por filtro presente. Seed con 3 funciones nuevas.
- **Por qué:** HU-003 (filtros, RN-011 «Disponible»).
- **Impacto:** columna nueva en `Showtimes` (`synchronize` la crea; sin migración); sin variables de entorno nuevas. `available` usa `@Transform` sobre el valor crudo porque `enableImplicitConversion` convertiría `'false'` en `true` (cubierto por test).
- **Verificación:** `npm run test` ✅ (198/198) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** prueba manual de HU-003 con las consultas listadas en Pendientes.
