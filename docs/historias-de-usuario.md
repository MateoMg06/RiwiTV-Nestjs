# Historias de usuario HU-001 a HU-010 — Plataforma Web Multicine

Transcripción del backlog oficial (`Historia de usuario NodeJS Multicine Riwi (1).pdf`, páginas 1–35).
**Esta es la fuente de verdad de los requisitos.** Solo se implementan estas diez historias; HU-011 en adelante
(carrito, confitería, pagos, entradas, notificaciones generales, reprogramación, transferencias, bonos de regalo,
Cine Flash, panel administrativo, IA, puntos, QR de acceso, dashboard, promociones, encuestas, PQRS, API pública)
quedan **fuera de alcance**.

> Nota de migración: el backlog describe el stack original (Express, Sequelize, Jest, ESLint). En este repo el
> equivalente es NestJS, TypeORM, Vitest y oxlint. Los requisitos funcionales y las reglas de negocio no cambian.

---

## HU-001 — Configuración de la Plataforma Base

| Épica | Sprint | Prioridad | Story Points | Dependencias |
|---|---|---|---|---|
| Arquitectura e Infraestructura | 1 | Crítica | 8 | Ninguna |

**Historia:** Como equipo de desarrollo quiero disponer de una arquitectura base del proyecto utilizando NodeJS, Express, PostgreSQL y Docker para desarrollar todas las funcionalidades del sistema bajo un entorno estandarizado, escalable y fácilmente desplegable.

**Objetivo:** Construir la estructura inicial del backend siguiendo buenas prácticas de arquitectura, desacoplamiento y seguridad, permitiendo que cualquier desarrollador pueda levantar el proyecto mediante Docker Compose.

**Descripción funcional:**
- Arquitectura modular que permita crecer sin afectar componentes existentes.
- Preparada para múltiples ambientes: Development, QA y Producción.
- Expone inicialmente un endpoint de salud (Health Check).
- Incluye: NodeJS LTS, ExpressJS, PostgreSQL, Sequelize ORM, Docker, Docker Compose, variables de entorno, Swagger, Jest, ESLint, Prettier, Helmet, CORS.
- Carpetas: `config`, `controllers`, `services`, `repositories`, `middlewares`, `routes`, `models`, `migrations`, `seeders`, `utils`, `helpers`, `tests`, `docs`.

**Flujo:** Levantar Docker → Inicializar PostgreSQL → Ejecutar migraciones → Levantar API → Validar Health Check → Swagger disponible.

**Reglas de negocio:**
- **RN-001:** La aplicación deberá iniciar utilizando únicamente Docker Compose.
- **RN-002:** Toda configuración deberá provenir de variables de entorno.
- **RN-003:** La documentación Swagger deberá generarse automáticamente.
- **RN-004:** Todos los módulos deberán implementar separación Controller → Service → Repository.
- **RN-005:** La aplicación deberá soportar futuras integraciones mediante API REST.

**Endpoints:** `GET /api/v1/health`

**Criterios de aceptación:**
- Docker levanta correctamente todos los servicios.
- PostgreSQL inicia automáticamente.
- Swagger responde correctamente.
- Health Check responde HTTP 200.
- Se ejecutan migraciones automáticamente.
- Jest configurado.
- Logger funcionando.

**Definition of Done:** Código en Git · Docker funcionando · Swagger publicado · Jest configurado · ESLint aprobado · Code Review aprobado.

---

## HU-002 — Selección de País, Departamento y Ciudad

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Cartelera | 1 | Alta | 13 |

**Historia:** Como visitante del portal quiero seleccionar el país, departamento y ciudad para visualizar únicamente la cartelera disponible en mi ubicación.

**Objetivo:** Personalizar la experiencia desde el ingreso, mostrando solo la información del cine más cercano según la ciudad seleccionada.

**Descripción funcional:**
- Al ingresar por primera vez, el sistema presenta un asistente de selección geográfica antes de mostrar cualquier cartelera: 1. País, 2. Departamento o Estado, 3. Ciudad.
- Una vez realizada la selección:
  - La ciudad queda almacenada en Local Storage (frontend).
  - Se consultan automáticamente los complejos de cine activos.
  - Se carga la cartelera semanal correspondiente.
  - Todas las consultas posteriores usan la ciudad seleccionada.
- Se puede modificar la ubicación desde el menú principal sin cerrar sesión.

**Flujo:** Ingreso portal → Consultar países → Seleccionar país → Consultar departamentos → Seleccionar departamento → Consultar ciudades → Seleccionar ciudad → Guardar preferencia → Consultar cartelera.

**Reglas de negocio:**
- **RN-006:** La ciudad deberá tener al menos un cine activo.
- **RN-007:** Si no existen funciones activas deberá mostrarse un mensaje informativo.
- **RN-008:** La ciudad permanecerá almacenada durante futuras visitas.
- **RN-009:** El cambio de ciudad actualizará inmediatamente la cartelera.

**Endpoints:**
- `GET /countries`
- `GET /departments/{countryId}`
- `GET /cities/{departmentId}`
- `POST /users/location`

**Validaciones:** País obligatorio · Departamento obligatorio · Ciudad obligatoria · No permitir ciudades inactivas.

**Criterios de aceptación:**
- La selección queda almacenada.
- La cartelera corresponde únicamente a la ciudad.
- El usuario puede cambiar de ciudad.
- La información se actualiza automáticamente.

---

## HU-003 — Visualización de la Cartelera Semanal

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Cartelera | 1 | Muy Alta | 21 |

**Historia:** Como visitante quiero visualizar toda la cartelera semanal para elegir la mejor película y horario disponible.

**Objetivo:** Presentar una experiencia visual moderna donde el usuario explore todas las películas disponibles en la ciudad seleccionada.

**Descripción funcional:** La página principal muestra la cartelera de los próximos siete días. Cada tarjeta de película contiene:
- Póster oficial · Nombre · Género · Clasificación · Duración · Director · Idioma · Subtitulada/Doblada
- Formatos disponibles (2D, 3D, IMAX, VIP) · Horarios disponibles
- Botón "Ver detalle" · Botón "Comprar" · Indicador de estreno · Calificación del público

Filtros: Fecha · Género · Clasificación · Idioma · Tipo de sala · Formato · Complejo.

**Flujo:** Consultar cartelera → Consultar funciones → Consultar formatos → Construir cartelera → Mostrar películas.

**Reglas de negocio:**
- **RN-010:** Solo mostrar funciones activas.
- **RN-011:** No mostrar funciones agotadas cuando el usuario aplique el filtro "Disponible".
- **RN-012:** La cartelera siempre mostrará siete días.
- **RN-013:** La información deberá actualizarse automáticamente cuando cambien las funciones.

**Endpoints:** `GET /movies` · `GET /movies/weekly` · `GET /movies/today` · `GET /movies/filter`

**Criterios de aceptación:**
- Se visualiza la cartelera semanal.
- Los filtros funcionan correctamente.
- Se muestran únicamente películas activas.
- Se muestran todos los formatos disponibles.

---

## HU-004 — Consulta del Detalle de una Película

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Películas | 1 | Alta | 13 |

**Historia:** Como visitante quiero consultar toda la información de una película para decidir si deseo comprar entradas.

**Descripción funcional:** La página de detalle incluye:
- Póster oficial · Banner · Tráiler oficial embebido desde YouTube · Sinopsis completa
- Director · Actores principales · Géneros · Duración · Clasificación · Fecha de estreno
- Idiomas disponibles · Formatos (2D, 3D, IMAX, VIP) · Funciones disponibles
- Valor de la entrada por formato · Calificación promedio · Recomendaciones de películas similares

Desde esta vista el usuario puede seleccionar directamente una función para iniciar la compra.

**Endpoints:** `GET /movies/{id}` · `GET /movies/{id}/functions` · `GET /movies/{id}/recommendations`

**Reglas de negocio:**
- **RN-014:** Solo se mostrarán funciones futuras.
- **RN-015:** Los horarios agotados deberán identificarse visualmente.
- **RN-016:** El tráiler deberá reproducirse sin salir de la plataforma.

**Criterios de aceptación:**
- Toda la información de la película se visualiza correctamente.
- El tráiler oficial se reproduce.
- Las funciones disponibles corresponden a la ciudad seleccionada.
- El usuario puede iniciar el proceso de compra desde esta pantalla.

---

## HU-005 — Visualización de Próximos Estrenos

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Cartelera | 1 | Media | 8 |

**Historia:** Como visitante quiero consultar los próximos estrenos para conocer las películas que estarán disponibles próximamente y planificar futuras visitas al cine.

**Objetivo:** Incrementar el interés mostrando lanzamientos futuros y permitir solicitar notificaciones cuando una película llegue a cartelera.

**Descripción funcional:** Sección "Próximamente" con todas las películas confirmadas para futuros estrenos. Cada tarjeta incluye:
- Póster oficial · Título · Fecha estimada de estreno · Género · Clasificación · Duración (si está disponible)
- Tráiler oficial de YouTube · Sinopsis breve · Contador regresivo hasta el estreno
- Botón "Notificarme cuando esté disponible"

Si el usuario inició sesión, puede activar una notificación que le enviará un correo el día en que la película ingrese a la cartelera de su ciudad.

**Flujo:** Ingresar a "Próximamente" → Consultar películas futuras → Mostrar listado → Seleccionar película → Visualizar detalle → (Opcional) Activar notificación → Registrar solicitud de aviso.

**Reglas de negocio:**
- **RN-017:** Solo podrán mostrarse películas con estado "Próximo Estreno".
- **RN-018:** Las fechas de estreno podrán variar según la ciudad y el complejo de cine.
- **RN-019:** Un usuario no podrá registrar más de una solicitud de notificación para la misma película.
- **RN-020:** Cuando la película pase a estado "En Cartelera", el sistema enviará automáticamente la notificación a los usuarios registrados.

**Endpoints:** `GET /movies/upcoming` · `GET /movies/upcoming/{id}` · `POST /notifications/upcoming`

**Criterios de aceptación:**
- Se muestra el listado de próximos estrenos ordenado por fecha.
- El usuario puede consultar el detalle de cada película.
- El tráiler oficial está disponible desde la plataforma.
- Los usuarios autenticados pueden solicitar una notificación de estreno.
- El sistema registra correctamente la solicitud de notificación y evita duplicados.

---

## HU-006 — Registro de Usuario y Creación de Membresía Digital

| Épica | Sprint | Prioridad | Story Points | Dependencias |
|---|---|---|---|---|
| Gestión de Usuarios | 2 | Muy Alta | 13 | HU-001, HU-002 |

**Historia:** Como visitante del portal Multicine quiero registrarme mediante un formulario de creación de cuenta para realizar compras en línea, administrar mis reservas y acceder automáticamente a los beneficios de la membresía digital.

**Objetivo:** Registro que garantice la autenticidad de la información, la seguridad de las credenciales y la creación automática de una membresía digital con beneficios y descuentos.

**Descripción funcional:** Una vez completado y validado el registro, el sistema crea simultáneamente:
- La cuenta del usuario.
- Su perfil personal.
- Su membresía digital en estado **Activa**.
- Su código único de membresía.
- Su historial de compras (vacío).
- Su billetera de bonos (vacía).
- Sus preferencias de notificaciones.

Después se envía un correo con un enlace de activación. Mientras la cuenta no sea confirmada, el usuario no podrá realizar compras.

**Información solicitada:**
- Personal: Nombre · Apellidos · Tipo de documento · Número de documento · Fecha de nacimiento · Género (opcional)
- Contacto: Correo electrónico · Confirmación de correo · Celular
- Seguridad: Contraseña · Confirmación de contraseña
- Preferencias: Ciudad principal · Complejo favorito (opcional)
- Consentimientos: Tratamiento de datos personales · Términos y condiciones · Aceptación de comunicaciones comerciales (opcional)

**Flujo:** Usuario ingresa al formulario → Completa información → Validación de datos → Validación de correo único → Creación del usuario → Creación de membresía digital → Generación de código de membresía → Envío de correo de activación → Usuario activa su cuenta → Cuenta habilitada.

**Reglas de negocio:**
- **RN-021:** El correo electrónico deberá ser único.
- **RN-022:** La contraseña deberá tener mínimo 10 caracteres.
- **RN-023:** La contraseña deberá contener mayúsculas, minúsculas, número y carácter especial.
- **RN-024:** La cuenta permanecerá inactiva hasta confirmar el correo.
- **RN-025:** Todo usuario registrado tendrá automáticamente una membresía digital.
- **RN-026:** El número de membresía será generado automáticamente y será único.

**Seguridad:** Contraseñas cifradas con BCrypt · Validación CAPTCHA · Protección contra ataques de fuerza bruta · Token temporal de activación (24 horas).

**Endpoints:** `POST /auth/register` · `POST /auth/verify-email` · `POST /membership/create`

**Criterios de aceptación:**
- El usuario se registra correctamente.
- Se crea la membresía automáticamente.
- Se envía el correo de activación.
- No se permiten correos duplicados.
- La contraseña cumple la política de seguridad.

---

## HU-007 — Inicio de Sesión y Autenticación Segura

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Seguridad | 2 | Crítica | 13 |

**Historia:** Como usuario registrado quiero iniciar sesión de forma segura para acceder a mis beneficios, compras y reservas.

**Objetivo:** Autenticación basada en JWT y Refresh Token que garantice sesiones seguras y controladas.

**Descripción funcional:** El usuario se autentica con correo y contraseña. Si las credenciales son válidas, el sistema emite:
- Access Token (JWT).
- Refresh Token.
- Información de la membresía.
- Beneficios activos.
- Datos básicos del perfil.

Debe detectar intentos fallidos y bloquear temporalmente la cuenta cuando sea necesario.

**Flujo:** Usuario ingresa credenciales → Validar usuario → Validar contraseña → Generar JWT → Generar Refresh Token → Consultar membresía → Consultar beneficios → Ingresar al portal.

**Reglas de negocio:**
- **RN-027:** Máximo cinco intentos fallidos antes de bloquear la cuenta durante 15 minutos.
- **RN-028:** El Access Token tendrá una vigencia de 15 minutos.
- **RN-029:** El Refresh Token tendrá una vigencia de siete días.
- **RN-030:** Cada inicio de sesión invalidará el Refresh Token anterior.
- **RN-031:** Solo usuarios con correo verificado podrán iniciar sesión.

**Seguridad:** JWT firmado · Refresh Token almacenado en base de datos · Cifrado BCrypt · Auditoría de accesos · Registro de IP y dispositivo.

**Endpoints:** `POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/forgot-password` · `POST /auth/reset-password`

**Criterios de aceptación:**
- El usuario inicia sesión correctamente.
- Se generan ambos tokens.
- Se bloquean intentos maliciosos.
- El Refresh Token renueva la sesión sin volver a autenticarse.

---

## HU-008 — Consulta de Perfil y Beneficios de Membresía

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Membresía Digital | 2 | Alta | 8 |

**Historia:** Como usuario autenticado quiero consultar mi perfil y los beneficios asociados a mi membresía para conocer los descuentos y ventajas disponibles antes de realizar una compra.

**Descripción funcional:** Desde "Mi Cuenta" el usuario visualiza:
- Información personal · Fotografía (opcional) · Código QR de membresía
- Nivel de membresía (Bronce, Plata, Oro o Platino) · Descuentos vigentes · Bonos disponibles
- Historial de compras · Historial de puntos (si aplica en futuras fases) · Reservas activas

También puede actualizar su información personal y preferencias de notificación.

**Reglas de negocio:**
- **RN-032:** Los descuentos se calcularán según el nivel de membresía.
- **RN-033:** El código QR será único e intransferible.
- **RN-034:** La actualización del correo requerirá una nueva validación.

**Endpoints:** `GET /profile` · `PUT /profile` · `GET /membership` · `GET /membership/benefits`

**Criterios de aceptación:**
- El usuario consulta correctamente su información.
- Se muestran los beneficios vigentes.
- El QR de membresía es visible.
- Los cambios de perfil se guardan correctamente.

---

## HU-009 — Selección de Función y Formato de Proyección

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Compra de Entradas | 2 | Muy Alta | 13 |

**Historia:** Como usuario quiero seleccionar la función que deseo asistir para continuar con la compra de entradas.

**Descripción funcional:** Desde el detalle de la película el usuario puede seleccionar: Fecha · Complejo de cine · Sala · Hora · Formato (2D, 3D, IMAX, VIP) · Idioma · Tipo de audio (doblada o subtitulada). El sistema actualiza en tiempo real la disponibilidad de sillas y el valor de la entrada según la función seleccionada.

**Reglas de negocio:**
- **RN-035:** No se podrán seleccionar funciones ya iniciadas.
- **RN-036:** Solo se mostrarán funciones activas.
- **RN-037:** El precio podrá variar según el formato, la sala y el horario.
- **RN-038:** Las promociones se recalcularán automáticamente.

**Endpoints:** `GET /movies/{id}/functions` · `GET /functions/{id}` · `GET /functions/{id}/prices`

**Criterios de aceptación:**
- Se muestran únicamente funciones disponibles.
- El usuario puede cambiar de formato sin recargar la página.
- El precio se actualiza automáticamente.

---

## HU-010 — Selección Interactiva de Sillas

| Épica | Sprint | Prioridad | Story Points |
|---|---|---|---|
| Compra de Entradas | 2 | Crítica | 21 |

**Historia:** Como usuario quiero seleccionar las sillas donde deseo ubicarme para reservar los puestos antes de realizar el pago.

**Objetivo:** Mapa gráfico e interactivo de la sala que muestre la disponibilidad de cada silla en tiempo real y evite conflictos por compras simultáneas.

**Descripción funcional:** Al seleccionar una función se muestra un plano de la sala con la distribución real de las sillas. Estados de silla:
- Disponible · Seleccionada · Reservada temporalmente · Vendida · Inhabilitada · Preferencial (movilidad reducida) · VIP

Las sillas seleccionadas quedan bloqueadas temporalmente durante la compra. El usuario puede seleccionar hasta el número máximo de entradas permitidas **por la función** (configurable por administración). El sistema calcula el valor total y muestra un resumen antes de continuar al carrito.

**Flujo:** Seleccionar función → Consultar distribución de la sala → Mostrar mapa interactivo → Seleccionar sillas → Bloqueo temporal de sillas → Calcular valor total → Continuar al carrito.

**Reglas de negocio:**
- **RN-039:** Las sillas seleccionadas se bloquearán durante 10 minutos mientras el usuario completa la compra.
- **RN-040:** Si el usuario abandona el proceso o el tiempo expira, las sillas volverán automáticamente al estado Disponible.
- **RN-041:** No se podrán seleccionar sillas vendidas, bloqueadas o reservadas por otro usuario.
- **RN-042:** Las sillas para personas con movilidad reducida solo podrán ser adquiridas bajo las políticas definidas por el cine.
- **RN-043:** La disponibilidad deberá actualizarse en tiempo real para evitar sobreventas.

**Seguridad:** Control de concurrencia para evitar doble venta · Auditoría de bloqueos y liberaciones · Validación de disponibilidad antes de confirmar el pago.

**Endpoints:** `GET /functions/{id}/seats` · `POST /reservations/lock-seats` · `DELETE /reservations/release-seats` · `GET /reservations/summary`

**Criterios de aceptación:**
- El mapa de la sala refleja el estado real de las sillas.
- Las sillas se bloquean correctamente durante el tiempo configurado.
- La liberación automática funciona al expirar el tiempo.
- No es posible vender una misma silla a dos usuarios.
- El resumen de compra se actualiza automáticamente con el total de entradas seleccionadas.
