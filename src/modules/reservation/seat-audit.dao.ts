import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SeatAuditEvent } from '../../common/enums/domain.enums.js';
import { SeatAudit } from './seat-audit.entity.js';

export interface SeatAuditRow {
  userId: number | null;
  showtimeId: number;
  seatId: number;
  event: SeatAuditEvent;
}

/** Auditoría de sillas (HU-010). Siempre dentro de la transacción del cambio (fail-closed). */
@Injectable()
export class SeatAuditDao {
  async createMany(manager: EntityManager, rows: SeatAuditRow[]): Promise<void> {
    if (rows.length === 0) return;
    const repo = manager.getRepository(SeatAudit);
    await repo.save(rows.map((row) => repo.create(row)));
  }
}
