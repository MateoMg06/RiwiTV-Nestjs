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
| HU-005 | Completa salvo prueba manual | Entidad `ReleaseNotification` (tabla `ReleaseNotifications`, único `(userId, movieId)`); `GET /movies/upcoming` y `/movies/upcoming/:id` (públicos, orden por fecha, `daysUntilRelease`); `POST /notifications/upcoming` (JWT, 201, sin duplicados RN-019); seed con estrenos próximos y uno vencido; RN-020: `ReleaseNotificationJob` (cada hora) envía el correo (emulado sin `SMTP_HOST`) a las solicitudes `PENDING` de películas `ACTIVE` y las pasa a `SENT` | Prueba manual contra Postgres |
| HU-006 | Completa salvo prueba manual | Captcha, registro transaccional (usuario + membresía **Activa** con código `RTV-XXXXXXXXXX`), BCrypt, contraseña ≥10 con complejidad (DTO y validador), `gender`/`favoriteCinemaId`, correo de activación (emulado sin `SMTP_HOST`), `POST /auth/verify-email` (+ alias `/activate`), `POST /membership/create` (JWT) | Prueba manual contra Postgres. El perfil es solo `User` (sin Profile, historial, billetera ni preferencias: decisión de la persona) |
| HU-007 | Completa salvo prueba manual | JWT 15 min, refresh 7 d en BD, **una sola sesión viva** (RN-030: cada login revoca las previas), logout, bloqueo 15 min tras 5 intentos (un fallo con el bloqueo vigente no lo prolonga), solo cuentas activas, cookies; login con `membership` (con `level`), `benefits` por nivel (HU-008) y `user`; `POST /auth/forgot-password` y `/reset-password`; auditoría `AccessAudits` (login, login fallido, bloqueo, reset) con IP y user-agent | Prueba manual contra Postgres. No se auditan refresh, logout ni activación (decisión) |
| HU-008 | Completa salvo prueba manual | `GET /membership` (código, estado, nivel, QR = código, `createdAt`) y `GET /membership/benefits` (nivel, descuento RN-032 BRONCE 0/PLATA 5/ORO 10/PLATINO 15, beneficios, `bonuses: []`); `Memberships.level`; login con beneficios reales; `GET /profile` y `PUT /profile` (nombre, apellido, teléfono, género, foto https opcional, preferencia de notificaciones); cambio de correo con verificación (`pendingEmail`, RN-034); módulo `profile` | Prueba manual contra Postgres. `purchaseHistory`, `activeReservations` y `bonuses` son `[]` provisionales (sin fuentes: reservas HU-010, compras fuera de alcance). Sin cambio de nivel, sin imagen QR ni subida de archivos, sin reenvío del correo de verificación |
| HU-009 | Completa salvo prueba manual | `GET /functions/:id` (función con `movie` resumida, cine, formato, idioma, audio, sala, status y `price`) y `GET /functions/:id/prices` (`{functionId, format, roomType, startsAt, status, price}`), públicos; solo funciones futuras (RN-035), no `CANCELLED`, de película `ACTIVE` y cine activo; `SOLD_OUT` responde 200 con su status; `ShowtimeService`, `FunctionsController`, `ShowtimeDao.findSelectableById`, mapper compartido | Prueba manual contra Postgres. Sin `availableSeats` (sillas = HU-010); sin descuento de membresía ni promociones (RN-032 se aplica en la compra, fuera de alcance) |
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
- Sesiones en tabla `Sessions` (**una sesión viva por usuario**, RN-030: cada login revoca las previas; decisión de la persona, 2026-10-16), refresh token guardado como SHA-256. Los access tokens previos siguen válidos hasta 15 min (son JWT sin consulta a BD): **avisar al frontend** de que un login en otro dispositivo cierra la sesión del anterior al renovar (`refresh` → 401).
- HU-007: forgot-password responde siempre 200 con el mismo mensaje (exista, esté inactiva o no el correo); el correo se envía sin `await` y un fallo solo se loguea (sin token). El reset exitoso anula el token (un solo uso), revoca todas las sesiones y **no** limpia `lockedUntil`/`failedLoginAttempts`. Variable nueva `RESET_TOKEN_EXPIRES_IN` (default `1h`, vía `TokenExpiry`). Sin rate limiting nuevo (ver Pendientes).
- HU-007: auditoría de accesos en la tabla `AccessAudits` (`userId` nullable sin relación, `email`, `event`, `ip`, `userAgent`, `createdAt`; nunca contraseñas ni tokens). Eventos: `LOGIN_SUCCESS`, `LOGIN_FAILED` (credenciales inválidas, cuenta inactiva o bloqueada), `ACCOUNT_LOCKED` (además de `LOGIN_FAILED` en el intento que bloquea) y `PASSWORD_RESET`. **Fail-open**: si guardar falla, `logger.error` (sin datos sensibles) y el flujo sigue. **No se auditan** refresh, logout, solicitud de reset ni activación (decisión de la persona; el original sí, `agent.md` §1.2 lo menciona).
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

- HU-009: `/functions/:id/prices` devuelve **solo el precio de lista** (`Showtime.price`), sin descuento de membresía (RN-032 se aplica en la compra, fuera de alcance). RN-038 (recálculo) se cumple calculando en cada petición, sin caché. `Showtime.price` ya es por función (formato, sala y hora, RN-037), así que no hay desglose. No se toca el AuthGuard (rutas `@Public()`).
- HU-009: disponibilidad = solo `status` (`ACTIVE`/`SOLD_OUT`); sin `availableSeats` (sillas = HU-010). 404 «Función no encontrada» para inexistente, cancelada, ya iniciada (RN-035), cine inactivo o película no `ACTIVE`; `SOLD_OUT` → 200. `roomType` se devuelve tal cual.
- HU-009: no hay endpoint de funciones hermanas: `GET /movies/:id/functions` (HU-004) ya lista las demás funciones de la película.
- HU-005: RN-020 (correo automático) queda **pendiente hasta HU-006**: hoy solo se registran solicitudes `PENDING`; no hay job, evento ni envío. `NotificationStatus` solo tiene `PENDING` (§4.1); `SENT` se añade con el envío.
- HU-005 / RN-020 (actualiza la decisión anterior): disparador = basta `Movie.status = ACTIVE` (RN-020 literal), sin exigir funciones en la ciudad; el filtro por ciudad (`cityId` de la solicitud) queda fuera. Frecuencia: `CronExpression.EVERY_HOUR`, zona horaria del proceso (`TZ=America/Bogota`). Correo emulado vía `MailService`. Sin `sentAt`, sin `FAILED`, sin endpoint para lanzar el job, sin colas. Lote de 200 solicitudes por ejecución (`limit`), envío secuencial. Riesgo aceptado: si `markSent` falla tras enviar el correo, la solicitud sigue `PENDING` y se reenvía en la siguiente ejecución. Limitación: pensado para una sola instancia (con varias, el correo podría duplicarse). `ReleaseNotificationDao.findPendingForActiveMovies` cruza `Movie` y `User` (excepción a «solo su entidad», precedente `ShowtimeDao`: columnas planas, una consulta, sin N+1).
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

- HU-008: descuentos por nivel BRONCE 0 / PLATA 5 / ORO 10 / PLATINO 15 en `DISCOUNT_BY_LEVEL` (constante única, decisión de la persona); toda membresía nace BRONCE y no hay endpoint de cambio de nivel. El QR es solo el contenido (`qr.payload` = código único); el frontend dibuja la imagen. Se eliminó `User.membership` y el enum `Membership` (BASICA/PLATA).
- HU-008: la foto es una URL https (máx. 500) en `User.photoUrl`, `null` la quita; no hay subida de archivos. `favoriteCinemaId` y `cityId` no se editan en `PUT /profile` (`cityId` solo por `/users/location`, RN-006).
- HU-008 / RN-034: **modo correo pendiente** (decisión de la persona; no se desactiva la cuenta). El correo nuevo va a `pendingEmail` y se verifica con el mismo token y endpoint de activación (`verify-email`/`activate`, SHA-256, 24 h); hasta confirmar, `email`, `accountStatus` y las sesiones no cambian y el login sigue con el correo viejo. No hay endpoint de reenvío (se repite el `PUT /profile`). Si el correo se ocupa antes de verificar → 409.

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
- [x] HU-005 / RN-020: `NotificationStatus.SENT`, `MailService.sendReleaseNotice` y `ReleaseNotificationJob` (`@nestjs/schedule`). Una BD ya creada necesita `ALTER TYPE "ReleaseNotifications_status_enum" ADD VALUE 'SENT';` o recrearse.
- [ ] HU-005 / RN-020: prueba manual: `npm run build && npm run seed`, login y `POST /api/notifications/upcoming` sobre un estreno (queda `PENDING`), luego `UPDATE "Movies" SET status='ACTIVE' WHERE id=<id>;`, esperar al cron (hora en punto) y comprobar el log «Correo emulado» y `status = 'SENT'` en `ReleaseNotifications`.
- [ ] HU-005: prueba manual contra Postgres (`npm run build && npm run seed`; la tabla `ReleaseNotifications` la crea `synchronize`). Consultas: `GET /api/movies/upcoming` (orden: Última Frontera +3, Corazón de Barrio +10, El Regreso del Rey +30; sin «Estreno Vencido»), `/upcoming/<id>` (`daysUntilRelease`), `/upcoming/<id de Estreno Vencido o película activa>` (→ 404), `/upcoming/abc` (→ 400); con JWT `POST /api/notifications/upcoming` `{"movieId":<id>}` (201), repetido (409), `{"movieId":<activa>}` (404), `{"movieId":<id>,"cityId":9999}` (404), sin token (401).
- [x] HU-006: registro transaccional con membresía Activa, correo de activación (emulado), `POST /auth/verify-email`, `POST /membership/create`, contraseña mínima 10.
- [ ] HU-006: prueba manual contra Postgres (`Memberships` y las columnas nuevas de `Users` las crea `synchronize`): `GET /api/auth/captcha` y `POST /api/auth/register` (201 con `membership.code`; el log muestra «Correo emulado» con el enlace), `POST /api/auth/verify-email` `{"token":…}` (200) y repetido (400), login, `POST /api/membership/create` con JWT (409, ya tiene), sin token (401), contraseña de 9 caracteres (400).
- [ ] HU-006: para probar SMTP real, definir `SMTP_HOST` y compañía en el `.env`.
- [ ] HU-006: no se validan `cityId` ni `favoriteCinemaId` inexistentes en el registro (el `cityId` ya falla por FK; `favoriteCinemaId` no tiene relación).
- [x] HU-008: el enum `Membership` (BASICA/PLATA) y `User.membership` se eliminaron; los niveles viven en `Memberships.level`.
- [x] HU-007: RN-030 (una sesión viva), login con membresía, `POST /auth/forgot-password` y `/reset-password` (el token vive en columnas de `User`, `resetToken`/`resetTokenExpires`: no hace falta tabla `PasswordResetToken`).
- [x] HU-007: auditoría de accesos (`AccessAudits`).
- [x] HU-007: `benefits` reales en el login (HU-008 paso 3).
- [ ] HU-007: prueba manual contra Postgres (la tabla `AccessAudits` y el enum la crea `synchronize`): login correcto (200 con `membership`/`benefits`), 5 fallos seguidos (401 y luego 403 con contraseña correcta; filas `LOGIN_FAILED` y `ACCOUNT_LOCKED`), segundo login (el refresh del primero da 401), `forgot-password` (el log emulado muestra el enlace) y `reset-password` (200; reuso 400), comprobar filas en `AccessAudits` con `ip`/`userAgent`.
- [ ] HU-007 (propuesta, no implementada): rate limiting en `POST /auth/forgot-password` (riesgo: spam de correos a una víctima y carga de SMTP). `agent.md` §4.2 lo deja fuera; decidir con el equipo.
- [x] HU-008: `GET`/`PUT /profile`, `GET /membership`, `/membership/benefits`, cambio de correo con nueva validación.
- [ ] HU-008: `purchaseHistory` y `activeReservations` (perfil) y `bonuses` (beneficios) devuelven `[]`; rellenarlos cuando existan reservas (HU-010) y compras/bonos (fuera de alcance).
- [ ] HU-008: prueba manual contra Postgres (`Users.photoUrl`, `Users.pendingEmail` y `Memberships.level` los crea `synchronize`; se borra `Users.membership`): `GET /api/membership` y `/benefits` (200; 404 sin membresía), `GET /api/profile`, `PUT /api/profile` con nombre/foto https/`acceptsNotifications` (200), con `role` o `cityId` (400), con `email`+`confirmEmail` nuevo (200, `emailVerificationRequired`, el log emulado muestra el enlace), `POST /api/auth/verify-email` con ese token (el `GET /profile` ya muestra el correo nuevo) y con el correo ya tomado (409).
- [ ] HU-006/HU-007/HU-008: la comparación de correos distingue mayúsculas en `UserDao.findByEmail` y en el índice único de `Users.email` (`Ana@x.com` ≠ `ana@x.com`): afecta registro, login, forgot-password y cambio de correo. Decidir si se normaliza a minúsculas (no corregido).
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
8. [x] `AuthPayload` declara `name`/`membership` que el token no trae. Resuelto: `AuthPayload` queda con `id`, `role` y `email?` (quitados `name`, `membership`, `cityId`; sin usos).
9. [ ] Credenciales de ejemplo de ObserveModule en `app.module.ts`; nombres de variables inconsistentes en `.env.example`.
10. [ ] Captcha en memoria (no escala; limpieza nunca se ejecuta).
11. [ ] Sin migraciones (`synchronize: true`).
12. [ ] Swagger con datos de relleno y puerto 3000 fijo en el log.
13. [ ] `tsconfig.build.tsbuildinfo` versionado.
14. [x] `.env.example` con secretos que parecen reales (JWT, Observe, `SEED_API_KEY`): reemplazar y rotar.
15. [x] Email no implementado (nodemailer instalado sin uso). Resuelto en HU-006 con `MailService` (correo de activación; emulado si no hay `SMTP_HOST`).
16. [x] `agent.md` §2 y §4 dicen ESM / `import.meta.dirname`, pero desde `35c326d` el proyecto es CommonJS (`__dirname` es válido).
17. [x] HU-007 RN-030: el login no invalida el refresh token anterior; `Sessions` permite N sesiones simultáneas — `src/modules/auth/auth.service.ts`. Resuelto: `login()` llama a `revokeAllSessions` antes de emitir tokens.
18. [x] HU-007: la respuesta de login no incluye membresía, beneficios ni datos del perfil — `src/modules/auth/auth.service.ts`. Resuelto: `LoginResponse` con `membership`, `benefits: []` (provisional hasta HU-008) y `user`.
19. [x] HU-006: el token de activación se guardaba **en claro** (`User.activationToken`); `agent.md` §4.8 exige SHA-256. Resuelto: `register` guarda `hashToken(token)` y `activate` busca por el hash — `auth.service.ts`, `user.dao.ts`.

## Registro de cambios

### 2026-10-16 — feat(HU-009): `GET /functions/:id` y `/prices` (paso 4 de 4)
- **Archivos:** `src/modules/showtime/functions.controller.ts`, `functions.controller.spec.ts`, `showtime.module.ts`, `agent.md` (§5.1 fila HU-009), `memory.md`.
- **Qué:** `FunctionsController` (`@Controller('functions')`) con `GET :id` y `GET :id/prices`, ambos `@Public()` y con `ParseIntPipe` (`/abc` → 400). Registrado en `ShowtimeModule.controllers`. No hay dependencia circular: `MovieModule` importa `ShowtimeModule` y este no importa nada.
- **Por qué:** cierra HU-009.
- **Impacto:** dos rutas públicas nuevas; sin cambios de BD ni de variables de entorno.
- **Prueba manual pendiente (con seed, `npm run build && npm run seed`, app arriba):** función futura → 200 en `/api/functions/:id` y `/prices`; función de ayer → 404; `CANCELLED` → 404; función en «Multicine Riwi Cerrado» → 404; función de película `INACTIVE`/`UPCOMING` → 404; id inexistente → 404; `/api/functions/abc` → 400; la `SOLD_OUT` → 200 con `status: SOLD_OUT`.
- **Verificación:** `npm run test` ✅ (435/435) · `npm run lint` ✅ · `npm run build` ✅
### 2026-10-16 — feat(HU-009): `ShowtimeService` (paso 3 de 4)
- **Archivos:** `src/modules/showtime/showtime.service.ts`, `showtime.service.spec.ts`, `showtime.module.ts`, `memory.md`.
- **Qué:** `getById(id)` → `{ ...toShowtime(s), movie: { id, name, duration, classification, posterUrl } }`; `getPrices(id)` → `{ functionId, format, roomType, startsAt, status, price }` (precio de lista, `Number`). Ambos pasan por `findSelectableOrFail` → 404 «Función no encontrada». Registrado en `ShowtimeModule` (sin export; solo lo usa el controller del paso 4).
- **Por qué:** HU-009.
- **Impacto:** ninguno todavía en la API.
- **Verificación:** `npm run test` ✅ (428/428) · `npm run lint` ✅ · `npm run build` ✅
### 2026-10-16 — feat(HU-009): `ShowtimeDao.findSelectableById` (paso 2 de 4)
- **Archivos:** `src/modules/showtime/showtime.dao.ts`, `src/modules/showtime/showtime.dao.spec.ts`, `memory.md`.
- **Qué:** consulta única (`innerJoinAndSelect` de película y cine, `getOne`) con `showtime.id`, película `ACTIVE`, función `<> CANCELLED` (SOLD_OUT incluida), cine activo y `startsAt > ahora` (RN-035). `null` si no hay fila.
- **Por qué:** base de `GET /functions/:id` y `/prices`.
- **Impacto:** ninguno todavía en la API.
- **Verificación:** `npm run test` ✅ (421/421) · `npm run lint` ✅ · `npm run build` ✅
### 2026-10-16 — refactor(HU-009): mapper de funciones compartido (paso 1 de 4)
- **Archivos:** `src/modules/showtime/showtime.mapper.ts` (nuevo), `src/modules/movie/movie.service.ts`, `src/modules/auth/auth.service.ts`, `memory.md`.
- **Qué:** `WeeklyShowtime` y `toShowtime` pasan de `movie.service.ts` a `showtime.mapper.ts`; `MovieService` los importa. Sin cambio de comportamiento. Además, el comentario de `DEFAULT_RESET_EXPIRY` en `auth.service.ts` decía «token JWT de restablecimiento» pero el token es aleatorio (`randomBytes`) guardado como SHA-256; ahora dice «Vigencia por defecto del token de restablecimiento de contrasena.».
- **Por qué:** HU-009 reutiliza el mapper en `ShowtimeService`.
- **Impacto:** ninguno en API, BD ni variables de entorno.
- **Verificación:** `npm run test` ✅ (417/417) · `npm run lint` ✅ · `npm run build` ✅
### 2026-10-16 — refactor(HU-008): limpieza de auth y cancelación de correo pendiente
- **Archivos:** `src/modules/auth/auth.service.ts`, `src/modules/profile/profile.service.ts`, `src/modules/profile/profile.service.spec.ts`, `memory.md`.
- **Qué:** (1) comentario huérfano sobre `DEFAULT_RESET_EXPIRY` reemplazado por uno correcto. (2) Se elimina el método privado `AuthService.hashToken`; se usa `hashToken` de `common/utils/token-hash.ts` directamente (los tests no lo espiaban). (3) `PUT /profile` con un `email` igual al actual (sin distinguir mayúsculas) y un `pendingEmail` previo cancela el cambio: `pendingEmail`, `activationToken` y `activationTokenExpires` pasan a `null`; sin `emailVerificationRequired` ni correo. Las cuentas INACTIVE no llegan aquí (PUT exige JWT y el login exige ACTIVE), así que no afecta la activación de registro.
- **Por qué:** revisión de HU-008 (RN-034): un cambio de correo pendiente no se podía descartar.
- **Impacto:** `PUT /api/profile`; sin cambios de BD ni de variables de entorno.
- **Verificación:** `npm run test` ✅ (417/417) · `npm run lint` ✅ · `npm run build` ✅
- **Pendiente derivado:** correos sensibles a mayúsculas (ver Pendientes).
### 2026-10-16 — feat(HU-008): cambio de correo con nueva validación, RN-034 (paso 6 de 6)
- **Archivos:** `src/modules/profile/{update-profile.dto,profile.service,profile.controller}.ts` (+specs), `src/modules/auth/auth.service.ts` (+spec), `src/modules/user/{user.entity,user.service}.ts`, `src/common/utils/token-hash.ts`, `agent.md`, `memory.md`.
- **Qué:** `User.pendingEmail` (varchar nullable, visible en `GET /profile`). `PUT /profile` acepta `email` + `confirmEmail` (deben coincidir, si no 400 «Correos no coinciden», el mismo mensaje de `UserService`). Si el correo difiere del actual (sin distinguir mayúsculas): `UserService.assertEmailIsFree` (ahora público, sin duplicar) da 409 si lo usa otro; se genera token (`randomBytes(32)`), se guarda su SHA-256 en `activationToken` con 24 h y el correo nuevo en `pendingEmail`; **`email`, `accountStatus` y las sesiones no cambian**. `MailService.sendActivation(pendingEmail, …)` va sin await y un fallo se loguea sin token. Respuesta: perfil + `emailVerificationRequired: true`. Correo igual al actual: se ignora. `AuthService.activate`: si el usuario tiene `pendingEmail`, pone `email = pendingEmail`, limpia `pendingEmail` y el token, conserva `accountStatus`; si el correo quedó tomado (comprobación o error 23505) → 409 «No se pudo verificar el correo» sin cambios. Sin `pendingEmail`, la activación es la de siempre. `hashToken` y `ACTIVATION_TTL_MS` pasan a `common/utils/token-hash.ts` (los usan `AuthService` y `ProfileService`).
- **Por qué:** RN-034 (cambiar el correo exige nueva validación).
- **Impacto:** columna `Users.pendingEmail` (la crea `synchronize`). El enlace de verificación es el mismo `/verify-email?token=…`. **Avisar al frontend:** tras `PUT /profile` con correo nuevo, mostrar «revisa tu correo»; el login sigue con el correo viejo hasta verificar.
- **Verificación:** `npm run test` ✅ (416/416) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** prueba manual de HU-008; sin endpoint de reenvío del correo de verificación (si caduca, se repite el `PUT`).

### 2026-10-16 — feat(HU-008): `PUT /profile` sin cambio de correo (paso 5 de 6)
- **Archivos:** `src/modules/profile/{update-profile.dto,profile.service,profile.controller}.ts` (+specs), `memory.md`.
- **Qué:** `PUT /profile` (JWT, 200) con `UpdateProfileDto` = `name`, `lastName`, `phone`, `gender` (PartialType/PickType de `CreateUserDto`, mismos validadores), `photoUrl?` (`@IsUrl` solo https, máx. 500, `null` la quita) y `acceptsNotifications?`. El service solo escribe los campos que llegan (sin campos no hace UPDATE) y devuelve el perfil. `role`, `accountStatus`, `password`, `membership`, `level`, `cityId` (solo `/users/location`, RN-006), `favoriteCinemaId`, `birthDate` y documento dan 400 por `forbidNonWhitelisted`.
- **Por qué:** HU-008 (actualizar datos y preferencias de notificación).
- **Impacto:** endpoint nuevo. Observación: con `enableImplicitConversion` global, un valor no booleano en `acceptsNotifications` (p. ej. `"si"`) se convierte a `true` antes de validar; es comportamiento previo del `ValidationPipe`, no se tocó.
- **Verificación:** `npm run test` ✅ (404/404) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** paso 6 (correo).

### 2026-10-16 — feat(HU-008): `GET /profile` (paso 4 de 6)
- **Archivos:** `src/modules/profile/{profile.controller,profile.service,profile.module}.ts` (+specs de service y controller), `src/modules/user/user.entity.ts`, `src/app.module.ts`, `memory.md`.
- **Qué:** módulo nuevo `profile` (importa `UserModule` y `MembershipModule`, sin ciclos). `GET /profile` (JWT) → `{ id, name, lastName, email, phone, documentType, documentNumber, birthDate, gender, cityId, favoriteCinemaId, photoUrl, preferences: { acceptsNotifications }, membership: { code, level, status } | null, purchaseHistory: [], activeReservations: [] }`. 401 sin token, 404 usuario inexistente. Proyección campo a campo: nunca password, role, accountStatus, tokens, lockedUntil ni failedLoginAttempts. `User.photoUrl` varchar(500) nullable.
- **Por qué:** HU-008 (perfil con foto opcional, nivel, historial de compras y reservas activas).
- **Impacto:** endpoint nuevo; columna `Users.photoUrl` (la crea `synchronize`). `purchaseHistory` y `activeReservations` son `[]` **provisionales**: no existen tablas de compras ni reservas (las reservas son HU-010; compras, fuera de alcance).
- **Verificación:** `npm run test` ✅ (380/380) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 5 y 6; poblar `purchaseHistory`/`activeReservations` cuando existan sus fuentes.

### 2026-10-16 — feat(HU-008): login con beneficios reales (paso 3 de 6)
- **Archivos:** `src/modules/auth/auth.service.ts`, `src/modules/auth/interfaces/auth-response.interface.ts` (+ specs de service y controller), `memory.md`.
- **Qué:** `LoginResponse.membership` → `{ code, status, level } | null` y `benefits: Benefit[]` calculado con `benefitsFor(level)` (el mismo que `/membership/benefits`); sin membresía, `[]`.
- **Por qué:** HU-007 pedía beneficios activos en el login; quedaban provisionales hasta HU-008.
- **Impacto:** contrato del login: `membership.level` nuevo y `benefits` ya no es siempre `[]` (**avisar al frontend**).
- **Verificación:** `npm run test` ✅ (373/373) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 4 a 6.

### 2026-10-16 — feat(HU-008): `GET /membership` y `GET /membership/benefits` (paso 2 de 6)
- **Archivos:** `src/modules/membership/membership.{controller,service}.ts` (+specs), `memory.md`.
- **Qué:** `GET /membership` (JWT) → `{ code, status, level, qr: { payload: code }, createdAt }`; `GET /membership/benefits` (JWT) → `{ level, discountPercent, benefits, bonuses: [] }`. 404 «El usuario no tiene membresía». La identidad sale de `request.user.id` (401 si falta). El QR es solo el contenido (el código único, RN-033), sin dependencia ni imagen.
- **Por qué:** HU-008 (QR de membresía, nivel, descuentos por nivel).
- **Impacto:** dos endpoints nuevos. `bonuses` = `[]` provisional: no existe billetera de bonos (HU-006, decisión de la persona; los bonos reales son de HU-010 / fuera de alcance).
- **Verificación:** `npm run test` ✅ (373/373) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 3 a 6.

### 2026-10-16 — feat(HU-008): niveles de membresía y descuentos; se elimina `User.membership` (paso 1 de 6)
- **Archivos:** `src/common/enums/domain.enums.ts`, `src/modules/user/user.entity.ts`, `src/modules/membership/membership.entity.ts`, `src/modules/membership/membership-benefits.ts` (+spec), `memory.md`.
- **Qué:** enum `MembershipLevel` (BRONCE, PLATA, ORO, PLATINO); se elimina el enum `Membership` (BASICA/PLATA) y la columna `Users.membership`. `Memberships.level` (enum, default BRONCE). `membership-benefits.ts`: `DISCOUNT_BY_LEVEL` (0/5/10/15, RN-032), `discountFor`, tipo `Benefit` y `benefitsFor(level)` (se usará en `/membership/benefits` y en el login).
- **Por qué:** HU-008 (nivel y descuentos por nivel). Resuelve el pendiente sobre el enum `Membership`.
- **Impacto:** BD: `synchronize` **borra la columna `Users.membership`** (y su enum) y añade `Memberships.level` con BRONCE para las filas existentes. Sin cambios de endpoints.
- **Verificación:** `npm run test` ✅ (367/367) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 2 a 6.

### 2026-10-16 — fix(HU-006): token de activación guardado como SHA-256 (bug #19)
- **Archivos:** `src/modules/auth/auth.service.ts` (+spec), `src/modules/user/user.dao.ts` (comentario y parámetro de `findByActivationToken`), `memory.md`.
- **Qué:** `register` persiste `hashToken(token)` en `activationToken` (reutiliza el `hashToken` privado de `AuthService`). El correo (`MailService.sendActivation`) y la respuesta `activationToken?` (solo fuera de producción) siguen llevando el token en claro. `activate`/`verify-email` busca con `findByActivationToken(hashToken(token))`. El log del token en `register` sigue siendo solo fuera de producción.
- **Por qué:** bug #19; `agent.md` §4.8 (tokens de servidor como SHA-256).
- **Impacto:** sin cambios de contrato HTTP ni esquema. **Los tokens de activación pendientes generados antes de este cambio dejan de funcionar** (están en claro en BD): en desarrollo, volver a registrar la cuenta o recrear la BD.
- **Verificación:** `npm run test` ✅ (362/362) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** ninguno.

### 2026-10-16 — fix(HU-007): consumo atómico del token de restablecimiento
- **Archivos:** `src/modules/user/user.dao.ts` (+spec), `src/modules/auth/auth.service.ts` (+spec), `memory.md`.
- **Qué:** `resetPassword` ya no hace un UPDATE sin condición tras leer el usuario. Nuevo `UserDao.consumeResetToken(id, hash, passwordHash)`: un solo `UPDATE ... WHERE id = :id AND resetToken = :hash AND resetTokenExpires > :now` que guarda la contraseña y pone `resetToken`/`resetTokenExpires` a null; devuelve `affected === 1`. Si da `false` → 400 «Token de restablecimiento inválido o expirado», sin revocar sesiones ni auditar `PASSWORD_RESET`.
- **Por qué:** hallazgo del revisor: dos peticiones simultáneas con el mismo token podían pasar ambas (lectura y escritura separadas).
- **Impacto:** ninguno en el contrato HTTP; sin cambios de BD ni variables.
- **Verificación:** `npm run test` ✅ (360/360) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** ninguno.

### 2026-10-16 — feat(HU-007): auditoría de accesos con IP y dispositivo (paso 6 de 6)
- **Archivos:** `src/common/enums/domain.enums.ts` (`AccessEvent`), `src/modules/auth/entities/access-audit.entity.ts`, `src/modules/auth/access-audit.dao.ts` (+spec), `src/modules/auth/auth.module.ts`, `src/database.ts` (entidad registrada; Prettier reformateó también líneas ya existentes del archivo), `src/modules/auth/auth.service.ts` (+spec), `agent.md` (§1.2, §5.1), `memory.md`.
- **Qué:** tabla `AccessAudits` (`id`, `userId` int nullable con índice, `email`, `event` enum, `ip`, `userAgent`, `createdAt`; sin relaciones). `AuthService.audit()` privado y fail-open. `LOGIN_SUCCESS` al terminar el login; `LOGIN_FAILED` en credenciales inválidas, cuenta inactiva y cuenta bloqueada con contraseña correcta; `ACCOUNT_LOCKED` cuando se fija `lockedUntil` (`registerFailedAttempt` ahora devuelve si bloqueó); `PASSWORD_RESET` en `resetPassword` (usa el `context` ya recibido).
- **Por qué:** HU-007 (auditoría de accesos con IP y dispositivo).
- **Impacto:** tabla y enum nuevos (los crea `synchronize`); sin endpoints ni variables nuevas. No se auditan refresh, logout ni activación (decisión).
- **Verificación:** `npm run test` ✅ (357/357) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** prueba manual de HU-007; `benefits` reales con HU-008.

### 2026-10-16 — feat(HU-007): `POST /auth/forgot-password` y `/reset-password` (paso 5 de 6)
- **Archivos:** `src/modules/auth/dto/{forgot-password.dto,reset-password.dto,reset-password.dto.spec}.ts`, `src/modules/user/user.dao.ts` (+spec), `src/common/utils/mail.ts` (+spec), `src/modules/auth/auth.service.ts` (+spec), `src/modules/auth/auth.controller.ts` (+spec), `.env.example`, `agent.md` (§5.1), `memory.md`.
- **Qué:** `forgotPassword(email)`: si el usuario existe y está ACTIVE, genera `randomBytes(32).hex`, guarda su SHA-256 y la expiración (`RESET_TOKEN_EXPIRES_IN`, 1 h por defecto) y envía el correo sin `await` (`.catch` que loguea sin token); la respuesta es siempre `{ message }` igual. `resetPassword(dto, context)`: 400 «Contraseñas no coinciden», 400 «La contraseña no cumple con los parámetros requeridos» (`Password.validatePassword`), 400 «Token de restablecimiento inválido o expirado»; guarda bcrypt, pone `resetToken`/`resetTokenExpires` a null y revoca todas las sesiones; responde `{ message: 'Contraseña actualizada' }`. `UserDao.findByResetTokenHash` (`addSelect` de las dos columnas). `MailService.sendPasswordReset` (enlace `${FRONTEND_URL}/reset-password?token=…` solo en el log emulado fuera de producción). Ambas rutas `@Public()` y `@HttpCode(200)`. `context` se recibe ya pero se usa en el paso 6 (auditoría).
- **Por qué:** HU-007 (recuperación de contraseña).
- **Impacto:** dos endpoints públicos nuevos; variable `RESET_TOKEN_EXPIRES_IN=1h` (en `Config` desde antes y ahora en `.env.example`). El frontend necesita la pantalla `/reset-password?token=…`.
- **Verificación:** `npm run test` ✅ (350/350) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** auditoría (paso 6); rate limiting de forgot-password (propuesta); bug #19 (token de activación en claro).

### 2026-10-16 — fix(HU-007): un fallo con el bloqueo vigente no lo prolonga; tests RN-027/028/029/031 (paso 4 de 6)
- **Archivos:** `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.service.spec.ts`, `memory.md`.
- **Qué:** en `login()`, si `lockedUntil` está en el futuro y la contraseña es incorrecta, no se llama a `registerFailedAttempt` (no suma intentos ni reajusta el bloqueo); sigue el 401 genérico. Con contraseña correcta y bloqueo vigente se mantiene el 403. Tests: RN-027 (5.º fallo bloquea 15 min; fallo durante el bloqueo no actualiza; bloqueo vencido vuelve a contar), RN-028 (`expiresIn` 900 y argumento de `createToken`), RN-029 (`expiresAt` ≈ ahora + 7 d, tolerancia 5 s), RN-031 (inactiva: sin sesión ni tokens).
- **Por qué:** RN-027: sin esto un atacante podía alargar el bloqueo de la víctima con más intentos.
- **Impacto:** solo el efecto en BD descrito; contrato HTTP igual.
- **Verificación:** `npm run test` ✅ (330/330) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 5 y 6.

### 2026-10-16 — feat(HU-007): el login devuelve membresía, beneficios y perfil (bug #18, paso 3 de 6)
- **Archivos:** `src/modules/membership/membership.service.ts` (+spec), `src/modules/auth/interfaces/auth-response.interface.ts`, `src/modules/auth/auth.service.ts` (+spec), `src/modules/auth/auth.controller.spec.ts`, `agent.md` (§5.3), `memory.md`.
- **Qué:** `MembershipService.findByUserId` (delega en el DAO). `LoginResponse extends AuthResponse { membership: { code, status } | null; benefits: [] }`. `login()` lo devuelve tras `issueTokens`; `user` es el `AuthUser` de siempre. `refresh` y `/auth/me` no cambian.
- **Por qué:** HU-007: el login devuelve también membresía, beneficios activos y datos básicos. Los beneficios dependen de los niveles de HU-008: `[]` provisional (decisión de la persona).
- **Impacto:** `POST /auth/login` añade `membership` y `benefits` al cuerpo (campos nuevos; avisar al frontend). Sin variables nuevas.
- **Verificación:** `npm run test` ✅ (324/324) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** HU-008 rellena `benefits`.

### 2026-10-16 — fix(HU-007): `AuthPayload` refleja las claims reales del token (bug #8, paso 2 de 6)
- **Archivos:** `src/modules/auth/interfaces/auth-payload.interface.ts`, `memory.md`.
- **Qué:** se quitan `name`, `membership` y `cityId` de `AuthPayload`; quedan `id`, `role`, `email?` (más las de `JwtPayload`, `sub` incluida). `grep` confirma que nadie los usa (`CurrentUser` no se usa con esos campos; ningún código lee `request.user.name/membership/cityId`).
- **Por qué:** el tipo prometía datos que el token no trae.
- **Impacto:** ninguno en runtime (solo tipos). Sin test nuevo: no hay comportamiento; `tsc` verifica que nada los usaba.
- **Verificación:** `npm run test` ✅ (320/320) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 3 a 6.

### 2026-10-16 — fix(HU-007): RN-030, cada login revoca las sesiones previas (bug #17, paso 1 de 6)
- **Archivos:** `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.service.spec.ts`, `src/modules/auth/entities/session.entity.ts` (JSDoc), `agent.md` (§5.2, §5.3), `memory.md`.
- **Qué:** tras el `update` de éxito y antes de `issueTokens`, `login()` hace `authDao.revokeAllSessions(user.id)`. No va dentro de `issueTokens` porque `refresh` ya revoca su propia sesión. `logout-all` no cambia. El JSDoc de `Session` ya no habla de N sesiones.
- **Por qué:** RN-030 (cada login invalida el refresh anterior). Decisión de la persona: una sola sesión viva por usuario.
- **Impacto:** un login en otro dispositivo deja sin refresh al anterior (401 al renovar); sus access tokens siguen válidos hasta 15 min. Avisar al frontend. Sin variables nuevas.
- **Verificación:** `npm run test` ✅ (320/320) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 2 a 6.

### 2026-10-16 — chore(HU-001): imagen Node 22 y comentario de `NotificationStatus`
- **Archivos:** `Dockerfile`, `agent.md` (§2: Node 22), `src/common/enums/domain.enums.ts`, `memory.md`.
- **Qué:** `node:20-alpine` pasa a `node:22-alpine` en las dos etapas. El comentario de `NotificationStatus` describe el estado actual (el job de RN-020 pasa PENDING → SENT). Se corrige la nota de la entrada del job de RN-020 que decía que `node:20-alpine` «debe ser ≥ 20.19».
- **Por qué:** NestJS 12, TypeORM y `@nestjs/schedule` son ESM y el proyecto CommonJS depende de `require(esm)` (Node ≥ 20.19); el tag flotante 20 no lo garantiza. Observación del revisor de HU-005.
- **Impacto:** la imagen Docker usa Node 22. Sin cambios de comportamiento ni variables nuevas.
- **Verificación:** `npm run test` ✅ (318/318) · `npm run lint` ✅ · `npm run build` ✅. Docker no se probó (imagen no construida).
- **Pendiente derivado:** ninguno.

### 2026-10-16 — feat(HU-005): job horario que envía los avisos de estreno (RN-020, paso 4 de 5)
- **Archivos:** `src/modules/notification/release-notification.job.ts`, `src/modules/notification/release-notification.job.spec.ts`, `src/modules/notification/notification.module.ts`, `src/modules/notification/notification.service.ts` (solo comentario), `src/app.module.ts`, `agent.md` (§5.1), `memory.md`.
- **Qué:** `ReleaseNotificationJob.run()` con `@Cron(CronExpression.EVERY_HOUR, { name: 'release-notifications' })`: busca las solicitudes `PENDING` con película `ACTIVE`, envía el correo una a una y llama a `markSent`. Si una fila falla, registra el id y el mensaje (sin email) y sigue con las demás. Guardia `running` (try/finally) contra ejecuciones solapadas. `ScheduleModule.forRoot()` en `AppModule` (una sola vez); el job está en `NotificationModule.providers` (`MailService` llega de `UtilsModule` global). Se corrige el comentario de `NotificationService.requestUpcoming`.
- **Por qué:** RN-020 / HU-005 (correo automático al pasar la película a "En Cartelera").
- **Impacto:** el job corre al arrancar la app, cada hora en punto, en la zona horaria del proceso (`TZ=America/Bogota`, sin `timeZone` en el decorador). Sin endpoints ni variables nuevas. `@nestjs/schedule` es solo ESM y el proyecto compila a CommonJS: funciona porque Node ≥ 20.19 permite `require` de ESM (verificado con `require('./dist/app.module.js')` en Node 22; el Dockerfile usa `node:22-alpine`).
- **Verificación:** `npm run test` ✅ (318/318) · `npm run lint` ✅ · `npm run build` ✅. Sin prueba manual (sin Postgres).
- **Pendiente derivado:** prueba manual (ver Pendientes).

### 2026-10-16 — feat(HU-005): DAO de solicitudes pendientes de aviso (paso 3 de 5 de RN-020)
- **Archivos:** `src/modules/notification/release-notification.dao.ts`, `src/modules/notification/release-notification.dao.spec.ts`, `memory.md`.
- **Qué:** `findPendingForActiveMovies(limit = 200)`: un `createQueryBuilder('rn')` con `innerJoin(Movie)` e `innerJoin(User)`, filtro `rn.status = PENDING AND m.status = ACTIVE`, orden `rn.id`, `limit`; devuelve `{ id, email, name, movieTitle }`. `markSent(id)`: `update({ id, status: PENDING }, { status: SENT })`, devuelve `affected === 1` (si otra ejecución ya la marcó, false).
- **Por qué:** RN-020. El join cruza entidades en este DAO (excepción a «solo su entidad» de `agent.md` §3, mismo precedente que `ShowtimeDao`): trae columnas planas en una consulta y evita un N+1 (película y usuario por solicitud) o un service que haga tres consultas.
- **Impacto:** ninguno en endpoints; sin variables nuevas.
- **Verificación:** `npm run test` ✅ (312/312) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** paso 5 (job).

### 2026-10-16 — feat(HU-005): `MailService.sendReleaseNotice` (paso 2 de 5 de RN-020)
- **Archivos:** `src/common/utils/mail.ts`, `src/common/utils/mail.spec.ts`, `memory.md`.
- **Qué:** `sendReleaseNotice(to, name, movieTitle)` envía texto plano en español («Hola {name}, {movieTitle} ya está en cartelera…»). Se extrae `private deliver(to, subject, text, devDetail)` compartido con `sendActivation` (envío + log «Correo emulado» sin SMTP; el detalle con el enlace sigue ocultándose en producción). Lanza si el transporte falla; el log no incluye datos sensibles.
- **Por qué:** RN-020. `deliver` ya tiene dos usos reales (`agent.md` §4.1).
- **Impacto:** ninguno en endpoints, BD ni variables de entorno.
- **Verificación:** `npm run test` ✅ (308/308) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 3 a 5.

### 2026-10-16 — build(HU-005): `@nestjs/schedule` y `NotificationStatus.SENT` (paso 1 de 5 de RN-020)
- **Archivos:** `package.json`, `package-lock.json`, `src/common/enums/domain.enums.ts`, `memory.md`.
- **Qué:** se instala `@nestjs/schedule` 12.0.2 (peerDependencies `@nestjs/core`/`common` `^11 || ^12`, compatible con `^12.0.1`; sin `--force` ni `--legacy-peer-deps`). `NotificationStatus` gana `SENT`.
- **Por qué:** RN-020 (correo al pasar la película a "En Cartelera") necesita un `@Cron`; la dependencia ya estaba justificada en `agent.md` §4.1. `SENT` se usa desde el paso 4.
- **Impacto:** el enum `ReleaseNotifications.status` de Postgres gana un valor. Una BD ya creada necesita `ALTER TYPE "ReleaseNotifications_status_enum" ADD VALUE 'SENT';` (o recrearse; `synchronize` no siempre añade valores a un enum existente). Sin variables de entorno nuevas.
- **Verificación:** `npm run test` ✅ (305/305) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** pasos 3 a 5 (correo, DAO, job).

### 2026-10-16 — feat(HU-006): `POST /membership/create` (paso 6 de 6)
- **Archivos:** `src/modules/membership/{membership.controller,membership.controller.spec,membership.service,membership.service.spec,membership.module}.ts`, `agent.md` (§5.1, §5.3, §5.4), `memory.md`.
- **Qué:** `POST /api/membership/create` (JWT, sin `@Public`, 201 `{ code, status }`). El usuario sale del token (`request.user.id`; 401 si falta). `MembershipService.create(userId)`: si `findByUserId` encuentra una → 409 «El usuario ya tiene una membresía»; si no, `createForUser`. La carrera entre dos peticiones la cubre el índice único de `userId` (409 en el DAO). `MembershipModule` registra el controller. `agent.md`: se actualizan las filas de verify-email y membership/create en §5.1, se quitan de §5.3 los conflictos RN-022, membresía y correo (resueltos) y se actualizan las dos filas de `register` en §5.4.
- **Por qué:** HU-006 (`POST /membership/create`). Con esto HU-006 queda completa salvo prueba manual.
- **Impacto:** ruta nueva con token. Perfil = solo `User` (ver Decisiones). Avisar al frontend de `membership` en la respuesta de register.
- **Verificación:** `npm run test` ✅ (305/305) · `npm run lint` ✅ · `npm run build` ✅.
- **Pendiente derivado:** prueba manual de HU-006; RN-020 (correo de estreno de HU-005, no se hizo ahora por decisión de la persona); enum `Membership`/`User.membership` para HU-008.

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
