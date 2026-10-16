import { describe, it, expect, vi } from 'vitest';
import type { DataSource, EntityManager } from 'typeorm';
import { UserDao } from './user.dao.js';
import { User } from './user.entity.js';

const fakeRepo = (saved: object) => ({
  create: vi.fn((d: object) => ({ ...d })),
  save: vi.fn().mockResolvedValue(saved),
});

describe('UserDao.create (HU-006)', () => {
  it('sin manager usa el repositorio del DataSource', async () => {
    const repo = fakeRepo({ id: 1 });
    const dataSource = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as DataSource;

    await expect(new UserDao(dataSource).create({ name: 'Ana' })).resolves.toEqual({ id: 1 });

    expect(dataSource.getRepository).toHaveBeenCalledWith(User);
  });

  it('con manager usa el repositorio del manager (misma transacción)', async () => {
    const repo = fakeRepo({ id: 2 });
    const manager = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as EntityManager;
    const dataSource = { getRepository: vi.fn() } as unknown as DataSource;

    await expect(new UserDao(dataSource).create({ name: 'Ana' }, manager)).resolves.toEqual({
      id: 2,
    });

    expect(manager.getRepository).toHaveBeenCalledWith(User);
    expect(dataSource.getRepository).not.toHaveBeenCalled();
  });
});
