import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthCheck } from './health.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

/**
 * HU-001: `GET /api/v1/health`. Es la unica ruta versionada del proyecto (el
 * backlog la define asi; la API `/api/v1` completa es HU-029, fuera de alcance).
 *
 * Responde siempre 200: si la base de datos cae, lo indica con
 * `status: 'degraded'` en el cuerpo, igual que el proyecto original.
 */
@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary: 'Estado del servicio',
    description:
      'HU-001. Público. Responde siempre 200: si la base de datos no responde, lo indica con `status: degraded` y `database: down`.',
  })
  @ApiOkResponse({
    description: 'Estado del servicio y de la base de datos.',
    example: {
      status: 'ok',
      service: 'riwi-cine-api',
      version: '1.0.0',
      environment: 'development',
      database: 'up',
      uptimeSeconds: 120,
      timestamp: '2026-10-16T12:00:00.000Z',
    },
  })
  @Public()
  @Get()
  check(): Promise<HealthCheck> {
    return this.healthService.check();
  }
}
