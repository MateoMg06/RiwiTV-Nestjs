import { describe, it, expect, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { QueryFailedError, type DataSource, type EntityManager } from 'typeorm';
import { MembershipDao } from './membership.dao.js';
import { Membership } from './membership.entity.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

const data = { userId: 7, code: 'RTV-AAAAAAAAAA', status: MembershipStatus.ACTIVE };

/** `transaction` ejecuta el callback con un manager que expone el repo doble. */
function fakeManager(save: ReturnType<typeof vi.fn>) {
  const repo = { create: vi.fn((d: object) => ({ ...d })), save };
  const inner = { getRepository: vi.fn().mockReturnValue(repo) };
  const transaction = vi.fn((cb: (m: unknown) => Promise<unknown>) => cb(inner));
  return {
    repo,
    inner,
    manager: { transaction } as unknown as EntityManager & { transaction: typeof transaction },
  };
}

const queryFailed = (code: string, detail = '') =>
  new QueryFailedError('INSERT', [], Object.assign(new Error('db'), { code, detail }));

describe('MembershipDao (HU-006)', () => {
  it('sin manager usa el DataSource', async () => {
    const saved = { id: 1, ...data };
    const { repo, inner, manager } = fakeManager(vi.fn().mockResolvedValue(saved));
    const dao = new MembershipDao(manager as unknown as DataSource);

    await expect(dao.create(data)).resolves.toBe(saved);

    expect(inner.getRepository).toHaveBeenCalledWith(Membership);
    expect(repo.create).toHaveBeenCalledWith(data);
  });

  it('con manager usa el manager recibido y no el DataSource', async () => {
    const saved = { id: 1, ...data };
    const { inner, manager } = fakeManager(vi.fn().mockResolvedValue(saved));
    const dataSource = { transaction: vi.fn() } as unknown as DataSource;
    const dao = new MembershipDao(dataSource);

    await expect(dao.create(data, manager)).resolves.toBe(saved);

    expect(manager.transaction).toHaveBeenCalledTimes(1);
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(inner.getRepository).toHaveBeenCalledWith(Membership);
  });

  it('devuelve null si el código ya existe (23505 sobre code)', async () => {
    const { manager } = fakeManager(
      vi
        .fn()
        .mockRejectedValue(queryFailed('23505', 'Key (code)=(RTV-AAAAAAAAAA) already exists.')),
    );
    const dao = new MembershipDao(manager as unknown as DataSource);

    await expect(dao.create(data)).resolves.toBeNull();
  });

  it('409 si el usuario ya tiene membresía (23505 sobre userId)', async () => {
    const { manager } = fakeManager(
      vi.fn().mockRejectedValue(queryFailed('23505', 'Key ("userId")=(7) already exists.')),
    );
    const dao = new MembershipDao(manager as unknown as DataSource);

    await expect(dao.create(data)).rejects.toThrow(
      new ConflictException('El usuario ya tiene una membresía'),
    );
  });

  it('relanza otros errores de BD', async () => {
    const error = queryFailed('23503');
    const { manager } = fakeManager(vi.fn().mockRejectedValue(error));
    const dao = new MembershipDao(manager as unknown as DataSource);

    await expect(dao.create(data)).rejects.toBe(error);
  });

  it('findByUserId busca por userId', async () => {
    const found = { id: 1 };
    const repo = { findOne: vi.fn().mockResolvedValue(found) };
    const dataSource = { getRepository: vi.fn().mockReturnValue(repo) } as unknown as DataSource;

    await expect(new MembershipDao(dataSource).findByUserId(7)).resolves.toBe(found);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { userId: 7 } });
  });
});
