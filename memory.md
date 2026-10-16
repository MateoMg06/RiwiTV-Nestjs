# memory.md — RiwiTV NestJS

> Memoria de trabajo del proyecto. **Se actualiza con cada cambio** (ver `agent.md`, sección 0).
> Rama: `feature/develop` (incluye `feature/authentication` hasta `35c326d` feat: docker).
> **Alcance: solo HU-001 a HU-010.** Requisitos: `docs/historias-de-usuario.md` (backlog oficial). Ver `agent.md` §1.

## Estado por historia (HU-001 a HU-010)

| HU | Estado | Hecho en Nest | Falta |
|---|---|---|---|
| HU-001 | Parcial | Capas, `.env` obligatorio, Docker Compose, Swagger, logger, Vitest, oxlint, Prettier, Helmet, CORS | `GET /api/v1/health` (200), migraciones automáticas al arrancar (hoy `synchronize: true`), ambientes Dev/QA/Prod |
| HU-002 | Parcial | Entidades Country/Department/City | Services stub, ruta `pais`; rutas `/countries`, `/departments/:countryId`, `/cities/:departmentId`; no permitir ciudades inactivas; ciudad con al menos un cine activo (RN-006); `POST /users/location` |
| HU-003 | No iniciada | — | Movie, Showtime, Cinema (lectura); cartelera de 7 días y de hoy, solo funciones activas; filtros fecha, género, clasificación, idioma, tipo de sala, formato, complejo y "Disponible" (base en `origin/feature/movie-module`) |
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

## Pendientes

Transversales:
- [ ] **Decidir** qué contrato manda (original o Nest): formato de error, 201 vs 200, respuesta de register, prefijos `/api/v1` y sin prefijo. Ver `agent.md` §5.
- [ ] Revisar flujo completo: registro → activación → login → refresh → logout.
- [ ] Migrar tests de contrato del original (`hu001-hu010.routes.test.ts` y relacionados).

Por historia:
- [ ] HU-001: `GET /api/v1/health` (200); migración inicial TypeORM ejecutada al arrancar y quitar `synchronize: true`; seeders de demostración.
- [ ] HU-002: completar Country/Department/City (solo lectura, activos, RN-006); `POST /users/location`.
- [ ] HU-003: módulo Movie + Showtime + Cinema (lectura); cartelera de 7 días y de hoy; filtros (incluye "Disponible", RN-011).
- [ ] HU-004: detalle completo con precio por formato; funciones futuras de la ciudad; recomendaciones.
- [ ] HU-005: próximos estrenos; `POST /notifications/upcoming` sin duplicados; correo al pasar a "En Cartelera".
- [ ] HU-006: `register` crea `Profile`, `Membership` **Activa** con código único, historial vacío, billetera vacía y preferencias; correo de activación (nodemailer); `POST /auth/verify-email`; `POST /membership/create`; `CreateUserDto` con mínimo 10 caracteres.
- [ ] HU-007: invalidar el refresh anterior en cada login (RN-030); login devuelve membresía, beneficios y perfil; `POST /auth/forgot-password` y `/reset-password` + `PasswordResetToken`; `AccessAudit` (IP y dispositivo) en login, login fallido, refresh, logout, reset y activación.
- [ ] HU-008: `GET`/`PUT /profile`, `GET /membership`, `/membership/benefits`; reservas activas; cambio de correo con nueva validación.
- [ ] HU-009: `GET /functions/:id`, `/prices`; solo funciones activas y no iniciadas.
- [ ] HU-010: `GET /functions/:id/seats`, `POST /reservations/lock-seats`, `DELETE /reservations/release-seats`, `GET /reservations/summary`; job de liberación (`@nestjs/schedule`); máximo de sillas por función; auditoría de bloqueos; variable `SEAT_LOCK_MINUTES`.

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
14. [ ] `.env.example` con secretos que parecen reales (JWT, Observe, `SEED_API_KEY`): reemplazar y rotar.
15. [ ] Email no implementado (nodemailer instalado sin uso).
16. [x] `agent.md` §2 y §4 dicen ESM / `import.meta.dirname`, pero desde `35c326d` el proyecto es CommonJS (`__dirname` es válido).
17. [ ] HU-007 RN-030: el login no invalida el refresh token anterior; `Sessions` permite N sesiones simultáneas — `src/modules/auth/auth.service.ts`.
18. [ ] HU-007: la respuesta de login no incluye membresía, beneficios ni datos del perfil — `src/modules/auth/auth.service.ts`.

## Registro de cambios

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
