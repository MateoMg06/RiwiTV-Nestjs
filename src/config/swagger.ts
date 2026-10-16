import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

const description = `API de la plataforma Multicine RiwiTV (migración de Express a NestJS). Cubre las historias HU-001 a HU-010.

- Todas las rutas cuelgan de \`/api\`; la única versionada es \`GET /api/v1/health\`.
- Autenticación: JWT de acceso en la cabecera \`Authorization: Bearer <token>\` o en la cookie \`accessToken\` (se emite en el login). Las rutas sin candado son públicas.
- El correo (activación, restablecimiento, aviso de estreno) está emulado: sin \`SMTP_HOST\` solo se registra en el log fuera de producción.
- Errores con forma \`{ statusCode, message, path, timestamp }\`.`;

export const swaggerConfiguration = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Riwi TV API')
    .setDescription(description)
    .setVersion('1.0.0')
    .addTag('health', 'Estado del servicio y de la base de datos (HU-001).')
    .addTag(
      'ubicación',
      'Países, departamentos, ciudades activas y ubicación del usuario (HU-002).',
    )
    .addTag(
      'películas',
      'Cartelera semanal y de hoy con filtros, detalle, funciones, recomendaciones y próximos estrenos (HU-003, HU-004, HU-005).',
    )
    .addTag('notificaciones', 'Solicitud de aviso de próximo estreno (HU-005).')
    .addTag(
      'auth',
      'Captcha, registro, activación, login, refresh, logout y recuperación de contraseña (HU-006, HU-007).',
    )
    .addTag('membresía', 'Alta, consulta y beneficios de la membresía (HU-006, HU-008).')
    .addTag('perfil', 'Consulta y actualización del perfil del usuario autenticado (HU-008).')
    .addTag('funciones', 'Detalle y precio de funciones, y mapa de sillas (HU-009, HU-010).')
    .addTag('reservas', 'Bloqueo, liberación y resumen de sillas (HU-010).')
    .addTag('usuarios', 'CRUD interno de usuarios, solo soporte (no lo pide ninguna historia).')
    .addTag('app', 'Ruta raíz de la aplicación.')
    .addBearerAuth()
    .addCookieAuth('accessToken')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
};
