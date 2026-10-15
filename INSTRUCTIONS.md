### U.1: Resumen de lo restante para usuarios y autenticación ###

Se está realizando la migración de este proyecto de node/express a nest, por eso, se debe tomar todo respecto a la autenticación del anterior proyecto como
base para completar lo siguiente:

- Revisar el CRUD de usuarios existente.
- Comparar los endpoints antiguos con los de NestJS.
- Completar validaciones de creación y actualización de usuarios.
- Verificar registro, activación de cuenta, inicio de sesión y renovación de tokens.
- Revisar cierre de sesión y consulta del usuario autenticado.
- Mantener compatibilidad con las rutas antiguas si el frontend todavía las necesita.
Entrega: módulo de usuarios y autenticación funcional y compatible con el proyecto.

Toma en cuenta: pueden haber aspectos de esta funcionalidad que se combinen con la lógica de negocio, así que en esos casos siéntete libre de añadir o modificar lo necesario para que funcione, pero no más allá de eso ni de lo referido en este punto, 


### Contexto de lógica de negocio / bases de datos / configuración ###

La diferencia más importante respecto a mi respuesta anterior es que la rama develop del proyecto original no contiene los módulos de reservas, perfiles, membresías y notificaciones que había mencionado. Esos elementos no deben contarse como pendientes de esta migración.
1. Resumen del estado actual

Autenticación
NestJS tiene registro, activación, login, refresh, logout y sesiones.
Avanzado

Usuarios
Hay CRUD y validaciones, pero faltan equivalencias con la API anterior.
Parcial

Países, departamentos y ciudades
Países tiene una base, pero faltan operaciones y lógica en los servicios.
Parcial

Películas
No encuentro módulo ni controlador equivalente en NestJS.
Pendiente

Cines y funciones
No encuentro módulos equivalentes en NestJS.
Pendiente


La conclusión es que la migración ya tiene una base de autenticación y usuarios, pero todavía no reproduce la funcionalidad completa del proyecto original.
2. Lista exacta de lo que te falta migrar
Esta lista se basa en los archivos y endpoints que pude comprobar en las dos ramas.
0 de 25 tareas marcadas
Reiniciar checklist


1. Películas
P0

[ ] Crear MovieModule
Crear controlador, servicio, DAO y entidad para películas.


[ ] Migrar el catálogo
Implementar GET /api/movies y conservar la consulta de cartelera.


[ ] Buscar película por nombre
Migrar GET /api/movies/:name y su manejo de errores.


[ ] Crear películas
Migrar POST /api/movies con validación de los datos.


[ ] Consultar cines de una película
Migrar GET /api/movies/:id/cinemas y su relación con Cinema.



2. Cines y funciones
P0

[ ] Crear CinemaModule
Migrar entidad, controlador, servicio y acceso a datos.


[ ] Crear un cine
Migrar POST /api/cinemas y validar cityId.


[ ] Consultar películas de un cine
Migrar GET /api/cinemas/:id/movies.


[ ] Consultar funciones de un cine
Migrar GET /api/cinemas/:id/showtimes.


[ ] Asignar película y crear función
Migrar POST /api/cinemas/:id/movies/:movieId con horario, fecha, sala y precio.


[ ] Eliminar una función o asociación
Migrar DELETE /api/cinemas/:id/movies/:movieId, conservando la semántica del original.



3. Ubicación geográfica
P0

[ ] Completar CountryService
Persistir países y devolver resultados reales en lugar de respuestas de ejemplo.


[ ] Migrar departamentos
Crear operaciones para listar departamentos por país y crear departamentos.


[ ] Migrar ciudades
Crear operaciones para listar ciudades por departamento y crear ciudades.


[ ] Consultar cines por ciudad
Migrar GET /api/cities/:id/cinemas.


[ ] Completar entidades y relaciones
Verificar Country → Department → City → Cinema en TypeORM.


### U.2: Punto de partida de usuarios y autenticación ###
4. Usuarios y autenticación
P1

[ ] Alinear endpoints de usuarios
Comparar rutas antiguas con /user y /auth en NestJS.


[ ] Migrar la autenticación heredada
Evaluar /api/users/auth y /api/users/legacy-login; conservarlas solo si hay clientes que las necesiten.


[ ] Migrar las respuestas de usuarios
Comprobar equivalencia de creación, listado, actualización y validaciones.


[ ] Revisar autorización y roles
Mantener los permisos administrativos y evitar que un usuario modifique cuentas ajenas.



5. Base de datos y entrega
P1

[ ] Comparar el esquema completo
Contrastar la migración inicial de Sequelize con las entidades y migraciones de NestJS.


[ ] Migrar seeders
Trasladar los datos iniciales y comprobar que las relaciones se creen correctamente.


[ ] Actualizar Swagger y Postman
Incorporar los endpoints y los contratos de la API migrada.


[ ] Migrar las pruebas
Crear pruebas unitarias e integración para los módulos de negocio.


[ ] Validar Docker y configuración
Comprobar arranque, conexión a base de datos, variables de entorno y despliegue.



3. Detalle por módulo
A. Películas: pendiente de migración
El proyecto original tiene estos componentes:
- app/src/controllers/movie.controller.ts
- app/src/services/movie.service.ts
- app/src/repositories/movie.repository.ts
- app/src/models/movie.model.ts
- app/src/dto/create-movie.dto.ts
- app/src/dto/get-movie-catalog.dto.ts
- app/src/routes/movie.routes.ts
En NestJS debes crear una estructura equivalente:
src/modules/movie/
├── movie.module.ts
├── movie.controller.ts
├── movie.service.ts
├── movie.dao.ts
├── movie.entity.ts
└── dto/
    ├── create-movie.dto.ts
    └── get-movie-catalog.dto.ts


Esta estructura es una propuesta de organización, no archivos que ya existan en tu repositorio.
Debes conservar las cuatro operaciones del original: catálogo, búsqueda por nombre, creación de películas y consulta de cines asociados. La consulta del catálogo también debe respetar el DTO de filtros si tiene lógica adicional.
B. Cines y funciones: pendiente de migración
Los archivos de origen principales son:
- cinema.controller.ts
- cinema.service.ts
- cinema.repository.ts
- cinema.model.ts
- showtime.service.ts
- showtime.repository.ts
- showtime.model.ts
- create-cinema.dto.ts
- create-showtime.dto.ts
El original gestiona cines, películas asociadas y funciones con fecha, horario, sala y precio.
Importante: el árbol de develop contiene archivos de funciones y repositorios, pero no un showtime.routes.ts. Las operaciones de funciones están conectadas desde las rutas de cines. Por eso debes migrar el comportamiento real, no inventar un endpoint separado que no exista en el original.
C. Países, departamentos y ciudades: migración incompleta
En NestJS ya existen:
- CountryModule
- CountryController
- CountryDao
- CountryService
- CityService y DepartmentService, todavía vacíos
- Entidades y DAO de ciudad y departamento
Los problemas concretos que encontré son:
- CountryService.create() devuelve "d" en lugar de crear un país.
- findAll(), findOne() y remove() devuelven textos de ejemplo o no reproducen las operaciones del origen.
- CityService y DepartmentService no tienen implementaciones.
- CountryController no reproduce las rutas anidadas del original para departamentos y ciudades.
- No encuentro la consulta de cines por ciudad.
Por tanto, no basta con crear los dos servicios: hay que conectarlos con los DAO, implementar sus operaciones y exponer los endpoints.
Referencias: módulo de ubicación de NestJS · servicios de ubicación del original.


## U.3: Detalles de usuarios y autenticación ##
D. Usuarios: hay una base, pero no equivalencia completa
NestJS ya tiene UserModule, controlador, servicio, DAO, entidad y DTO. Además, su servicio incorpora validaciones para correo, documento, contraseñas y consentimiento.
Sin embargo, el original tiene rutas como:
API original	API NestJS que debes contrastar
POST /api/users	POST /user
POST /api/users/register	POST /auth/register
GET /api/users	GET /user
POST /api/users/login	POST /auth/login
POST /api/users/refresh	POST /auth/refresh
POST /api/users/logout	POST /auth/logout
PUT /api/users/:id	PATCH /user/:id
Las rutas no tienen por qué ser idénticas si el frontend se actualiza, pero debes verificar que no se pierdan comportamientos del contrato original.
También hay dos rutas heredadas en el original, /api/users/auth y /api/users/legacy-login. Antes de descartarlas, confirma si algún cliente las utiliza.
Referencia: controlador de usuarios original · controlador NestJS.

4. Base de datos: no olvides esta parte
El original tiene una migración inicial de Sequelize:
app/src/migrations/20260824000000-initial-schema.js
NestJS utiliza TypeORM. No debes copiar esa migración JavaScript directamente y asumir que funciona.
Tienes que comparar:
- Tablas y columnas.
- Tipos de datos y valores predeterminados.
- Claves foráneas entre películas, cines, funciones y ubicación.
- Restricciones únicas e índices.
- Campos de usuario y estado de la cuenta.
- Datos iniciales y seeders.
- Entidades de sesiones y refresh tokens que NestJS añadió.
La migración inicial de NestJS también debe permitir crear una base de datos vacía y ejecutar el proyecto desde cero, sin depender de tablas creadas manualmente.

5. Documentación, configuración y pruebas
Estos componentes también forman parte de la migración:
- app/src/docs/postman/RIWI-TV.postman_collection.json
- app/src/docs/swagger.ts
- app/src/seeders/seed.ts
- app/src/__tests__/health.routes.test.ts
- app/src/__tests__/health.service.test.ts
- docker-compose.yml
- app/Dockerfile
- .env.example
NestJS ya tiene configuración Swagger, pruebas de autenticación y usuario, y configuración de Docker en el repositorio. Lo que falta es comprobar que cubran también los nuevos módulos de negocio y que las instrucciones de despliegue estén actualizadas.
Hay además una configuración que corregir en src/app.module.ts: el módulo de observabilidad utiliza los valores de ejemplo YOUR_APP_KEY y YOUR_APP_SECRET. No deben quedar como credenciales de producción.
