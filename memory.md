# memory.md — RiwiTV NestJS

> Memoria de trabajo del proyecto. **Se actualiza con cada cambio** (ver `agent.md`, sección 0).
> Rama: `feature/develop` (incluye `feature/authentication` hasta `35c326d` feat: docker).

## Estado actual

| Área | Estado | Notas |
|---|---|---|
| Auth: captcha | Implementado, con bug | Devuelve la respuesta al cliente (ver Bugs #1) |
| Auth: registro + activación | Implementado | Cuenta nace INACTIVA; token 24 h; sin envío de correo aún (nodemailer instalado, no usado) |
| Auth: login | Implementado | Bloqueo 15 min tras `MAX_FAILED_ATTEMPTS`; hash ficticio anti-enumeración |
| Auth: refresh con rotación | Implementado, con bug | Cookie `refresh_token` con path incorrecto (Bugs #2) |
| Auth: logout / logout-all / me | Implementado | `revokeAllSessions` filtra mal (Bugs #3) |
| Usuarios: CRUD | Parcial | Falta control de propiedad y alinear contrato con la API original |
| Rutas heredadas `/api/users/auth`, `/api/users/legacy-login` | No migradas | Pendiente confirmar si algún cliente las usa |
| Migraciones / seeders | No existen | `synchronize: true` |
| Swagger | Básico | Sin metadatos ni `@ApiProperty` |

## Contexto de la migración

- Origen: `github.com/MateoMg06/RIWI-TV-PUBLIC` (Express + Sequelize). Referencia por defecto: **`origin/main`**.
- `INSTRUCTIONS.md` se basó en `develop` del original, que no tiene reservas, perfil, membresía, notificaciones, forgot/reset ni auditoría. `main` sí los tiene.
- Ramas `feature/controller` y `feature/movie-module` del repo Nest usan otra estructura y su diff borra `auth`/`user`: **no hacer merge**, traer archivos a mano.
- Fuera de esta rama, falta migrar: Country/Department/City (a medias), Movie, Cinema, Showtime, Seat, Reservation (+ job), Membership, Profile, Notification, Health, seeders, migraciones, Docker, Postman y tests del original.

## Decisiones

- Sesiones en tabla `Sessions` (N por usuario), refresh token guardado como SHA-256.
- Refresh firmado con secreto distinto al access; refresh sin rol ni email.
- El rol nunca se acepta del cliente en `UserService.create/update`; registro público usa `RegisterDto` sin `role`.
- `cityId` numérico en lugar de nombre de ciudad en el usuario.
- Teléfono y documento como `string`.

## Pendientes (alcance de esta rama: U.1–U.3 de INSTRUCTIONS.md)

- [ ] Comparar endpoints antiguos de usuarios con `/user` y `/auth` y documentar diferencias de contrato.
- [ ] Decidir sobre `/api/users/auth` y `/api/users/legacy-login` (¿algún cliente las usa?).
- [ ] Verificar equivalencia de respuestas de creación, listado, actualización y validaciones.
- [ ] Autorización: un `usuario` solo puede ver/editar/borrar su propia cuenta; admin conserva permisos.
- [ ] Revisar flujo completo: registro → activación → login → refresh → logout → me.
- [ ] Mantener rutas de compatibilidad si el frontend aún las necesita.
- [ ] **Decidir** qué contrato manda: original o Nest. Diferencias en `agent.md` §5: cookie `accessToken` vs `access_token`, formato de error, 201 vs 200, respuesta de register, `/users` vs `/user`, prefijos `/api/v1`.
- [ ] `POST /auth/forgot-password` y `POST /auth/reset-password` + entidad `PasswordResetToken`.
- [ ] Servicio de email (nodemailer) para activación y recuperación.
- [ ] Auditoría de acceso (`AccessAudit`) en login, login_failed, refresh, logout, reset y activación.
- [ ] `POST`/`PUT /users/location` (asignar `cityId`).
- [ ] Alias de activación: `POST /auth/verify-email`, `GET /auth/activate`, `GET /auth/verify-email`.
- [ ] Coordinar con la rama de Profile/Membership: en el original, `register` crea también `Profile` y `Membership` pendiente.

## Bugs conocidos

1. [ ] `GET /auth/captcha` expone `answer` — `src/modules/auth/auth.controller.ts`, `src/common/utils/captcha.ts`.
2. [ ] Cookie `refresh_token` con `path: '/auth'` pero la ruta real es `/api/auth` — `auth.controller.ts`.
3. [ ] `revokedAt: undefined` no filtra en TypeORM; usar `IsNull()` — `src/modules/auth/auth.dao.ts`.
4. [ ] `__dirname` en ESM — `src/config/config.service.ts`.
5. [ ] `.env` no se carga en `process.env` pero varios módulos lo leen de ahí — `database.ts`, `cors.ts`, `auth.service.ts`, `user.service.ts`.
6. [ ] `/user/:id` sin control de propiedad; `POST /user` sin `@Roles`; `+id` sin `ParseIntPipe` — `src/modules/user/user.controller.ts`.
7. [ ] Política de contraseña inconsistente (DTO 8–72 vs validador ≥10 + complejidad).
8. [ ] `AuthPayload` declara `name`/`membership` que el token no trae.
9. [ ] Credenciales de ejemplo de ObserveModule en `app.module.ts`; nombres de variables inconsistentes en `.env.example`.
10. [ ] Captcha en memoria (no escala; limpieza nunca se ejecuta).
11. [ ] Sin migraciones (`synchronize: true`).
12. [ ] Swagger con datos de relleno y puerto 3000 fijo en el log.
13. [ ] `tsconfig.build.tsbuildinfo` versionado.
14. [ ] `.env.example` con secretos que parecen reales (JWT, Observe, `SEED_API_KEY`): reemplazar y rotar.
15. [ ] Email no implementado (nodemailer instalado sin uso).

## Registro de cambios

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
