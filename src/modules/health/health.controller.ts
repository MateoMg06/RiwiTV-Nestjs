import { Controller, Get } from '@nestjs/common';
import { HealthService, type HealthCheck } from './health.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

/**
 * HU-001: `GET /api/v1/health`. Es la unica ruta versionada del proyecto (el
 * backlog la define asi; la API `/api/v1` completa es HU-029, fuera de alcance).
 *
 * Responde siempre 200: si la base de datos cae, lo indica con
 * `status: 'degraded'` en el cuerpo, igual que el proyecto original.
 */
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  check(): Promise<HealthCheck> {
    return this.healthService.check();
  }
}
