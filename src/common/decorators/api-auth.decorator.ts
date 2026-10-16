import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';

/** Documenta en Swagger una ruta protegida: JWT por Bearer o cookie `accessToken`, y su 401. */
export const ApiAuth = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiCookieAuth('accessToken'),
    ApiUnauthorizedResponse({ description: 'Token no proporcionado, inválido o expirado.' }),
  );
