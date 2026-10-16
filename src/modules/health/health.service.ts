import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheck {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  environment: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

/**
 * HU-001. Usa `DataSource` directamente: un `SELECT 1` no pertenece a ninguna
 * entidad, asi que un DAO solo para esto seria una capa sin uso real.
 */
@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheck> {
    const databaseUp = await this.isDatabaseUp();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      service: 'riwi-cine-api',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: databaseUp ? 'up' : 'down',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async isDatabaseUp(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
}
