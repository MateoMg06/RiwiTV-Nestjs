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
| HU-004 | Completa salvo prueba manual | Columnas nuevas en `Movie` (`synopsis`, `cast`, `bannerUrl`, `trailerUrl`) y `Showtime.price`; `GET /movies/:id` (detalle con `formats`, `languages`, `prices` y `showtimes` futuras), `GET /movies/:id/functions`, `GET /movies/:id/recommendations` (públicos, `?cityId=` opcional en detalle y funciones); `MovieDao`; seed ampliado con `refresh` | Prueba manual contra Postgres |
| HU-005 | Completa salvo RN-020 y prueba manual | Entidad `ReleaseNotification` (tabla `ReleaseNotifications`, único `(userId, movieId)`); `GET /movies/upcoming` y `/movies/upcoming/:id` (públicos, orden por fecha, `daysUntilRelease`); `POST /notifications/upcoming` (JWT, 201, sin duplicados RN-019); seed con estrenos próximos y uno vencido | Correo automático al pasar a "En Cartelera" (RN-020, depende del correo de HU-006); prueba manual contra Postgres |
| HU-006 | Parcial | Captcha, registro, BCrypt, validador de contraseña (≥10 + complejidad), activación por token 24 h | Crear perfil, membresía **Activa** con código único, historial vacío, billetera vacía y preferencias; correo de activación (SMTP); `POST /auth/verify-email`; `POST /membership/create`; DTO con mínimo 10 |
| HU-007 | Parcial | JWT 15 min, refresh 7 d en BD con rotación, logout, bloqueo 15 min tras intentos, solo cuentas activas, cookies | Invalidar el refresh anterior en cada login (RN-030); respuesta de login con membresía, beneficios y perfil; forgot/reset password; auditoría de accesos con IP y dispositivo |
| HU-008 | No iniciada | — | `GET`/`PUT /profile`, `GET /membership`, `/membership/benefits`: QR único, nivel, descuentos por nivel, bonos, historial de compras, reservas activas, preferencias; cambio de correo con nueva validación (RN-034) |
| HU-009 | No iniciada | — | `GET /functions/:id` y `/prices`; solo funciones activas y no iniciadas; precio según formato, sala y horario |
| HU-010 | No iniciada | — | Seat y SeatLock con 7 estados; mapa de sillas; bloqueo transaccional 10 min; liberación manual y automática; máximo por función; auditoría de bloqueos y liberaciones; resumen con total |

## Contexto de la migración

- Requisitos: `docs/historias-de-usuario.md`, transcripción de las páginas 1–35 del PDF `docs/Historia de usuario NodeJS Multicine Riwi (1).pdf` (backlog con HU-001 a HU-029; solo aplican las 10 primeras).
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
- HU-004: el detalle solo existe para películas `ACTIVE`; `UPCOMING`/`INACTIVE` dan 404 «Película no encontrada». Desviación del original (el detalle de próximos estrenos es HU-005, `/movies/upcoming/:id`, que debe declararse **antes** de `:id` en el controller).
- HU-004: funciones del detalle y de `/:id/functions`: solo futuras (`startsAt > ahora`, RN-014), `SOLD_OUT` incluidas con su status (RN-015), `CANCELLED` excluidas, cines activos, sin tope superior de fecha. `?cityId=` opcional (≥ 1; sin él, todas las ciudades).
- HU-004: `Showtime.price` es `decimal(12,2)` default 0 (llega como string; el service lo pasa a `Number`). La respuesta incluye `prices: [{ format, price }]` con el precio mínimo por formato entre las funciones devueltas, y cada función trae su `price`. El mapper de función compartido incluye `price` también en la cartelera de HU-003.
- HU-004: `genre` es un string único; la calificación es `audienceRating`. `trailerUrl` se devuelve tal cual (el embebido de YouTube es del frontend). `cast` es `jsonb` (`string[]`).
- HU-004: recomendaciones = mismo género, `id <> movie.id`, solo `ACTIVE`, orden `audienceRating DESC, name ASC`, máximo 6. Desviación del original, que incluía `UPCOMING`.
- HU-004: `MovieDao` (solo `Movie`) con `findActiveById` y `findRecommendations`; `MovieCityQueryDto` solo acepta `cityId` (no reutiliza `CatalogQueryDto`, para no admitir filtros que aquí no aplican).
- HU-004: el seed usa `findOrCreate(..., refresh)`: con `refresh` hace `merge`+`save` si ya existe; solo en películas y funciones, para que una BD ya sembrada reciba las columnas nuevas. Precios: `priceFor(format)` (2D 14000, 3D 18000, IMAX 24000, VIP 32000) y «Noche en Medellín» 3D en Sur = 17000. Películas nuevas: «Sombras del Pasado» (Drama, ACTIVE, 4.5, sin funciones) y «Corazón de Barrio» (Drama, UPCOMING, 4.8).

- HU-005: RN-020 (correo automático) queda **pendiente hasta HU-006**: hoy solo se registran solicitudes `PENDING`; no hay job, evento ni envío. `NotificationStatus` solo tiene `PENDING` (§4.1); `SENT` se añade con el envío.
- HU-005: RN-018 (fechas de estreno por ciudad/complejo) no se implementa: el original tampoco y ningún criterio lo exige. `releaseDate` es único por película.
- HU-005: `daysUntilRelease = Math.max(0, Math.ceil((releaseDate - ahora) / 86_400_000))`; listado y detalle devuelven los mismos campos (base + `synopsis`, `cast`, `bannerUrl`, `trailerUrl`, `daysUntilRelease`). Sin `showtimes` ni validación de YouTube.
- HU-005: «próximo estreno» = `status = UPCOMING` **y** `releaseDate > ahora` (`MovieDao.findUpcoming`/`findUpcomingById`, orden `releaseDate ASC, name ASC`). El detalle de una película activa, inactiva, ya estrenada o inexistente da 404 «Próximo estreno no encontrado».
- HU-005: duplicado → 409 «Ya existe una solicitud de notificación para esta película»: lo decide el índice único y el código Postgres `23505` en `ReleaseNotificationDao.create`, sin consulta previa (a prueba de peticiones simultáneas). Otros errores de BD se relanzan.
- HU-005: `POST /notifications/upcoming` responde 201 con `{id, userId, movieId, cityId, status, createdAt}`. Cuerpo `{movieId, cityId?}`; el usuario sale del token (`request.user.id`, 401 si falta). `cityId` es `null` si no llega (sin respaldo en la ciudad del usuario); si llega se valida con `CityDao.findById` (404 «Ciudad no encontrada»). Orden: película, ciudad, creación.
- HU-005: `ReleaseNotification` con columnas planas (`userId`, `movieId`, `cityId`), sin relaciones TypeORM. `MovieModule` exporta `MovieDao`; `NotificationModule` importa `MovieModule` y `CountryModule`.
- HU-005: seed con `releaseDays` opcional por película (default 30 UPCOMING, -60 resto): «Corazón de Barrio» +10, «El Regreso del Rey» +30, y al final «Estreno Vencido» (Acción, UPCOMING, -5; no debe salir) y «Última Frontera» (Acción, UPCOMING, +3). Las películas usan `refresh`, así que una BD ya sembrada toma las fechas nuevas.
- HU-006: **el perfil es solo `User`** (decisión de la persona). No hay tablas Profile, preferencias, historial de compras ni billetera; «vacío» = sin filas. Se añaden a `User` `gender` (varchar 20, opcional) y `favoriteCinemaId` (int, opcional, sin relación). Desviación respecto a `agent.md` §1.2 (que habla de perfil, historial, billetera y preferencias).
- HU-006: `favoriteCinemaId` y `cityId` inexistentes no se validan en el registro (ver Pendientes).
- HU-006: `POST /auth/register` responde `{ user, membership: { code, status }, activationToken? }` (el token solo fuera de producción). **Hay que avisar al frontend** del campo nuevo `membership`.
- HU-006: el registro es transaccional (`DataSource.transaction`): usuario + membresía se crean juntos y el token de activación va en el mismo INSERT (se elimina el `userDao.update` posterior). Los chequeos previos (correo, documento) quedan fuera de la transacción.
- HU-006: **correo emulado.** No hay servicio SMTP y el proyecto es educativo: `MailService` (`src/common/utils/mail.ts`, nodemailer, provider de `UtilsModule`) usa SMTP si `SMTP_HOST` está definido y, si no, el transporte integrado `jsonTransport` (sin red) y registra «Correo emulado» con destinatario y asunto; el enlace con token solo fuera de producción (`agent.md` §8). El correo es texto plano en español con `${FRONTEND_URL}/verify-email?token=…`. Se envía tras el commit de la transacción; si falla se loguea (sin token) y el registro no se revierte.

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
- [x] HU-004: detalle, funciones futuras y recomendaciones.
- [ ] HU-004: prueba manual contra Postgres (`npm run build && npm run seed`; las columnas nuevas las crea `synchronize`; sin seed las películas previas tienen sinopsis `''`, `cast` `[]` y precio 0). Consultas: `GET /api/movies/<id>` (Noche en Medellín: `prices` 2D 14000 / 3D 17000 si no se filtra ciudad; con `?cityId=<Itagüí>` solo 3D 17000), `/<id>/functions?cityId=`, `/<id>/recommendations` (Noche → Sombras del Pasado primero, 4.5), id de película próxima o inactiva (→ 404), `/abc` (→ 400), `?cityId=0` (→ 400).
- [x] HU-005: próximos estrenos, contador regresivo y `POST /notifications/upcoming` sin duplicados.
- [ ] HU-005 / RN-020: al hacer HU-006 (correo), añadir `NotificationStatus.SENT` y un `@Cron` (`@nestjs/schedule`) que busque solicitudes `PENDING` cuya `Movie.status = ACTIVE`, envíe el correo y las pase a `SENT`.
- [ ] HU-005: prueba manual contra Postgres (`npm run build && npm run seed`; la tabla `ReleaseNotifications` la crea `synchronize`). Consultas: `GET /api/movies/upcoming` (orden: Última Frontera +3, Corazón de Barrio +10, El Regreso del Rey +30; sin «Estreno Vencido»), `/upcoming/<id>` (`daysUntilRelease`), `/upcoming/<id de Estreno Vencido o película activa>` (→ 404), `/upcoming/abc` (→ 400); con JWT `POST /api/notifications/upcoming` `{"movieId":<id>}` (201), repetido (409), `{"movieId":<activa>}` (404), `{"movieId":<id>,"cityId":9999}` (404), sin token (401).
- [ ] HU-006: `register` crea `Profile`, `Membership` **Activa** con código único, historial vacío, billetera vacía y preferencias; correo de activación (nodemailer); `POST /auth/verify-email`; `POST /membership/create`; `CreateUserDto` con mínimo 10 caracteres.
- [ ] HU-006: no se validan `cityId` ni `favoriteCinemaId` inexistentes en el registro (el `cityId` ya falla por FK; `favoriteCinemaId` no tiene relación).
- [ ] HU-008: el enum `Membership` (BASICA/PLATA) y `User.membership` no se tocaron en HU-006; HU-008 (niveles Bronce/Plata/Oro/Platino) debe decidir si se reemplazan o se eliminan.
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
7. [x] Política de contraseña inconsistente (DTO 8–72 vs validador ≥10 + complejidad). Resuelto: `CreateUserDto` usa `@Length(10, 72)` (RN-022); `UpdateUserDto` lo hereda.
8. [ ] `AuthPayload` declara `name`/`membership` que el token no trae.
9. [ ] Credenciales de ejemplo de ObserveModule en `app.module.ts`; nombres de variables inconsistentes en `.env.example`.
10. [ ] Captcha en memoria (no escala; limpieza nunca se ejecuta).
11. [ ] Sin migraciones (`synchronize: true`).
12. [ ] Swagger con datos de relleno y puerto 3000 fijo en el log.
13. [ ] `tsconfig.build.tsbuildinfo` versionado.
14. [x] `.env.example` con secretos que parecen reales (JWT, Observe, `SEED_API_KEY`): reemplazar y rotar.
15. [x] Email no implementado (nodemailer instalado sin uso). Resuelto en HU-006 con `MailService` (correo de activación; emulado si no hay `SMTP_HOST`).
16. [x] `agent.md` §2 y §4 dicen ESM / `import.meta.dirname`, pero desde `35c326d` el proyecto es CommonJS (`__dirname` es válido).
17. [ ] HU-007 RN-030: el login no invalida el refresh token anterior; `Sessions` permite N sesiones simultáneas — `src/modules/auth/auth.service.ts`.
18. [ ] HU-007: la respuesta de login no incluye membresía, beneficios ni datos del perfil — `src/modules/auth/auth.service.ts`.

## Registro de cambios

### 2026-10-16 — feat(HU-006): `POST /auth/verify-email` (paso 5 de 6)
- **Archivos:** `src/modules/auth/auth.controller.ts`, `src/modules/auth/auth.controller.spec.ts`, `memory.md`.
- **Qué:** el handler de activación pasa a `@Post(['verify-email', 'activate'])` (200, `@Public`). `verify-email` es la ruta del backlog; `activate` queda como alias para no romper al frontend actual. Sin cambios en el service.
- **Por qué:** HU-006 (`POST /auth/verify-email`).
- **Impacto:** ruta nueva `POST /api/auth/verify-email` (el cuerpo sigue siendo `{ token }`).
- **Verificación:** `npm run test` ✅ (299/299) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** paso 6.

### 2026-10-16 — feat(HU-006): correo de activación emulado (paso 4 de 6)
- **Archivos:** `src/common/utils/{mail,mail.spec}.ts` (nuevos), `src/common/utils/utils.module.ts`, `src/config/config.keys.ts`, `.env.example`, `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.service.spec.ts`, `memory.md`.
- **Qué:** `MailService.sendActivation(to, name, token)` envía texto plano con el enlace `${FRONTEND_URL}/verify-email?token=…` (válido 24 h). Con `SMTP_HOST` usa SMTP (auth solo si hay `SMTP_USER`; `secure` si el puerto es 465); sin él usa `jsonTransport` y registra el envío como emulado. `UtilsModule` importa `ConfigModule` y exporta `MailService`. `AuthService.register` lo llama después de la transacción; si falla, registra el error sin token y devuelve el registro igualmente. Si la membresía falla no se envía correo.
- **Por qué:** HU-006 (correo de activación); bug #15.
- **Impacto:** variables de entorno nuevas, ya en `Config` y `.env.example`: `SMTP_HOST` (vacío = emulado), `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `FRONTEND_URL`. Hay que añadirlas al `.env` local (son opcionales: sin ellas el correo se emula con valores por defecto). Sin dependencias nuevas (nodemailer ya estaba instalado).
- **Verificación:** `npm run test` ✅ (298/298) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 5 y 6. RN-020 (correo de estreno de HU-005) puede reutilizar `MailService`.

### 2026-10-16 — feat(HU-006): registro transaccional con membresía Activa (paso 3 de 6)
- **Archivos:** `src/modules/user/{user.dao,user.service}.ts` y specs (`user.dao.spec.ts` nuevo), `src/modules/auth/{auth.service,auth.controller,auth.module}.ts`, `src/modules/auth/auth.service.spec.ts`, `memory.md`.
- **Qué:** `UserDao.create(data, manager?)` y `UserService.create(dto, manager?, extra?)` (`extra` = `activationToken`/`activationTokenExpires` en el INSERT). `AuthService.register` genera el token antes, abre `dataSource.transaction` y crea usuario + membresía (`MembershipService.createForUser(id, manager)`); si la membresía falla el error se propaga y el usuario se revierte. Respuesta: `{ user, membership: { code, status }, activationToken? }`. `AuthModule` importa `MembershipModule`; `AuthService` inyecta `DataSource` y `MembershipService`.
- **Por qué:** HU-006 (membresía Activa con código único creada junto al usuario); `db-use-transactions`.
- **Impacto:** contrato de `POST /api/auth/register` (campo `membership`, avisar al frontend). Sin variables nuevas.
- **Verificación:** `npm run test` ✅ (290/290) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 4 a 6 (correo, verify-email, `POST /membership/create`).

### 2026-10-16 — feat(HU-006): entidad, DAO y service de membresía (paso 2 de 6, sin endpoint)
- **Archivos:** `src/modules/membership/{membership.entity,membership.dao,membership.service,membership.module}.ts` y specs de dao y service (nuevos), `src/common/enums/domain.enums.ts` (`MembershipStatus`), `src/database.ts`, `memory.md`.
- **Qué:** tabla `Memberships` (`id`, `userId` único, `code` único, `status`, `createdAt`). `MembershipService.createForUser(userId, manager?)` genera `RTV-` + 10 hex en mayúsculas (`randomBytes(5)`) y reintenta hasta 3 veces si el código colisiona; al agotarlos lanza 500. `MembershipDao.create(data, manager?)` devuelve `null` si Postgres da `23505` sobre `code`, lanza 409 «El usuario ya tiene una membresía» si el `23505` es sobre `userId`, y relanza el resto; `findByUserId`. El INSERT va dentro de `manager.transaction` (savepoint si hay manager) para que un duplicado no aborte la transacción del registro (en Postgres un error invalida toda la transacción). `MembershipModule` exporta `MembershipService`. En `database.ts` la entidad se importa como `MembershipEntity` porque existe el enum `Membership`.
- **Por qué:** HU-006 (membresía Activa con código único al registrarse).
- **Impacto:** tabla nueva por `synchronize`; sin endpoints ni variables de entorno todavía. El módulo aún no lo importa nadie (paso 3).
- **Verificación:** `npm run test` ✅ (285/285, 11 nuevos) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 3 a 6.

### 2026-10-16 — fix(HU-006): contraseña mínima de 10 en el DTO y campos `gender`/`favoriteCinemaId` (paso 1 de 6)
- **Archivos:** `src/modules/user/create-user.dto.ts`, `src/modules/user/user.entity.ts`, `src/modules/user/create-user.dto.spec.ts` (nuevo), `memory.md`.
- **Qué:** `password` pasa de `@Length(8, 72)` a `@Length(10, 72)` (RN-022). `CreateUserDto` gana `gender?` (1–20) y `favoriteCinemaId?` (entero ≥ 1); `User` gana las columnas `gender` y `favoriteCinemaId` (nullable). `UpdateUserDto` deriva de `CreateUserDto`, así que hereda el mínimo 10. Spec nuevo: 9 caracteres falla, 10 pasa, opcionales ausentes, y `birthDate` como cadena JSON `"1995-05-20"` con `plainToInstance` (`enableImplicitConversion`, igual que el `ValidationPipe` de `main.ts`) + `validate`: pasa sin necesidad de `@Type(() => Date)`.
- **Por qué:** bug #7 y RN-022; campos del formulario de registro de HU-006.
- **Impacto:** contraseñas de 8–9 caracteres ya dan 400 en `POST /api/auth/register`; columnas nuevas en `Users` (`synchronize`, sin migración).
- **Verificación:** `npm run test` ✅ (274/274, 5 nuevos) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 2 a 6 de HU-006.

### 2026-10-16 — chore(HU-001): `npm audit fix` sin `--force`
- **Archivos:** `package-lock.json`
- **Qué:** se actualizan dependencias transitivas dentro de los rangos de `package.json` (sin saltos de versión mayor): `@nestjs/platform-express` 12.1.3, `proxy-addr`, `multer`, `handlebars`, `fast-uri`, `source-map-js`, `brace-expansion`. `package.json` no cambia.
- **Por qué:** `npm audit` reportaba 35 vulnerabilidades (2 críticas, 9 altas). Decisión de la persona: arreglar solo sin `--force`.
- **Impacto:** ninguno en endpoints, BD ni variables de entorno. Dependencias de producción: `npm audit --omit=dev` → 0 vulnerabilidades.
- **Verificación:** `npm run test` ✅ (269/269) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** quedan 28 (2 bajas, 21 moderadas, 5 altas), todas en dependencias de desarrollo y solo arreglables con `--force` o quitando paquetes: `ts-node-dev` (`chokidar`/`braces`, sin arreglo), `@nestjs/mau` (`tmp`, `undici`; arreglo = bajar a 0.0.6) y `jest`/`ts-jest` (moderadas; el proyecto usa Vitest). Propuesta: quitar `jest`, `ts-jest`, `@types/jest` y `ts-node-dev` si nada los usa.

### 2026-10-15 — docs: backlog oficial en PDF
- **Archivos:** `docs/Historia de usuario NodeJS Multicine Riwi (1).pdf`
- **Qué:** se versiona el PDF original del backlog (HU-001 a HU-029). La fuente de verdad para trabajar sigue siendo `docs/historias-de-usuario.md` (transcripción de HU-001 a HU-010).
- **Por qué:** decisión de la persona: tener el documento original en el repo.
- **Impacto:** ninguno en código.
- **Verificación:** no aplica (solo documentación).
- **Pendiente derivado:** ninguno.

### 2026-10-15 — feat(HU-005): próximos estrenos y solicitud de notificación
- **Archivos:** `src/modules/movie/{movie.dao,movie.service,movie.controller,movie.module}.ts` y specs de dao, service y controller, `src/modules/notification/{release-notification.entity,release-notification.dao,upcoming-notification.dto,notification.service,notification.controller,notification.module}.ts` y sus specs (`release-notification.dao.spec.ts`, `upcoming-notification.dto.spec.ts`, `notification.service.spec.ts`, `notification.controller.spec.ts`), `src/common/enums/domain.enums.ts` (`NotificationStatus`), `src/database.ts`, `src/seeders/seed.ts`, `agent.md` (§5.1), `memory.md`.
- **Qué:** `GET /api/movies/upcoming` y `/upcoming/:id` (públicos; `ParseIntPipe`; declarados tras `today` y antes de `:id/functions` y `:id`) con `daysUntilRelease`. `POST /api/notifications/upcoming` (JWT, 201) registra una solicitud `PENDING` por usuario y película; duplicado → 409 vía índice único y `23505`. `MovieDao` gana `findUpcoming`/`findUpcomingById`; `MovieModule` exporta `MovieDao`. Tabla nueva `ReleaseNotifications`. Seed ampliado con `releaseDays` y dos películas nuevas.
- **Por qué:** HU-005 (próximos estrenos ordenados, contador regresivo, solicitud sin duplicados RN-019).
- **Impacto:** rutas nuevas (las de `movies` sin token; `POST /notifications/upcoming` con token); tabla nueva por `synchronize` (sin migración); sin variables de entorno nuevas. Decisiones 1–9 del plan registradas arriba en Decisiones.
- **Verificación:** `npm run test` ✅ (269/269, 38 nuevos) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** RN-020 (correo y `@Cron`) con HU-006; prueba manual de HU-005.

### 2026-10-15 — feat(HU-004): detalle de película, funciones futuras y recomendaciones
- **Archivos:** `src/modules/movie/{movie.entity,movie.service,movie.controller,movie.module}.ts` y specs de service y controller, `src/modules/movie/{movie.dao,movie-city-query.dto}.ts` y sus specs (nuevos), `src/modules/showtime/{showtime.entity,showtime.dao}.ts` y `showtime.dao.spec.ts`, `src/seeders/seed.ts`, `agent.md` (§5.1 fila HU-003/004/005), `memory.md`.
- **Qué:** endpoints públicos `GET /api/movies/:id`, `/:id/functions` y `/:id/recommendations` (`:id` con `ParseIntPipe`; `?cityId=` opcional en detalle y funciones), declarados tras `weekly` y `today`. Detalle: datos base + `synopsis`, `cast`, `bannerUrl`, `trailerUrl`, `formats`, `languages`, `prices` (mínimo por formato) y `showtimes` futuras. `Movie` gana `synopsis`, `cast`, `bannerUrl`, `trailerUrl`; `Showtime` gana `price`. El service extrae `toShowtime`/`toMovieBase` (también usados por la cartelera: cada función de HU-003 ahora trae `price`). Seed con `refresh`, textos, imágenes, tráiler, precios y dos películas nuevas.
- **Por qué:** HU-004 (detalle completo, funciones futuras RN-014/RN-015, recomendaciones).
- **Impacto:** rutas nuevas sin token; columnas nuevas en `Movies` y `Showtimes` (`synchronize` las crea; sin migración); campo `price` nuevo en las funciones de la cartelera; sin variables de entorno nuevas. Nota: `npx prettier` sin `--config .prettierrc.json` usa `.prettierrc` (80 columnas) y reformatea; usar el JSON (100).
- **Verificación:** `npm run test` ✅ (231/231, 33 nuevos) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** prueba manual de HU-004; HU-005 debe declarar `upcoming/:id` antes de `:id`.

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
