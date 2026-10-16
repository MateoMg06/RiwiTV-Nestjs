import { describe, it, expect, vi } from 'vitest';
import type { EntityManager } from 'typeorm';
import { SeatAuditDao } from './seat-audit.dao.js';
import { SeatAudit } from './seat-audit.entity.js';
import { SeatAuditEvent } from '../../common/enums/domain.enums.js';

describe('SeatAuditDao (HU-010)', () => {
  it('createMany guarda todas las filas con el manager de la transacción', async () => {
    const repo = {
      create: vi.fn((d: object) => ({ ...d })),
      save: vi.fn().mockResolvedValue([]),
    };
    const manager = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as EntityManager;
    const rows = [
      { userId: 1, showtimeId: 5, seatId: 10, event: SeatAuditEvent.LOCKED },
      { userId: 1, showtimeId: 5, seatId: 11, event: SeatAuditEvent.LOCKED },
    ];

    await new SeatAuditDao().createMany(manager, rows);

    expect(manager.getRepository).toHaveBeenCalledWith(SeatAudit);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(rows);
  });

  it('createMany sin filas no toca la BD', async () => {
    const manager = { getRepository: vi.fn() } as unknown as EntityManager;

    await new SeatAuditDao().createMany(manager, []);

    expect(manager.getRepository).not.toHaveBeenCalled();
  });
});
