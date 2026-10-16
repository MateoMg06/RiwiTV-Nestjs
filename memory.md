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
| HU-010 | Completa salvo prueba manual | Tablas `Seats` y `SeatAudits`; `GET /functions/:id/seats` (público; HELD vencida se ve AVAILABLE); `POST /reservations/lock-seats` (JWT, 200; transacción SERIALIZABLE con `FOR UPDATE`, todo o nada, 409 por conflicto o 40001/40P01, 400 por máximo, 404); `DELETE /reservations/release-seats` y `GET /reservations/summary` (JWT); máximo por función (`Showtimes.maxSeatsPerReservation` o `MAX_SEATS_PER_RESERVATION`); bloqueo `SEAT_LOCK_MINUTES` (10); `SeatLockExpiryJob` cada minuto (audita `EXPIRED`); auditoría LOCKED/RELEASED/EXPIRED fail-closed; seed con sala de 8×10 por función | Prueba manual contra Postgres (el SQL real de `FOR UPDATE`/`RETURNING` y la carrera real solo están cubiertos con dobles); políticas de preferenciales (RN-042) |

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
- HU-010: sillas = tabla `Seats` por función (`showtimeId`, `row`, `number`, `type`, `status`, `priceModifier`, `heldByUserId`, `heldUntil`); no hay entidades `Room` ni `SeatLock` aparte (el bloqueo vive en la propia silla). Estados persistidos `AVAILABLE`/`HELD`/`SOLD`/`DISABLED`; «Seleccionada» es del frontend. `SOLD` solo lo escribe el seed: el código nunca lo escribe y la liberación nunca toca `SOLD` ni `DISABLED`. `SeatType` pasa a `ESTANDAR`/`PREFERENCIAL`/`VIP` (el anterior no se usaba).
- HU-010: RN-042 — las sillas preferenciales se bloquean como cualquier otra; la respuesta expone `type: PREFERENCIAL`. Faltan las políticas del cine (ver Pendientes).
- HU-010: precio por silla = `Number(showtime.price) + Number(seat.priceModifier)` (precio de lista, sin descuento de membresía). El seed pone `priceModifier` 5000 a las VIP y 0 al resto.
- HU-010: re-bloquear renueva el plazo de **todas** las sillas `HELD` vigentes del usuario en esa función (un solo vencimiento) y se audita como `LOCKED`.
- HU-010: la auditoría (`SeatAudits`) es **fail-closed**: se escribe dentro de la misma transacción que el cambio; si falla, nada se bloquea/libera.
- HU-010: máximo de sillas por función = `Showtimes.maxSeatsPerReservation` (nullable) con respaldo `MAX_SEATS_PER_RESERVATION` (default 8). El bloqueo dura `SEAT_LOCK_MINUTES` (default 10).
- HU-010: sin WebSockets; el frontend hace polling del mapa. `activeReservations` de HU-008 sigue `[]` y `SOLD_OUT` de HU-009 no se deriva de las sillas.
- HU-010: `lockSeats` usa `SERIALIZABLE` + `FOR UPDATE` (`ORDER BY id`); un 40001/40P01 se traduce a 409 con el mismo mensaje y no hay reintentos automáticos. `releaseSeats` y `releaseExpired` usan la transacción con aislamiento por defecto (READ COMMITTED): sus `UPDATE` son condicionales e idempotentes y, con `FOR UPDATE`, Postgres reevalúa la condición tras esperar el lock, así que no necesitan SERIALIZABLE ni pueden fallar por 40001 (el job de vencimiento y una liberación manual no se pisan). Desviación consciente de la frase de `agent.md` §3 «las transacciones de HU-010 son SERIALIZABLE», pensada para el bloqueo.
- HU-010: `DELETE /reservations/release-seats` lleva `{ functionId, seatIds? }` en el cuerpo (Express lo parsea en DELETE). Responde `{ functionId, released: number[] }` con los ids realmente liberados; sin `seatIds` libera todas las suyas en la función. Silla ajena/vendida/inhabilitada: se ignora (no hay error).
- HU-010: si `lockSeats` toma una silla `HELD` vencida de otro usuario, no se audita `EXPIRED` para el dueño anterior (solo lo hace el job).
- HU-010: seed de sillas: cada función no `CANCELLED` recibe 8 filas (A–H) × 10 sillas. Fila A columnas 9–10 `PREFERENCIAL`; fila H `VIP` con `priceModifier` 5000; el resto `ESTANDAR` (0). En las funciones normales `B3`, `B4`, `C5` y `E7` quedan `SOLD` y `D1` `DISABLED`; en las `SOLD_OUT` todas `SOLD`. La función de «Aventura Galáctica» IMAX en Centro (+3 días, 19:00) tiene `maxSeatsPerReservation = 2`. Idempotente: solo inserta las sillas que faltan y no cambia el estado de las existentes.

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
- [ ] HU-010 (RN-042): faltan las políticas del cine sobre sillas preferenciales (hoy se bloquean como cualquier silla).
- [x] HU-010: mapa de sillas, bloqueo transaccional, liberación, resumen, job de vencimiento y auditoría.
- [ ] HU-010: prueba manual contra Postgres (`npm run build && npm run seed`; `Seats`, `SeatAudits` y `Showtimes.maxSeatsPerReservation` los crea `synchronize`). Con dos usuarios activos (tokens A y B) y una función futura `<f>` del seed: (1) `GET /api/functions/<f>/seats` (80 sillas, `B3`/`B4`/`C5`/`E7` SOLD, `D1` DISABLED, `A9`/`A10` PREFERENCIAL, fila H VIP). (2) Lanzar en paralelo `POST /api/reservations/lock-seats` `{"functionId":<f>,"seatIds":[<id de A1>]}` con A y con B (p. ej. dos `curl ... &`): uno 200 y el otro 409 «Una o más sillas ya no están disponibles»; en el mapa A1 queda HELD. (3) Con A: `GET /api/reservations/summary?functionId=<f>` (precio = precio de la función; una VIP suma 5000; `expiresAt` a ~10 min). (4) Repetir el bloqueo de A1 con A (200, vencimiento renovado) y pedir 3 sillas en la función con máximo 2 (`Aventura Galáctica` IMAX +3 días) → 400 «Máximo 2 sillas por función». (5) `DELETE /api/reservations/release-seats` `{"functionId":<f>,"seatIds":[<id de A1>]}` con B → `released: []`; con A → `released: [<id>]` y A1 vuelve a AVAILABLE. (6) Bloquear una silla, esperar `SEAT_LOCK_MINUTES` (o `UPDATE "Seats" SET "heldUntil" = now() - interval '1 minute' WHERE id = <id>;`): el mapa ya la muestra AVAILABLE; en el siguiente minuto el log dice «Sillas liberadas por vencimiento: 1» y `SELECT * FROM "SeatAudits" ORDER BY id;` tiene `LOCKED`, `RELEASED` y `EXPIRED` con el `userId` previo. (7) Sin token, `lock-seats`, `release-seats` y `summary` dan 401.

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
12. [x] Swagger con datos de relleno y puerto 3000 fijo en el log. Resuelto: descripción real, tags por módulo, `addApiKey` eliminado y log de puerto quitado (lo imprime `main.ts` tras `listen`) — `src/config/swagger.ts`.
13. [ ] `tsconfig.build.tsbuildinfo` versionado.
14. [x] `.env.example` con secretos que parecen reales (JWT, Observe, `SEED_API_KEY`): reemplazar y rotar.
15. [x] Email no implementado (nodemailer instalado sin uso). Resuelto en HU-006 con `MailService` (correo de activación; emulado si no hay `SMTP_HOST`).
16. [x] `agent.md` §2 y §4 dicen ESM / `import.meta.dirname`, pero desde `35c326d` el proyecto es CommonJS (`__dirname` es válido).
17. [x] HU-007 RN-030: el login no invalida el refresh token anterior; `Sessions` permite N sesiones simultáneas — `src/modules/auth/auth.service.ts`. Resuelto: `login()` llama a `revokeAllSessions` antes de emitir tokens.
18. [x] HU-007: la respuesta de login no incluye membresía, beneficios ni datos del perfil — `src/modules/auth/auth.service.ts`. Resuelto: `LoginResponse` con `membership`, `benefits: []` (provisional hasta HU-008) y `user`.
19. [x] HU-006: el token de activación se guardaba **en claro** (`User.activationToken`); `agent.md` §4.8 exige SHA-256. Resuelto: `register` guarda `hashToken(token)` y `activate` busca por el hash — `auth.service.ts`, `user.dao.ts`.

## Registro de cambios

### 2026-10-16 — docs: registro antiguo movido a `memory-archive.md` (paso 4 de 4)
- **Archivos:** `memory.md`, `memory-archive.md` (nuevo).
- **Qué:** `memory.md` superaba ~300 líneas (634). Las 51 entradas más antiguas del registro (hasta el 2026-10-15 y las primeras de HU-009/HU-008…) pasan, sin cambios y en el mismo orden, a `memory-archive.md`; en `memory.md` quedan las 10 más recientes y un enlace a «Entradas anteriores». Estado, Decisiones, Pendientes y Bugs no se tocan (salvo el bug #12, resuelto en el paso 2).
- **Por qué:** `agent.md` §0: archivar el registro cuando supera ~300 líneas.
- **Impacto:** ninguno en código.
- **Verificación:** `npm run test` ✅ (530/530) · `npm run lint` ✅ · `npm run build` ✅. `memory.md` queda en unas 270 líneas; 61 entradas en total (10 + 51), ninguna perdida.
- **Pendiente derivado:** ninguno.
> Entradas anteriores: [`memory-archive.md`](memory-archive.md).

### 2026-10-16 — docs(HU-001): README nuevo en español y `agent.md` al día (paso 3 de 4)
- **Archivos:** `README.md`, `agent.md` (§2 comandos, §3 estructura y sección Swagger, §5.1 filas HU-001 y HU-003/004/005), `memory.md`.
- **Qué:** el README de plantilla de Nest se sustituye por uno en español: qué es el proyecto, estado por historia, stack, variables de entorno por grupo (sin valores), puesta en marcha con Docker y en local, scripts, Swagger y health, tabla de endpoints por historia, autenticación, correo emulado y tareas programadas, arquitectura, tests, documentación del proyecto y pendientes. `agent.md` corrige el desfase: `build` con `nest build`, `seed`, `schedule`/`nodemailer` en el stack, los módulos que faltaban en §3 y la tabla §5.1 (health existe; HU-003/004/005 completas salvo prueba manual).
- **Por qué:** HU-001 (documentación del proyecto) y mantener `agent.md` veraz.
- **Impacto:** ninguno en código ni en contrato.
- **Verificación:** `npm run test` ✅ (530/530) · `npm run lint` ✅ · `npm run build` ✅. Rutas, scripts, variables y expresiones cron contrastados con los controllers, `package.json`, `.env.example` y los jobs.
- **Pendiente derivado:** paso 4 (archivar el registro).
### 2026-10-16 — docs(HU-001): Swagger documentado en todos los controllers (paso 2 de 4, bug #12)
- **Archivos:** `src/config/swagger.ts`, `src/common/decorators/api-auth.decorator.ts` (+ spec), los 13 controllers (`app`, `auth`, `country/location`, `health`, `membership`, `movie`, `notification`, `profile`, `reservation` x2, `showtime/functions`, `user` x2), `src/modules/user/update-user.dto.ts`, `memory.md`.
- **Qué:** descripción real de la API (rutas bajo `/api`, auth por Bearer o cookie `accessToken`, correo emulado, forma de los errores); se quita el `addApiKey` inexistente; tags por módulo con historia (`health`, `ubicación`, `películas`, `notificaciones`, `auth`, `membresía`, `perfil`, `funciones`, `reservas`, `usuarios`, `app`); `addBearerAuth()` + `addCookieAuth('accessToken')`; se elimina el log del puerto fijo (`main.ts` ya imprime la URL). Cada ruta lleva `@ApiOperation` (con HU/RN) y respuestas con los códigos reales leídos de los services y del guard. `@ApiAuth()` (nuevo, usado en 8 controllers/métodos) agrupa Bearer, cookie y 401. Login, refresh y logout documentan las cookies `accessToken` y `refresh_token`. `@ApiBody` en refresh/logout (el tipo unión no lo infiere el plugin) y `@ApiQuery` en `summary`. `UpdateUserDto` importa `PartialType`/`OmitType` de `@nestjs/swagger` (misma API que `@nestjs/mapped-types`, validación intacta) para que su esquema salga con propiedades.
- **Por qué:** HU-001 RN-003, «Swagger publicado»; bug #12.
- **Impacto:** solo documentación; ningún endpoint cambia de comportamiento.
- **Verificación:** `npm run test` ✅ (530/530; +8 de `api-auth.decorator.spec.ts`) · `npm run lint` ✅ · `npm run build` ✅. Documento OpenAPI generado sin BD (como en el paso 1): 43 rutas, 43 con tag y ninguna en `default`, 43 con resumen, 17 protegidas con `security` (Bearer o cookie), 13 esquemas de DTO y todos con propiedades.
- **Pendiente derivado:** README (paso 3) y archivo de memoria (paso 4).
### 2026-10-16 — build(HU-001): plugin de Swagger y se quita `swagger-jsdoc` (paso 1 de 4, Swagger publicado)
- **Archivos:** `nest-cli.json`, `package.json`, `package-lock.json`, `memory.md`.
- **Qué:** `nest-cli.json` activa el plugin `@nestjs/swagger` (`classValidatorShim`, `introspectComments`) para generar las propiedades de los DTO a partir de TypeScript y `class-validator`. `npm run build` pasa de `tsc` a `nest build -p tsconfig.build.json` (el plugin solo corre con el compilador de Nest). Se desinstalan `swagger-jsdoc` y `@types/swagger-jsdoc` (sin usos en `src`, `test` ni `docs`).
- **Por qué:** HU-001 RN-003, Swagger generado automáticamente.
- **Impacto:** ninguno en endpoints. `dist/main.js`, `dist/seeders/seed.js` y `dist/app.module.js` salen en la misma ruta (`start:prod`, `seed` y el `Dockerfile` siguen igual). Sin variables nuevas.
- **Verificación:** `npm run test` ✅ (522/522) · `npm run lint` ✅ · `npm run build` ✅. Swagger: script temporal (borrado) que crea la app con `Test.createTestingModule` sin BD (`DataSource.initialize` sustituido por `buildMetadatas`) y lee `/api/docs-json`: 43 rutas, los DTO de body tienen propiedades (`UpdateUserDto` sale vacío porque usa `PartialType` de `@nestjs/mapped-types`). `require('./dist/app.module.js')` ✅.
- **Pendiente derivado:** pasos 2–4 (decoradores en controllers, README, archivo de memoria).
### 2026-10-16 — feat(HU-010): seed de sillas y cierre de la historia (paso 6 de 6)
- **Archivos:** `src/seeders/seed.ts`, `agent.md` (§5.1 fila HU-010, §5.3 fila HU-010), `memory.md`.
- **Qué:** el seed crea la sala (8×10) de cada función no cancelada con filas preferenciales, VIP (+5000), unas `SOLD`/`DISABLED` y todas `SOLD` en las `SOLD_OUT`; es idempotente. Una función con `maxSeatsPerReservation = 2`. HU-010 pasa a «Completa salvo prueba manual»; guion de prueba manual en Pendientes.
- **Por qué:** poder probar HU-010 de extremo a extremo.
- **Impacto:** datos de demostración (`npm run seed`); sin cambios de API.
- **Verificación:** `npm run test` ✅ (522/522) · `npm run lint` ✅ · `npm run build` ✅. El seed no se ejecutó (sin Postgres en este entorno).
- **Pendiente derivado:** prueba manual contra Postgres; políticas de preferenciales (RN-042).
### 2026-10-16 — feat(HU-010): job de vencimiento de bloqueos (paso 5 de 6)
- **Archivos:** `src/modules/reservation/seat-lock-expiry.job.ts`, `seat-lock-expiry.job.spec.ts`, `reservation.module.ts`, `memory.md`.
- **Qué:** `SeatLockExpiryJob` (`@Cron(EVERY_MINUTE, { name: 'seat-lock-expiry' })`) llama a `ReservationService.releaseExpired()`: las sillas `HELD` vencidas vuelven a `AVAILABLE` y se audita `EXPIRED` con el dueño previo. Guardia `running` (try/finally); un error se registra sin romper el planificador. Registrado en `ReservationModule`.
- **Por qué:** HU-010, liberación automática. El mapa y `lockSeats` ya tratan las vencidas como libres sin esperar al job.
- **Impacto:** tarea periódica nueva (cada minuto, zona horaria `TZ`). Pensado para una sola instancia.
- **Verificación:** `npm run test` ✅ (522/522) · `npm run lint` ✅ · `npm run build` ✅
- **Pendiente derivado:** seed y prueba manual (paso 6).
### 2026-10-16 — feat(HU-010): `ReservationService`, DTOs y controllers de sillas (paso 4 de 6)
- **Archivos:** `src/modules/reservation/reservation.service.ts` (+spec), `lock-seats.dto.ts` (+spec, cubre también `release-seats.dto.ts`), `release-seats.dto.ts`, `seats.controller.ts` (+spec), `reservation.controller.ts` (+spec), `reservation.module.ts`, `src/app.module.ts`, `memory.md`.
- **Qué:** `GET /api/functions/:id/seats` (público; HELD vencida se muestra AVAILABLE, nunca expone dueño ni vencimiento), `POST /api/reservations/lock-seats` (200 `{ functionId, seatIds, expiresAt }`), `DELETE /api/reservations/release-seats` (200 `{ functionId, released }`), `GET /api/reservations/summary?functionId=` (`{ functionId, seats[{seatId,row,number,type,price}], seatCount, total, expiresAt|null }`). Las tres de `reservations` exigen JWT; el usuario sale del token (401 si falta). Bloqueo todo o nada: 404 «Función no encontrada» / «Silla no encontrada», 409 «Una o más sillas ya no están disponibles», 400 «Máximo N sillas por función» (vigentes ∪ nuevas sin contar doble; máximo = `Showtimes.maxSeatsPerReservation` o `MAX_SEATS_PER_RESERVATION`). Re-bloqueo renueva todas las vigentes con un solo vencimiento (`SEAT_LOCK_MINUTES`) y audita `LOCKED`. Auditoría dentro de la misma transacción. `ReservationModule` importa `ShowtimeModule` y `ConfigModule` (sin ciclos) y está en `AppModule`. DTOs: `seatIds` 1–50 enteros ≥1 únicos.
- **Por qué:** HU-010 (RN de bloqueo transaccional, liberación manual, máximo por función, resumen con total, auditoría).
- **Impacto:** cuatro rutas nuevas. `GET /functions/:id/seats` comparte el prefijo `functions` con `FunctionsController` (HU-009) sin colisión (`:id` vs `:id/seats`). El job de vencimiento llega en el paso 5.
- **Verificación:** `npm run test` ✅ (517/517, incluida la carrera simulada con un doble que serializa) · `npm run lint` ✅ · `npm run build` ✅. Sin BD en este entorno: el SQL real no se ejecutó (ver prueba manual en el paso 6).
- **Pendiente derivado:** job (paso 5), seed y prueba manual (paso 6).
### 2026-10-16 — feat(HU-010): `SeatDao` y `SeatAuditDao` (paso 3 de 6)
- **Archivos:** `src/modules/reservation/seat.dao.ts`, `seat.dao.spec.ts`, `seat-audit.dao.ts`, `seat-audit.dao.spec.ts`, `memory.md`.
- **Qué:** `SeatDao`: `findByShowtime`, `findForUpdate` (`pessimistic_write`, filtra función + ids, `ORDER BY id` para fijar el orden de locks), `hold`, `renewHeldByUser` (solo `HELD` vigentes propias; devuelve ids con `RETURNING`), `countHeldByUser`, `findHeldByUser`, `releaseByUser` (solo `HELD` propias, nunca `SOLD`/`DISABLED`; `ids` opcional; devuelve ids liberados), `releaseExpired` (`SELECT ... FOR UPDATE` de `HELD` con `heldUntil <= now`, luego `UPDATE` a `AVAILABLE`; devuelve `{ seatId, showtimeId, userId }` con el dueño previo). `SeatAuditDao.createMany(manager, rows)`. Las escrituras reciben el `EntityManager` del service; ningún DAO abre transacciones.
- **Por qué:** HU-010, acceso a datos con concurrencia correcta.
- **Impacto:** ninguno todavía en la API. Los tests de DAO usan dobles del query builder: el SQL real (`FOR UPDATE`, `RETURNING`) no se ha ejecutado contra Postgres en este entorno (sin BD).
- **Verificación:** `npm run test` ✅ (447/447) · `npm run lint` ✅ · `npm run build` ✅
- **Pendiente derivado:** service, DTOs y controllers (paso 4).
### 2026-10-16 — feat(HU-010): entidades `Seat` y `SeatAudit` (paso 2 de 6)
- **Archivos:** `src/modules/reservation/seat.entity.ts`, `src/modules/reservation/seat-audit.entity.ts`, `src/database.ts`, `memory.md`.
- **Qué:** tabla `Seats` (FK `showtimeId` con `ON DELETE CASCADE`, `row` varchar(2), `number`, `type`, `status` default `AVAILABLE`, `priceModifier` decimal(12,2), `heldByUserId`, `heldUntil` timestamptz; único `(showtimeId, row, number)`; índice `(status, heldUntil)`). Tabla `SeatAudits` con columnas planas sin FK (`userId` nullable, `showtimeId`, `seatId`, `event`, `createdAt`) e índice por `showtimeId`. Ambas registradas en `typeOrmOptions.entities`.
- **Por qué:** HU-010, modelo de sillas y auditoría.
- **Impacto:** dos tablas nuevas creadas por `synchronize`. Sin cambios de API.
- **Verificación:** `npm run test` ✅ (435/435) · `npm run lint` ✅ · `npm run build` ✅
- **Pendiente derivado:** DAOs (paso 3).
### 2026-10-16 — feat(HU-010): enums de sillas, configuración y máximo por función (paso 1 de 6)
- **Archivos:** `src/common/enums/domain.enums.ts`, `src/config/config.keys.ts`, `.env.example`, `src/modules/showtime/showtime.entity.ts`, `memory.md`.
- **Qué:** `SeatType` (sin uso) se reemplaza por `{ ESTANDAR, PREFERENCIAL, VIP }`; nuevos `SeatStatus { AVAILABLE, HELD, SOLD, DISABLED }` y `SeatAuditEvent { LOCKED, RELEASED, EXPIRED }`. `Config.SEAT_LOCK_MINUTES` (default 10) y `Config.MAX_SEATS_PER_RESERVATION` (default 8), ambos en `.env.example`. Columna `Showtimes.maxSeatsPerReservation` (int, nullable; la crea `synchronize`).
- **Por qué:** base de HU-010 (RN-040 plazo de bloqueo; máximo configurable por función). Decisiones registradas arriba.
- **Impacto:** variables de entorno nuevas `SEAT_LOCK_MINUTES` y `MAX_SEATS_PER_RESERVATION`; columna nueva en `Showtimes`. Sin cambios de API.
- **Verificación:** `npm run test` ✅ (435/435) · `npm run lint` ✅ · `npm run build` ✅
- **Pendiente derivado:** entidades, DAOs, service, job y seed (pasos 2–6).
### 2026-10-16 — feat(HU-009): `GET /functions/:id` y `/prices` (paso 4 de 4)
- **Archivos:** `src/modules/showtime/functions.controller.ts`, `functions.controller.spec.ts`, `showtime.module.ts`, `agent.md` (§5.1 fila HU-009), `memory.md`.
- **Qué:** `FunctionsController` (`@Controller('functions')`) con `GET :id` y `GET :id/prices`, ambos `@Public()` y con `ParseIntPipe` (`/abc` → 400). Registrado en `ShowtimeModule.controllers`. No hay dependencia circular: `MovieModule` importa `ShowtimeModule` y este no importa nada.
- **Por qué:** cierra HU-009.
- **Impacto:** dos rutas públicas nuevas; sin cambios de BD ni de variables de entorno.
- **Prueba manual pendiente (con seed, `npm run build && npm run seed`, app arriba):** función futura → 200 en `/api/functions/:id` y `/prices`; función de ayer → 404; `CANCELLED` → 404; función en «Multicine Riwi Cerrado» → 404; función de película `INACTIVE`/`UPCOMING` → 404; id inexistente → 404; `/api/functions/abc` → 400; la `SOLD_OUT` → 200 con `status: SOLD_OUT`.
- **Verificación:** `npm run test` ✅ (435/435) · `npm run lint` ✅ · `npm run build` ✅
