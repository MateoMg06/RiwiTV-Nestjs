# agent.md — RiwiTV NestJS (rama `feature/authentication`)

Guía para cualquier agente de IA (Claude, Copilot, Cursor, Codex…) que trabaje en este repositorio.
Léela completa antes de tocar código. Después lee `memory.md`.

---

## 0. REGLA OBLIGATORIA: mantener `memory.md` actualizado

> **Por cada cambio que hagas en el repositorio —por pequeño que sea— DEBES actualizar `memory.md` en la raíz del proyecto, en el mismo commit/entrega que el cambio.**

Esto no es opcional ni se deja "para el final". Un cambio sin su entrada en `memory.md` se considera **incompleto**.

### Flujo de trabajo obligatorio

1. **Antes de empezar:** lee `memory.md` completo (estado actual, decisiones, pendientes, bugs conocidos). No repitas trabajo ya hecho ni contradigas decisiones registradas sin justificarlo.
2. **Haz el cambio.**
3. **Inmediatamente después de cada cambio** (no al final de la sesión), actualiza `memory.md`:
   - Añade una entrada al **Registro de cambios** (más reciente arriba) con el formato de la sección 0.1.
   - Actualiza la sección **Estado actual** si cambió algo del estado de un módulo o endpoint.
   - Marca/actualiza los ítems de **Pendientes** y **Bugs conocidos** que hayas resuelto o descubierto.
   - Si tomaste una decisión de diseño no obvia, regístrala en **Decisiones**.
4. **Verifica** (`npm run test`, `npm run lint`, `npm run build`) y anota el resultado en la entrada.
5. Si `memory.md` no existe, créalo con la plantilla de la sección 0.2 antes de hacer cualquier otro cambio.

### Qué cuenta como "cambio"

Todo: código, DTOs, entidades, tests, configuración, `.env.example`, dependencias, documentación, renombres, borrados. Si `git status` muestra algo distinto, hay que registrarlo.

### Reglas de escritura de `memory.md`

- Escribe en español, frases cortas, hechos verificables. Nada de "mejoras varias".
- Nombra siempre los archivos con su ruta relativa (`src/modules/auth/auth.service.ts`).
- Nunca pegues secretos, tokens, contraseñas ni valores reales de `.env` en `memory.md`.
- No borres entradas antiguas del registro; si algo quedó obsoleto, añade una nueva entrada que lo diga.
- Si el registro supera ~300 líneas, mueve las entradas más antiguas a `memory-archive.md` y deja un enlace.

### 0.1 Formato de cada entrada del registro

```md
### AAAA-MM-DD — <tipo>: <resumen en una línea>
- **Archivos:** `ruta/a/archivo.ts`, `otra/ruta.ts`
- **Qué:** qué cambió (comportamiento, no solo código).
- **Por qué:** motivo / ítem de INSTRUCTIONS.md o bug que resuelve.
- **Impacto:** endpoints, contrato con el frontend, BD, variables de entorno afectadas (o "ninguno").
- **Verificación:** `npm run test` ✅/❌ · `npm run lint` ✅/❌ · `npm run build` ✅/❌ · prueba manual si aplica.
- **Pendiente derivado:** lo que queda por hacer a raíz de este cambio (o "ninguno").
```

`<tipo>` usa los mismos prefijos que los commits: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`.

### 0.2 Plantilla mínima de `memory.md`

```md
# memory.md — RiwiTV NestJS

## Estado actual
## Decisiones
## Pendientes
## Bugs conocidos
## Registro de cambios
```

---

## 1. Contexto del proyecto

- **Qué es:** API de RiwiTV (cartelera de cines: películas, cines, funciones, ubicación geográfica, usuarios). Se está **migrando de Node/Express + Sequelize a NestJS + TypeORM**.
- **Rama de trabajo:** `feature/authentication` (la "rama auth"). Rama base de integración: `develop`. Remoto: `github.com/MateoMg06/RiwiTV-Nestjs`.
- **Alcance de esta rama:** **solo usuarios y autenticación**: secciones U.1, U.2 y U.3 de `INSTRUCTIONS.md` **más** las piezas de auth que existen en `origin/main` del original (forgot/reset password, email de activación, auditoría de acceso, `/users/location`; ver 1.1 y 1.2). Películas, cines, funciones, ubicación, reservas, perfil, membresía y notificaciones pertenecen a otras ramas.
  - Puedes tocar lógica de negocio adyacente **solo** si es necesario para que usuarios/auth funcionen, y nada más allá (regla explícita de `INSTRUCTIONS.md`).
- **Entregable de la rama:** módulo de usuarios y autenticación funcional y compatible con el proyecto original y su frontend.

`INSTRUCTIONS.md` es la fuente de verdad del alcance. Si hay conflicto entre este archivo e `INSTRUCTIONS.md`, manda `INSTRUCTIONS.md`; regístralo en `memory.md`.

### 1.1 Proyecto origen (lo que se migra)

- **Repo original (Express + Sequelize):** `https://github.com/MateoMg06/RIWI-TV-PUBLIC.git`. Código en `app/src/` (`routes/`, `controllers/`, `services/`, `repositories/`, `models/`, `middlewares/`, `migrations/`, `seeders/`, `docs/postman/`).
- **Repo destino (este):** `https://github.com/MateoMg06/RiwiTV-Nestjs.git`.
- Para consultar el original, clónalo **fuera** de este repo (p. ej. `../RIWI-TV-PUBLIC`) y léelo con `git show origin/<rama>:app/src/<ruta>`. Nunca copies archivos de Sequelize tal cual: se reescriben con TypeORM y el patrón de la sección 3.

> ⚠️ **`develop` y `main` del original NO son iguales.** `INSTRUCTIONS.md` se escribió mirando `develop`, que solo tiene usuarios, películas, cines, funciones y ubicación. **`main` es más completo** y además tiene: `auth.routes` (forgot/reset password, verify-email), `profile`, `membership`, `reservation` (bloqueo de butacas + job de limpieza), `notification`, `location`, `email.service`, y los modelos `Seat`, `SeatLock`, `Membership`, `Profile`, `PurchaseHistory`, `ReleaseNotification`, `AccessAudit`, `PasswordResetToken`, `RefreshToken`.
> **Referencia por defecto: `origin/main` del original.** Si una tarea depende de la diferencia entre ramas, anótalo en `memory.md` como decisión.

### 1.2 Hoja de ruta global de la migración (contexto; solo la parte de auth es de esta rama)

| # | Bloque | Rama donde corresponde |
|---|---|---|
| 1 | Corregir bugs base (ConfigService ESM, cookie refresh, Observe) | **esta rama** |
| 2 | Country / Department / City (+ `GET /cities/:id/cinemas`) | otra rama |
| 3 | Movie (partir de `origin/feature/movie-module` del repo Nest) | otra rama |
| 4 | Cinema, Showtime (`/functions`), Seat | otra rama |
| 5 | Reservation (`lock-seats`, `release-seats`, `summary`) + job de limpieza (`@nestjs/schedule`) | otra rama |
| 6 | Membership y Profile | otra rama |
| 7 | Forgot/reset password, email (nodemailer), auditoría de acceso, `/users/location` | **esta rama** |
| 8 | Notification y Health (`/api/v1/health`) | otra rama |
| 9 | Seeders, migraciones TypeORM, Docker, Postman, tests | compartido (coordinar) |

> ⚠️ **No hagas merge de `origin/feature/controller` ni `origin/feature/movie-module` del repo Nest en esta rama.** Usan otra estructura (`src/country/...` en vez de `src/modules/...`) y su diff **borra `auth` y `user`**. Si necesitas algo de ahí, trae los archivos a mano (`git show origin/<rama>:<ruta>`), adáptalos y regístralo en `memory.md`.

---

## 2. Stack y comandos

| Pieza | Versión / herramienta |
|---|---|
| Runtime | Node, **ESM** (`"type": "module"`), TS `module: nodenext` |
| Framework | NestJS 12 (`@nestjs/core`, `platform-express`, `swagger`, `typeorm`, `observe`) |
| BD | PostgreSQL vía TypeORM 1.x (`pg`) |
| Validación | `class-validator` + `class-transformer` (ValidationPipe global) |
| Auth | `jsonwebtoken` (access + refresh), `bcryptjs`, cookies httpOnly (`cookie-parser`) |
| Seguridad HTTP | `helmet`, `cors` |
| Tests | **Vitest** (no Jest, aunque estén instaladas sus dependencias) |
| Lint / formato | `oxlint` (script `lint`), ESLint config disponible, Prettier |

```bash
npm install
npm run start:dev      # desarrollo con watch
npm run build          # nest build -> dist/
npm run test           # vitest run  (**/*.spec.ts)
npm run test:cov       # cobertura
npm run test:e2e       # **/*.e2e-spec.ts (aún no hay)
npm run lint           # oxlint src/ test/
npm run format         # prettier
```

- Prefijo global: `/api`. Swagger: `/api/docs`.
- Copia `.env.example` a `.env` antes de arrancar. Nunca subas `.env`.

---

## 3. Arquitectura y estructura

```
src/
├── main.ts                 # bootstrap: prefijo /api, helmet, cors, cookieParser, ValidationPipe, swagger
├── app.module.ts           # APP_GUARD = AuthGuard (global), APP_FILTER = AllExceptionsFilter
├── database.ts             # TypeOrmModule.forRoot (entidades registradas a mano)
├── config/                 # ConfigService propio (lee .env + process.env), keys, cors, swagger, cookie
├── common/
│   ├── decorators/         # @Public(), @Roles(...)
│   ├── enums/domain.enums.ts  # TODOS los enums del dominio (UserRole, AccountStatus, Membership…)
│   ├── filters/            # AllExceptionsFilter -> { statusCode, message, path, timestamp }
│   ├── guards/auth.guard.ts   # JWT por Bearer o cookie access_token + chequeo de roles
│   └── utils/              # UtilsModule @Global: Jwt, Bcrypt, Captcha, TokenExpiry, Logger, Password
└── modules/
    ├── auth/               # controller, service, dao, dto, entities/session, interfaces, decorators/CurrentUser
    ├── user/               # controller, service, dao, entity, create/update DTO
    └── country/            # (fuera de alcance de esta rama) country/department/city
```

### Patrón por módulo

`Controller → Service → DAO → TypeORM Repository (vía DataSource)`

- **Controller:** HTTP, cookies, lectura de `req`. Sin lógica de negocio.
- **Service:** reglas de negocio y validaciones que dependen de la BD. Lanza `HttpException`s de Nest (`BadRequestException`, `ConflictException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`).
- **DAO:** solo acceso a datos y **solo de su propia entidad** (ver comentario en `user.dao.ts`). Si necesitas cruzar entidades, hazlo en el service inyectando ambos DAOs.
- **Entidad nueva:** regístrala en `src/database.ts` (`entities: [...]`) y, si aplica, en `TypeOrmModule.forFeature` del módulo.

---

## 4. Convenciones de código (respétalas)

1. **Imports ESM con extensión `.js`** aunque el archivo sea `.ts`: `import { X } from './x.js'`. Olvidarlo rompe el build/runtime.
2. **Nada de `__dirname`/`require`** (es ESM). Usa `import.meta.dirname`.
3. **Guard global = todo protegido por defecto.** Un endpoint público necesita `@Public()` explícito. Restringe por rol con `@Roles('admin', ...)`; usa los valores de `UserRole`, no strings sueltos, en código nuevo.
4. **Enums solo en `common/enums/domain.enums.ts`.** Valida con `@IsIn(enumValues(Enum))`.
5. **Nunca devuelvas la entidad `User` en endpoints de auth**: proyecta con `toAuthUser()` / interfaz `AuthUser`. Columnas sensibles (`password`, `activationToken*`, `resetToken*`) son `select: false`; si las necesitas, `addSelect` explícito en el DAO.
6. **El rol nunca viene del cliente** en alta ni actualización (`UserService.create/update` lo descartan). Registro público usa `RegisterDto` (= `CreateUserDto` sin `role` + captcha).
7. **DTOs:** `ValidationPipe` usa `whitelist + forbidNonWhitelisted + transform`. Todo campo aceptado debe tener decoradores de `class-validator`, o la petición fallará con 400.
8. **Tokens de servidor** (refresh) se guardan como **SHA-256**, no en claro ni con bcrypt. Contraseñas con **bcrypt** (`SALT_ROUNDS`).
9. **Mensajes de error al cliente en español**, genéricos en auth (no revelar si el correo existe, si la firma falló o si expiró).
10. **Comentarios:** el proyecto documenta el *porqué* de cada decisión en JSDoc en español. Mantén ese estilo en código nuevo.
11. **Formato:** Prettier (`singleQuote`, `trailingComma: all`, `printWidth: 100`, 2 espacios, `;`). Ejecuta `npm run format` sobre lo que toques.
12. **Config:** lee secretos con `ConfigService.get/getOrThrow(Config.X)`. Si añades una variable: añádela a `Config` (`config.keys.ts`) **y** a `.env.example` (con valor de ejemplo, nunca real) **y** regístrala en `memory.md`.

---

## 5. Autenticación: cómo funciona hoy

| Método | Ruta (con prefijo) | Público | Descripción |
|---|---|---|---|
| GET | `/api/auth/captcha` | ✅ | Reto matemático (token + pregunta), TTL 5 min, uso único, en memoria |
| POST | `/api/auth/register` | ✅ | Valida captcha → crea usuario INACTIVO, rol `usuario` → token de activación (24 h). Fuera de prod lo devuelve en la respuesta |
| POST | `/api/auth/activate` | ✅ | `{ token }` hex de 64 → activa la cuenta e invalida el token |
| POST | `/api/auth/login` | ✅ | Email + password. Bloqueo temporal (15 min) tras `MAX_FAILED_ATTEMPTS`. Hash ficticio contra enumeración por tiempo. Emite access + refresh y crea `Session` |
| POST | `/api/auth/refresh` | ✅ | Refresh por body o cookie. **Rotación**; reutilización ⇒ revoca todas las sesiones |
| POST | `/api/auth/logout` | ✅ | Revoca la sesión del refresh token (idempotente, 204) |
| POST | `/api/auth/logout-all` | 🔒 | Revoca todas las sesiones del usuario |
| GET | `/api/auth/me` | 🔒 | `{ id, email, role }` del access token |
| POST | `/api/user` | 🔒 | Crear usuario |
| GET | `/api/user` | 🔒 admin | Listar |
| GET/PATCH/DELETE | `/api/user/:id` | 🔒 admin, usuario | Ver / actualizar / borrar |

- Access token: `JWT_SECRET`, por defecto 15 min, payload `{ sub, id, email, role }`.
- Refresh token: `JWT_REFRESH_SECRET` (distinto), por defecto 7 d, payload `{ sub, typ: 'refresh' }`.
- Cookies: `access_token` (path `/`) y `refresh_token`, `httpOnly`, `sameSite: strict`, `secure` en producción.
- Tabla `Sessions`: N sesiones por usuario (móvil, laptop, TV) con IP y user-agent.

### Mapeo con la API original (Express) que hay que contrastar

| Original | NestJS |
|---|---|
| `POST /api/users` | `POST /api/user` |
| `POST /api/users/register` | `POST /api/auth/register` |
| `GET /api/users` | `GET /api/user` |
| `POST /api/users/login` | `POST /api/auth/login` |
| `POST /api/users/refresh` | `POST /api/auth/refresh` |
| `POST /api/users/logout` | `POST /api/auth/logout` |
| `PUT /api/users/:id` | `PATCH /api/user/:id` |
| `POST /api/users/register`, `GET /api/users/getUsers` (alias) | **No migradas** |
| `POST`/`PUT /api/users/location` (asignar `cityId` al usuario autenticado) | **No migrada** |
| `/api/users/auth`, `/api/users/legacy-login` | **No migradas.** Confirmar si algún cliente las usa antes de descartarlas |
| `POST /api/auth/verify-email`, `GET /api/auth/activate`, `GET /api/auth/verify-email` (alias de activar) | **No migradas** (solo existe `POST /api/auth/activate`) |
| `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | **No migradas** |

El original además montaba las mismas rutas con prefijos `/api/v1/...` y sin prefijo (`/auth`, `/profile`…). Nest solo atiende en `/api`. Decidir con el frontend si se versiona o si el frontend se adapta.

### Diferencias de contrato con el original (verificadas en `origin/main`)

| Aspecto | Original (Express) | NestJS actual |
|---|---|---|
| Cookie del access token | `accessToken` | `access_token` |
| Formato de error | `{ error: "mensaje" }` | `{ statusCode, message, path, timestamp }` |
| Código de `login` / `refresh` | `201` | `200` |
| Respuesta de `register` | `{ message, userId }` | `{ user, activationToken? }` |
| `register` crea además | `Profile` + `Membership` (estado `pending`) y envía correo de activación | solo `User`; el token se escribe en el log |
| Teléfono | exactamente 10 dígitos | `^\+?[0-9]{7,15}$` |
| Ciudad en el alta | `city` (texto) | `cityId` (número) |
| Activación ya hecha | `400 "La cuenta ya está activada"` | no se distingue |
| Auditoría | `AccessAudit` en login, login_failed, refresh, logout, password_reset_requested, password_reset, account_activated | no existe |
| Recuperación de contraseña | `PasswordResetToken` (`token`, `expiresAt`, `used`) | no existe |
| Ruta del recurso usuario | `/api/users` | `/api/user` |

Antes de cambiar cualquiera de estas diferencias, decide (y registra en `memory.md`) si se **conserva el contrato original** por compatibilidad con el frontend o si se **mantiene el de Nest** y se avisa al frontend. Si añades rutas de compatibilidad, documenta qué cliente las necesita y por qué.

---

## 6. Problemas detectados en el código actual (verificar y corregir dentro del alcance)

Encontrados al revisar `feature/authentication` (commit `ca1a330`). Cópialos a "Bugs conocidos" de `memory.md` y márcalos al resolverlos.

1. **Captcha anulado:** `GET /auth/captcha` devuelve el `CaptchaChallenge` completo, **incluida `answer`**. El cliente solo debe recibir `{ token, question }`.
2. **Cookie de refresh inalcanzable:** se emite con `path: '/auth'`, pero con el prefijo global la ruta real es `/api/auth/...`; el navegador nunca la envía a `refresh`/`logout`. Debe ser `/api/auth` (y lo mismo en `clearCookie`).
3. **`revokedAt: undefined` en `AuthDao`** (`findActiveSessions`, `revokeAllSessions`): TypeORM ignora `undefined` en el `where`, así que no filtra por "no revocadas". Usar `IsNull()`.
4. **`ConfigService` usa `__dirname`** en un proyecto ESM ⇒ `ReferenceError` en desarrollo. Usar `import.meta.dirname`.
5. **`ConfigService` no carga `.env` en `process.env`**, pero `database.ts`, `SALT_ROUNDS`, `JWT_*_EXPIRES_IN` y `cors.ts` leen `process.env` directamente. Fuera de Docker esas variables pueden quedar vacías. Unificar la lectura.
6. **Autorización de `/user`:**
   - `POST /user` lo puede usar cualquier usuario autenticado (sin `@Roles`). Decidir si es solo admin.
   - `GET/PATCH/DELETE /user/:id` con rol `usuario` **no comprueba que el id sea el suyo** ⇒ puede leer/modificar/borrar cuentas ajenas. Requisito explícito de `INSTRUCTIONS.md`.
   - `:id` se convierte con `+id` sin `ParseIntPipe`.
7. **Política de contraseña inconsistente:** `CreateUserDto` acepta 8–72 caracteres, `Password.validatePassword` exige ≥10 + mayúscula, minúscula, dígito y símbolo. Alinear (y que el mensaje diga los requisitos).
8. **`AuthPayload`** declara `name` y `membership` como obligatorios, pero el token no los incluye.
9. **ObserveModule** con credenciales de ejemplo `YOUR_APP_KEY`/`YOUR_APP_SECRET` hardcodeadas en `app.module.ts`; además `.env.example` mezcla `OBSERVER_APP_KEY` y `OBSERVE_APP_SECRET`.
10. **Captcha en memoria:** no funciona con varias instancias y `cleanExpiredCaptchas()` nunca se ejecuta. Aceptable en dev; documentar.
11. **BD:** `synchronize: true` y no existe carpeta `src/migrations`. `INSTRUCTIONS.md` pide migración inicial que cree la BD desde cero (es de la sección 5; coordinar antes de abordarlo).
12. **Swagger:** título/versión de relleno, log con puerto 3000 fijo, DTOs sin `@ApiProperty`.
13. `tsconfig.build.tsbuildinfo` está versionado; debería ir en `.gitignore`.
14. **`.env.example` contiene secretos que parecen reales** (`JWT_SECRET`, `JWT_REFRESH_SECRET`, claves de Observe, `SEED_API_KEY`). Sustituirlos por valores de ejemplo y **rotarlos** si alguna vez se usaron.
15. **Email no implementado:** `nodemailer` está instalado y `.env.example` tiene `SMTP_*`, pero no hay servicio de correo; la activación solo se registra en el log.

No corrijas todo de golpe en un solo commit: un problema ⇒ un cambio ⇒ una entrada en `memory.md`.

---

## 7. Tests

- Vitest con `globals: true`; specs junto al código (`*.spec.ts`). Existen para: `auth.guard`, `auth.controller`, `auth.service`, `auth.dao`, `user.controller`, `user.service`.
- Los tests unitarios construyen las clases con dobles (`vi.fn()`), sin BD real. Sigue ese patrón.
- **Todo cambio de comportamiento lleva test** (nuevo o actualizado). Todo bug corregido lleva un test que lo reproduzca.
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
- Trabaja sobre `feature/authentication`; no hagas push ni merge a `develop`/`main` sin que lo pida una persona.

---

## 10. Checklist antes de terminar cualquier tarea

- [ ] Leí `memory.md` al empezar.
- [ ] El cambio está dentro del alcance de usuarios/auth.
- [ ] Imports con `.js`, enums centralizados, DTOs validados, sin exponer campos sensibles.
- [ ] Tests añadidos/actualizados; `test`, `lint` y `build` en verde.
- [ ] `.env.example` y `Config` actualizados si añadí variables.
- [ ] **`memory.md` actualizado** (registro de cambios + estado + pendientes/bugs + decisiones).
