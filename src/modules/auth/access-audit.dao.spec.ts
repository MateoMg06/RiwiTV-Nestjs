import { describe, it, expect, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { AccessAuditDao } from './access-audit.dao.js';
import { AccessAudit } from './entities/access-audit.entity.js';
import { AccessEvent } from '../../common/enums/domain.enums.js';

describe('AccessAuditDao (HU-007)', () => {
  it('create guarda la fila en el repositorio de AccessAudit', async () => {
    const repo = {
      create: vi.fn((d: object) => ({ ...d })),
      save: vi.fn().mockResolvedValue({ id: 1 }),
    };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as DataSource;
    const data = { userId: 1, email: 'a@b.co', event: AccessEvent.LOGIN_SUCCESS, ip: '1.1.1.1' };

    await expect(new AccessAuditDao(dataSource).create(data)).resolves.toEqual({ id: 1 });

    expect(dataSource.getRepository).toHaveBeenCalledWith(AccessAudit);
    expect(repo.create).toHaveBeenCalledWith(data);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
