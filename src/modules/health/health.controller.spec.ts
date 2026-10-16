import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import type { HealthService } from './health.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('HealthController (HU-001)', () => {
  it('expone GET v1/health (con el prefijo global: /api/v1/health)', () => {
    expect(Reflect.getMetadata(PATH_METADATA, HealthController)).toBe('v1/health');
    expect(Reflect.getMetadata(METHOD_METADATA, HealthController.prototype.check)).toBe(
      RequestMethod.GET,
    );
  });

  it('es publico: el health check no exige token', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, HealthController.prototype.check)).toBe(true);
  });

  it('devuelve lo que reporta el servicio', async () => {
    const report = { status: 'ok', database: 'up' };
    const service = { check: vi.fn().mockResolvedValue(report) } as unknown as HealthService;

    await expect(new HealthController(service).check()).resolves.toBe(report);
  });
});
