import { describe, it, expect, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { HealthService } from './health.service.js';

const buildService = (query: ReturnType<typeof vi.fn>) =>
  new HealthService({ query } as unknown as DataSource);

describe('HealthService (HU-001)', () => {
  it('reporta la API y la base de datos disponibles', async () => {
    const query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);

    const result = await buildService(query).check();

    expect(query).toHaveBeenCalledWith('SELECT 1');
    expect(result).toMatchObject({
      status: 'ok',
      database: 'up',
      service: 'riwi-cine-api',
      version: '1.0.0',
    });
    expect(result.uptimeSeconds).toEqual(expect.any(Number));
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('reporta estado degradado, sin lanzar, cuando PostgreSQL no responde', async () => {
    const query = vi.fn().mockRejectedValue(new Error('connection refused'));

    const result = await buildService(query).check();

    expect(result.status).toBe('degraded');
    expect(result.database).toBe('down');
  });
});
