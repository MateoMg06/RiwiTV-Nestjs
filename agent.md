# agent.md — RiwiTV NestJS (rama `feature/develop`)

Guía para cualquier agente de IA (Claude, Copilot, Cursor, Codex…) que trabaje en este repositorio.
Léela completa antes de tocar código. Después lee `memory.md`.

> **ALCANCE ÚNICO: historias de usuario HU-001 a HU-010.**
> Requisitos completos en **`docs/historias-de-usuario.md`** (transcripción del backlog oficial).
> Nada fuera de esas diez historias se implementa, aunque exista en el backlog (HU-011 a HU-029)
> o en el proyecto original.

---

## 0. REGLA OBLIGATORIA: mantener `memory.md` actualizado

> **Por cada cambio que hagas en el repositorio —por pequeño que sea— DEBES actualizar `memory.md` en la raíz del proyecto, en el mismo commit/entrega que el cambio.**

Esto no es opcional ni se deja "para el final". Un cambio sin su entrada en `memory.md` se considera **incompleto**.

### Flujo de trabajo obligatorio

1. **Antes de empezar:** lee `memory.md` completo (estado por historia, decisiones, pendientes, bugs conocidos). No repitas trabajo ya hecho ni contradigas decisiones registradas sin justificarlo.
2. **Comprueba que la tarea pertenece a una de las historias HU-001 a HU-010.** Si no, no la hagas; regístralo en `memory.md` como "fuera de alcance" y avisa a la persona.
3. **Haz el cambio.**
4. **Inmediatamente después de cada cambio** (no al final de la sesión), actualiza `memory.md`:
   - Añade una entrada al **Registro de cambios** (más reciente arriba) con el formato de la sección 0.1.
   - Actualiza **Estado por historia** si cambió el estado de una historia o endpoint.
   - Marca/actualiza los ítems de **Pendientes** y **Bugs conocidos** que hayas resuelto o descubierto.
   - Si tomaste una decisión de diseño no obvia, regístrala en **Decisiones**.
5. **Verifica** (`npm run test`, `npm run lint`, `npm run build`) y anota el resultado en la entrada.
6. Si `memory.md` no existe, créalo con la plantilla de la sección 0.2 antes de hacer cualquier otro cambio.

### Qué cuenta como "cambio"

Todo: código, DTOs, entidades, tests, configuración, `.env.example`, dependencias, documentación, renombres, borrados. Si `git status` muestra algo distinto, hay que registrarlo.

### Reglas de escritura de `memory.md`

- Escribe en español, frases cortas, hechos verificables. Nada de "mejoras varias".
- Nombra siempre los archivos con su ruta relativa (`src/modules/auth/auth.service.ts`).
- Indica siempre la historia afectada (`HU-007`).
- Nunca pegues secretos, tokens, contraseñas ni valores reales de `.env` en `memory.md`.
- No borres entradas antiguas del registro; si algo quedó obsoleto, añade una nueva entrada que lo diga.
- Si el registro supera ~300 líneas, mueve las entradas más antiguas a `memory-archive.md` y deja un enlace.

### 0.1 Formato de cada entrada del registro

```md
### AAAA-MM-DD — <tipo>(HU-0XX): <resumen en una línea>
- **Archivos:** `ruta/a/archivo.ts`, `otra/ruta.ts`
- **Qué:** qué cambió (comportamiento, no solo código).
- **Por qué:** criterio de la historia o bug que resuelve.
- **Impacto:** endpoints, contrato con el frontend, BD, variables de entorno afectadas (o "ninguno").
- **Verificación:** `npm run test` ✅/❌ · `npm run lint` ✅/❌ · `npm run build` ✅/❌ · prueba manual si aplica.
- **Pendiente derivado:** lo que queda por hacer a raíz de este cambio (o "ninguno").
```

`<tipo>` usa los mismos prefijos que los commits: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`.

### 0.2 Plantilla mínima de `memory.md`

```md
# memory.md — RiwiTV NestJS

## Estado por historia (HU-001 a HU-010)
## Decisiones
## Pendientes
## Fuera de alcance
## Bugs conocidos
## Registro de cambios
```

---

## 1. Contexto del proyecto

- **Qué es:** API de Multicine RiwiTV (cartelera, funciones, sillas, usuarios, membresía). Se está **migrando de Node/Express + Sequelize a NestJS + TypeORM**.
- **Rama de trabajo:** `feature/develop` (integra `feature/authentication`). Remoto: `github.com/MateoMg06/RiwiTV-Nestjs`.
- **Entregable:** las historias **HU-001 a HU-010** funcionando en NestJS, con el mismo comportamiento que el proyecto original.

### 1.1 Fuentes de verdad (en este orden)

1. **`docs/historias-de-usuario.md`** — backlog oficial HU-001 a HU-010: descripción, reglas `RN-0XX`, endpoints y criterios de aceptación. **Manda sobre todo lo demás.** (El PDF original es `Historia de usuario NodeJS Multicine Riwi (1).pdf`; usa el Markdown, que es texto.)
2. **Repo original (Express + Sequelize):** `https://github.com/MateoMg06/RIWI-TV-PUBLIC.git`, rama **`main`** (commit `abbf621`). Úsalo para detalles que el backlog no fija (nombres de campos, mensajes, códigos HTTP):
   - `app/src/__tests__/hu001-hu010.routes.test.ts` — contrato HTTP mínimo.
   - `app/src/migrations/20260904010000-hu001-hu010.js` — esquema de BD.
   - `services/`, `repositories/` — reglas de negocio implementadas.
3. Si el original contradice el backlog, **gana el backlog**. Registra la diferencia en `memory.md` → Decisiones.
- Para consultar el original, clónalo **fuera** de este repo (p. ej. `../RIWI-TV-PUBLIC`). Nunca copies archivos de Sequelize tal cual: se reescriben con TypeORM y el patrón de la sección 3.

### 1.2 Historias de usuario (resumen; el detalle está en `docs/historias-de-usuario.md`)

| HU | Qué exige | Endpoints (original) | Auth |
|---|---|---|---|
| **HU-001** | Arquitectura por capas, variables de entorno, migraciones, Docker Compose, health check, Swagger, logger, tests, lint, Prettier, Helmet y CORS | `GET /api/v1/health`, `GET /api/docs` | No |
| **HU-002** | Países, departamentos y ciudades **activos**; cines activos; ubicación del usuario autenticado persistida | `GET /countries`, `GET /departments/:countryId`, `GET /cities/:departmentId`, `POST /users/location` | No / JWT en location |
| **HU-003** | Cartelera de 7 días y de hoy (solo funciones activas), con filtros: fecha (`YYYY-MM-DD`), género, clasificación, idioma, tipo de sala, formato, complejo y "Disponible" | `GET /api/movies`, `/weekly`, `/today`, `/filter` | No |
| **HU-004** | Detalle completo (póster, banner, tráiler YouTube, sinopsis, director, actores, géneros, duración, clasificación, fecha de estreno, idiomas, formatos, precio por formato, calificación promedio), funciones **futuras** de la ciudad, recomendaciones | `GET /api/movies/:id`, `/:id/functions`, `/:id/recommendations` | No |
| **HU-005** | Próximos estrenos (estado "Próximo Estreno") ordenados por fecha, detalle con contador regresivo, solicitud de notificación **sin duplicados**; correo automático cuando la película pasa a "En Cartelera" | `GET /api/movies/upcoming`, `/upcoming/:id`, `POST /api/notifications/upcoming` | No / JWT en notificación |
| **HU-006** | Registro con CAPTCHA, contraseña ≥10 con mayúscula, minúscula, número y símbolo, BCrypt. Crea a la vez: usuario, perfil, **membresía Activa** con código único, historial de compras vacío, billetera de bonos vacía y preferencias de notificación. Correo de activación (token 24 h); sin activar no puede comprar | `POST /auth/register`, `POST /auth/verify-email`, `POST /membership/create` (+ `GET /auth/captcha` del original) | No |
| **HU-007** | JWT 15 min, refresh 7 días guardado en BD, **cada login invalida el refresh anterior** (RN-030), solo correos verificados, bloqueo 15 min tras 5 intentos, **recuperación de contraseña**, **auditoría de accesos con IP y dispositivo**. El login devuelve también membresía, beneficios activos y datos básicos del perfil | `POST /api/auth/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` | Según operación |
| **HU-008** | Perfil (foto opcional), QR único de membresía, nivel (Bronce/Plata/Oro/Platino), descuentos por nivel, bonos, historial de compras, reservas activas. Actualizar datos y preferencias de notificación; **cambiar el correo exige nueva validación** (RN-034) | `GET /api/profile`, `PUT /api/profile`, `GET /api/membership`, `/benefits` | JWT |
| **HU-009** | Solo funciones activas y no iniciadas: fecha, complejo, sala, hora, formato, idioma, audio (doblada/subtitulada), disponibilidad; precio según formato, sala y horario, con promociones recalculadas | `GET /movies/{id}/functions`, `GET /functions/{id}`, `/prices` | No |
| **HU-010** | Mapa de sillas con estados (Disponible, Seleccionada, Reservada temporalmente, Vendida, Inhabilitada, Preferencial, VIP), bloqueo **transaccional** de 10 min, liberación manual y automática, máximo de sillas **configurable por función**, auditoría de bloqueos y liberaciones, resumen con total | `GET /api/functions/:id/seats`, `POST /api/reservations/lock-seats`, `DELETE /release-seats`, `GET /summary` | No / JWT en reservas |

Reglas clave del original que hay que conservar:
- **HU-010:** transacción `SERIALIZABLE`, bloqueo de filas y actualización condicional `AVAILABLE → HELD`. Errores: 400 sin sillas o por encima del máximo, 404 función no disponible o sillas ajenas, 409 silla ya no disponible. Precio por silla = `showtime.price + seat.priceModifier`. Un proceso periódico libera bloqueos vencidos (en Nest: `@nestjs/schedule`).
- **HU-006:** `register` crea `User` + `Profile` + `Membership` (pendiente hasta activar). La activación llega por correo (SMTP).
- **HU-007:** el original auditaba (`AccessAudit`) login, login fallido, refresh, logout, solicitud y uso de reset y activación. En Nest (tabla `AccessAudits`) se auditan `LOGIN_SUCCESS`, `LOGIN_FAILED`, `ACCOUNT_LOCKED` y `PASSWORD_RESET` (decisión de la persona).
- El JWT se acepta por cookie **`accessToken`** o `Authorization: Bearer`.

### 1.3 Fuera de alcance (NO implementar)

- **HU-011 a HU-029 del backlog:** carrito (`/cart`), confitería (`/snacks`), pagos y órdenes (`/payments`, `/orders`), entradas y facturas (`/tickets`, `/invoice`), notificaciones generales (`/notifications/email`, `/history`, `/preferences`, `/resend`), consulta y reprogramación de reservas (`GET /reservations`, `/reservations/change`), transferencias, bonos de regalo (`/giftcards`), Cine Flash, panel administrativo (`/api/admin/*`), IA y recomendaciones personalizadas (`/ai/*`, `/recommendations`), puntos (`/points`), validación de QR, dashboard, promociones y cupones, encuestas, PQRS y la **API pública versionada `/api/v1` (HU-029)**.
- Del original, aunque existan: administración de catálogo (`POST /api/movies`, `POST /api/cinemas`, `POST/DELETE /api/cinemas/:id/movies/:movieId`, `GET /api/cinemas/:id/movies`, `GET /api/cinemas/:id/showtimes`), `POST` de países, departamentos y ciudades, `GET /cities/:id/cinemas`, y las rutas heredadas `/api/users/auth`, `/api/users/legacy-login`, `/api/users/getUsers`, `/api/users/register`.
- Envío de correos fuera de HU-005, HU-006 y HU-007 (el resto es HU-015).

Nota: `/api/v1` solo aplica a `GET /api/v1/health` (HU-001). Las rutas de HU-002 a HU-010 no llevan versión en el backlog.

El CRUD `/api/user` que ya existe en Nest no lo pide ninguna historia: **no se amplía**. Se mantiene solo como soporte interno.

Si una tarea cae aquí, **no la hagas**: anótala en "Fuera de alcance" de `memory.md` y avisa a la persona.

### 1.4 Ramas

> ⚠️ **No hagas merge de `origin/feature/controller` ni `origin/feature/movie-module`.** Usan otra estructura (`src/country/...` en vez de `src/modules/...`) y su diff **borra `auth` y `user`**. Si necesitas algo de ahí (HU-002, HU-003), trae los archivos a mano (`git show origin/<rama>:<ruta>`), adáptalos y regístralo en `memory.md`.

---

## 2. Stack y comandos

| Pieza | Versión / herramienta |
|---|---|
| Runtime | Node 22, **CommonJS** (`"type": "commonjs"`), TS `module: commonjs` |
| Framework | NestJS (`@nestjs/core`, `platform-express`, `swagger`, `typeorm`, `observe`) |
| BD | PostgreSQL vía TypeORM (`pg`) |
| Validación | `class-validator` + `class-transformer` (ValidationPipe global) |
| Auth | `jsonwebtoken` (access + refresh), `bcryptjs`, cookies httpOnly (`cookie-parser`) |
| Seguridad HTTP | `helmet`, `cors` |
| Tests | **Vitest** (no Jest, aunque estén instaladas sus dependencias) |
| Lint / formato | `oxlint` (script `lint`), Prettier |
| Contenedores | `Dockerfile` + `docker-compose.yml` (app + Postgres 15) |

```bash
npm install
npm run start:dev      # desarrollo con watch
npm run build          # tsc -p tsconfig.build.json -> dist/
npm run test           # vitest run  (**/*.spec.ts)
npm run test:cov       # cobertura
npm run lint           # oxlint src/ test/
npm run format         # prettier
docker compose up --build
```

- Prefijo global: `/api`. Swagger: `/api/docs`.
- **El `.env` es obligatorio** (`src/config/load-env.ts`): sin él la app no arranca. Copia `.env.example` a `.env`. En Docker se monta como volumen. Nunca subas `.env`.

---

## 3. Arquitectura y estructura

```
src/
├── main.ts                 # importa config/load-env primero; prefijo /api, helmet, cors, cookieParser, ValidationPipe, swagger
├── app.module.ts           # APP_GUARD = AuthGuard (global), APP_FILTER = AllExceptionsFilter
├── database.ts             # TypeOrmModule.forRoot (entidades registradas a mano)
├── config/                 # load-env (exige .env), ConfigService (lee process.env), keys, cors, swagger, cookie
├── common/
│   ├── decorators/         # @Public(), @Roles(...)
│   ├── enums/domain.enums.ts  # TODOS los enums del dominio
│   ├── filters/            # AllExceptionsFilter -> { statusCode, message, path, timestamp }
│   ├── guards/auth.guard.ts   # JWT por Bearer o cookie accessToken + chequeo de roles
│   └── utils/              # UtilsModule @Global: Jwt, Bcrypt, Captcha, TokenExpiry, Logger, Password
└── modules/
    ├── auth/               # HU-006, HU-007
    ├── user/               # soporte de HU-006/HU-002 (CRUD interno, no se amplía)
    └── country/            # HU-002 (a medias)
```

Módulos nuevos esperados: `health` (HU-001), `location` o ampliar `country` (HU-002), `movie` (HU-003/004/005), `notification` (HU-005), `profile` y `membership` (HU-008), `showtime` (HU-009), `seat`/`reservation` (HU-010).

### Patrón por módulo

`Controller → Service → DAO → TypeORM Repository (vía DataSource)`

- **Controller:** HTTP, cookies, lectura de `req`. Sin lógica de negocio.
- **Service:** reglas de negocio y validaciones que dependen de la BD. Lanza `HttpException`s de Nest (`BadRequestException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`).
- **DAO:** solo acceso a datos y **solo de su propia entidad** (ver comentario en `user.dao.ts`). Si necesitas cruzar entidades, hazlo en el service inyectando ambos DAOs. Las transacciones de HU-010 se abren en el service con `DataSource.transaction('SERIALIZABLE', …)`.
- **Entidad nueva:** regístrala en `src/database.ts` (`entities: [...]`) y, si aplica, en `TypeOrmModule.forFeature` del módulo.

---

## 4. Convenciones de código (respétalas)

1. **Imports relativos con extensión `.js`** aunque el archivo sea `.ts` (`import { X } from './x.js'`). Es la convención del repo; con CommonJS compila igual.
2. **El proyecto es CommonJS:** `__dirname` es válido; **no** uses `import.meta` ni top-level `await` (no compilan).
3. **Guard global = todo protegido por defecto.** Un endpoint público necesita `@Public()` explícito. Restringe por rol con `@Roles(UserRole.ADMIN, ...)`; usa los valores de `UserRole`, no strings sueltos.
4. **Enums solo en `common/enums/domain.enums.ts`.** Valida con `@IsIn(enumValues(Enum))`.
5. **Nunca devuelvas la entidad `User` en endpoints de auth**: proyecta con `toAuthUser()` / interfaz `AuthUser`. Columnas sensibles (`password`, `activationToken*`, `resetToken*`) son `select: false`; si las necesitas, `addSelect` explícito en el DAO.
6. **El rol nunca viene del cliente** en alta ni actualización (`UserService.create/update` lo descartan). Registro público usa `RegisterDto` (= `CreateUserDto` sin `role` + captcha).
7. **DTOs:** `ValidationPipe` usa `whitelist + forbidNonWhitelisted + transform`. Todo campo aceptado debe tener decoradores de `class-validator`, o la petición fallará con 400.
8. **Tokens de servidor** (refresh, reset) se guardan como **SHA-256**, no en claro ni con bcrypt. Contraseñas con **bcrypt** (`SALT_ROUNDS`).
9. **Mensajes de error al cliente en español**, genéricos en auth (no revelar si el correo existe, si la firma falló o si expiró). Para el resto, usa los mismos mensajes y códigos que el original.
10. **Comentarios:** el proyecto documenta el *porqué* de cada decisión en JSDoc en español. Mantén ese estilo en código nuevo.
11. **Formato:** Prettier (`singleQuote`, `trailingComma: all`, `printWidth: 100`, 2 espacios, `;`). Ejecuta `npm run format` sobre lo que toques.
12. **Config:** lee secretos con `ConfigService.get/getOrThrow(Config.X)`. Si añades una variable: añádela a `Config` (`config.keys.ts`) **y** a `.env.example` (con valor de ejemplo, nunca real) **y** regístrala en `memory.md`. Variables de las historias: `SEAT_LOCK_MINUTES`, `MAX_SEATS_PER_RESERVATION` (valor por defecto; el backlog lo quiere por función), `RESET_TOKEN_EXPIRES_IN`, `SMTP_*`.

### 4.1 Simplicidad: cero sobreingeniería

**El objetivo es cumplir HU-001 a HU-010, no diseñar el sistema ideal.** La medida de "suficiente" son los criterios de aceptación de `docs/historias-de-usuario.md`. Para lo que el backlog no fije, vale el comportamiento del original.

Antes de escribir código, responde a estas preguntas. Si alguna es "no", no lo hagas:

1. **¿Lo exige un criterio o una regla `RN-0XX` de HU-001 a HU-010?** Si no, no se implementa. Si crees que hace falta, anótalo en `memory.md` → Pendientes como propuesta y sigue.
2. **¿Se usa hoy?** No crees métodos, enums, DTOs, interfaces, decoradores ni utilidades "para después". Se añaden en el commit que los usa por primera vez.
3. **¿Hay más de un caso real?** Una abstracción (clase base, genérico, factory, interfaz con una sola implementación, helper compartido) solo se justifica con **dos o más usos reales**. Con uno, el código va directo donde se usa.
4. **¿Lo resuelve Nest o una librería ya instalada?** Úsalo en lugar de construirlo. No añadas dependencias sin anotarlo en `memory.md` con el motivo. (`@nestjs/schedule` para HU-010 sí está justificado.)
5. **¿Es el cambio más pequeño que cumple el criterio?** Prefiere el diff corto. Nada de refactors "de paso" fuera de la tarea.

**Prohibido sin aprobación explícita de la persona responsable:** CQRS, event sourcing, colas o mensajería, caché distribuida, microservicios, capas extra (repository + DAO + service + facade), Strategy/Factory/Adapter para un único caso, configuración "por si acaso", feature flags, y preparar terreno para HU-011 a HU-029.

**Lo que SÍ es necesario (no es sobreingeniería):** lo que piden las historias aunque parezca complejo (transacción `SERIALIZABLE` y bloqueo de filas en HU-010, auditoría en HU-007 y HU-010), validar la entrada, autenticación y autorización correctas, hash de contraseñas y tokens, y tests del comportamiento. La seguridad no se simplifica.

**Comentarios:** explica el *porqué* de lo que no es obvio en 1–3 líneas. No escribas ensayos sobre decisiones evidentes.

**Código especulativo existente** (ver "Código sin uso" en `memory.md`): no lo amplíes. Elimínalo en un commit propio cuando estés seguro de que nadie lo usa; si una historia lo va a usar, déjalo y anótalo.

### 4.2 Skill `nestjs-best-practices` (`.claude/skills/`)

Úsala como **lista de revisión** (seguridad, errores, validación, N+1), **no como guía de arquitectura**. Si una regla de la skill choca con este archivo, **manda este archivo**. Estas reglas de la skill **no se aplican** en este proyecto:

| Regla de la skill | Por qué no aplica |
|---|---|
| `arch-use-repository-pattern`, `di-use-interfaces-tokens`, `di-interface-segregation`, `di-liskov-substitution` | El patrón del repo es Controller → Service → DAO (§3). No se añaden interfaces ni tokens con una sola implementación (§4.1). |
| `arch-use-events`, `micro-use-patterns`, `micro-use-queues` | Ninguna historia lo pide; está prohibido sin aprobación (§4.1). |
| `perf-use-caching`, `perf-lazy-loading`, `perf-async-hooks` | Ninguna historia lo pide. |
| `devops-use-config-module` | El repo usa su propio `ConfigService` + `load-env.ts` (§4, punto 12). No migrar a `@nestjs/config`. |
| `api-versioning` | La API versionada es HU-029 (fuera de alcance). Solo existe `GET /api/v1/health`. |
| `security-rate-limiting` | No lo pide ninguna historia; el login ya tiene bloqueo por intentos (HU-007). Proponerlo en Pendientes, no implementarlo. |
| `security-auth-jwt` (si sugiere `@nestjs/jwt`/Passport) | El repo usa `jsonwebtoken` directo con `Jwt` de `common/utils`. No migrar. |
| `test-use-testing-module`, `test-e2e-supertest` | Los tests son unitarios con Vitest y dobles `vi.fn()` (§7). E2E solo si una historia lo exige. |

Sí aplican tal cual: `db-use-transactions` (HU-010), `db-use-migrations` (HU-001), `db-avoid-n-plus-one`, `error-*`, `security-validate-all-input`, `security-sanitize-output`, `security-use-guards`, `micro-use-health-checks` (HU-001, sin añadir `@nestjs/terminus` salvo que haga falta).

---

## 5. Contrato HTTP

### 5.1 Rutas: original vs Nest

El original montaba cada ruta con prefijo `/api`, `/api/v1` y sin prefijo. **Nest solo atiende en `/api`.** No se replica `/api/v1`: la API versionada es HU-029 (fuera de alcance). Única excepción: `GET /api/v1/health` (HU-001). Las rutas del backlog (`/movies`, `/auth/login`…) se sirven bajo `/api` (`/api/movies`, `/api/auth/login`).

| Historia | Original | NestJS hoy |
|---|---|---|
| HU-001 | `GET /api/v1/health` | **No existe** |
| HU-002 | `GET /countries`, `/departments/:countryId`, `/cities/:departmentId` | `GET /api/countries`, `/api/departments/:countryId`, `/api/cities/:departmentId` (implementadas) |
| HU-002 | `POST`/`PUT /users/location` | `POST /api/users/location` (JWT) implementado; `PUT` no (fuera de alcance) |
| HU-003/004/005 | `/api/movies/...` | **Parcial:** HU-003 completa: `GET /api/movies`, `/weekly`, `/filter` y `/today` con filtros (`cityId`, `cinemaId`, `genre`, `classification`, `language`, `roomType`, `format`, `date`, `available`); HU-004 completa: `GET /api/movies/:id`, `/:id/functions`, `/:id/recommendations` (`?cityId=` opcional); HU-005 completa salvo prueba manual: `GET /api/movies/upcoming`, `/upcoming/:id` |
| HU-005 | `POST /api/notifications/upcoming` | `POST /api/notifications/upcoming` (JWT, 201) implementado; el correo automático (RN-020) lo envía `ReleaseNotificationJob` cada hora (emulado sin `SMTP_HOST`) |
| HU-006 | `GET /api/auth/captcha`, `POST /api/auth/register` | ✅ |
| HU-006 | `POST /api/auth/verify-email` (+ `GET`, y alias `/activate`) | `POST /api/auth/verify-email` y alias `POST /api/auth/activate` (implementados) |
| HU-006 | `POST /membership/create` | `POST /api/membership/create` (JWT, 201 `{ code, status }`, 409 si ya tiene) implementado |
| HU-007 | `POST /api/auth/login`, `/refresh`, `/logout` | ✅ (+ `logout-all`, `me`); el login audita en `AccessAudits` |
| HU-007 | `POST /api/auth/forgot-password`, `/reset-password` | `POST /api/auth/forgot-password` y `/reset-password` (públicos, 200) implementados |
| HU-008 | `/api/profile`, `/api/membership`, `/benefits` | `GET`/`PUT /api/profile`, `GET /api/membership`, `GET /api/membership/benefits` (JWT) implementados; el cambio de correo queda en `pendingEmail` hasta verificarlo |
| HU-009 | `GET /api/functions/:id`, `/prices` | **No existe** |
| HU-010 | `GET /api/functions/:id/seats`, `/api/reservations/...` | **No existe** |

### 5.2 Autenticación (HU-006, HU-007) en Nest

- Access token: `JWT_SECRET`, 15 min, payload `{ sub, id, email, role }`. Cookie **`accessToken`** (path `/`).
- Refresh token: `JWT_REFRESH_SECRET` (distinto), 7 d, payload `{ sub, typ: 'refresh' }`. Cookie `refresh_token` (path `/api/auth`). Rotación; reutilización ⇒ revoca todas las sesiones.
- Tabla `Sessions`: una sesión viva por usuario (cada login revoca las previas, RN-030), con IP y user-agent (equivale a `RefreshToken` del original).
- Login: bloqueo 15 min tras `MAX_FAILED_ATTEMPTS`; hash ficticio contra enumeración por tiempo.

### 5.3 Conflictos entre el backlog y el código Nest actual (corregir)

| Regla | Backlog | Nest hoy |
|---|---|---|
| HU-007 | El login devuelve también membresía, beneficios y datos del perfil | Devuelve `membership` (con `level`), `benefits` por nivel y `user` |
| HU-010 | Máximo de sillas configurable **por función** | No existe (el original usaba `MAX_SEATS_PER_RESERVATION` global) |

### 5.4 Diferencias de contrato con el original

| Aspecto | Original (Express) | NestJS actual |
|---|---|---|
| Formato de error | `{ error: "mensaje" }` | `{ statusCode, message, path, timestamp }` |
| Código de `login` / `refresh` | `201` | `200` |
| Respuesta de `register` | `{ message, userId }` | `{ user, membership: { code, status }, activationToken? }` |
| `register` crea además | `Profile` + `Membership` pendiente y envía correo | `Membership` Activa (transacción) y correo de activación (emulado sin `SMTP_HOST`); el perfil es solo `User` |
| Teléfono | exactamente 10 dígitos | `^\+?[0-9]{7,15}$` |
| Ciudad en el alta | `city` (texto) | `cityId` (número) |
| Activación ya hecha | `400 "La cuenta ya está activada"` | no se distingue |

Antes de cambiar una diferencia, decide (y registra en `memory.md`) si se **conserva el contrato original** o se **mantiene el de Nest** y se avisa al frontend.

---

## 6. Bugs y problemas

La lista viva está en **`memory.md` → Bugs conocidos**. No la dupliques aquí. Al encontrar uno nuevo, añádelo allí con archivo, causa e historia afectada.

Un problema ⇒ un cambio ⇒ una entrada en `memory.md`. No corrijas todo de golpe en un solo commit.

---

## 7. Tests

- Vitest con `globals: true`; specs junto al código (`*.spec.ts`).
- Los tests unitarios construyen las clases con dobles (`vi.fn()`), sin BD real. Sigue ese patrón.
- **Todo cambio de comportamiento lleva test** (nuevo o actualizado). Todo bug corregido lleva un test que lo reproduzca.
- Cada historia nueva lleva al menos: tests del service (reglas y errores) y del controller (rutas, `@Public`/`@Roles`).
- Equivalentes del original a migrar: `hu001-hu010.routes.test.ts` (contrato), `password-policy.test.ts` (HU-006), `auth-token.test.ts` (HU-007), `reservation.service.test.ts` (HU-010), `movie.service.test.ts` (HU-003/004/005), `health.*.test.ts` (HU-001).
- Antes de dar por terminado un cambio: `npm run test && npm run lint && npm run build`. Anota el resultado en `memory.md`.

---

## 8. Seguridad (no negociable)

- No registres en logs contraseñas, tokens ni hashes (la única excepción existente es el token de activación **solo fuera de producción**; no la amplíes).
- No relajes `@Public()` ni `@Roles()` para "hacer que funcione"; arregla la causa.
- No expongas campos `select: false` en respuestas.
- No commitees `.env` ni valores reales en `.env.example`.
- Ante la duda entre compatibilidad con el frontend y seguridad, para y regístralo en `memory.md` como decisión pendiente para el equipo.

---

## 9. Git

- Commits con Conventional Commits, como el historial: `feat: ...`, `fix: ...`, `refactor: ...`, `test: ...`, `docs: ...`, `chore: ...`, `build: ...`.
- Cada commit incluye su actualización de `memory.md`.
- Trabaja sobre `feature/develop`. No hagas push ni merge a `develop`/`main` sin que lo pida una persona.

---

## 10. Checklist antes de terminar cualquier tarea

- [ ] Leí `memory.md` al empezar.
- [ ] El cambio pertenece a una historia **HU-001 a HU-010** (y no a "Fuera de alcance").
- [ ] Revisé las reglas `RN-0XX` y los criterios de aceptación de esa historia en `docs/historias-de-usuario.md`.
- [ ] Pasa las 5 preguntas de simplicidad (§4.1): nada especulativo, ninguna abstracción con un solo uso, ninguna dependencia nueva sin justificar.
- [ ] Imports con `.js`, enums centralizados, DTOs validados, sin exponer campos sensibles.
- [ ] Tests añadidos/actualizados; `test`, `lint` y `build` en verde.
- [ ] `.env.example` y `Config` actualizados si añadí variables.
- [ ] **`memory.md` actualizado** (registro de cambios + estado por historia + pendientes/bugs + decisiones).
