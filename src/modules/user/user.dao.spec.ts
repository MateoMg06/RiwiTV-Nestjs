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

describe('UserDao.findByResetTokenHash (HU-007)', () => {
  it('selecciona resetToken y resetTokenExpires (select: false) y filtra por el hash', async () => {
    const found = { id: 1 };
    const qb = {
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(found),
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue({ createQueryBuilder: vi.fn().mockReturnValue(qb) }),
    } as unknown as DataSource;

    await expect(new UserDao(dataSource).findByResetTokenHash('abc')).resolves.toBe(found);

    expect(qb.addSelect).toHaveBeenCalledWith('user.resetToken');
    expect(qb.addSelect).toHaveBeenCalledWith('user.resetTokenExpires');
    expect(qb.where).toHaveBeenCalledWith('user.resetToken = :hash', { hash: 'abc' });
  });
});

describe('UserDao.consumeResetToken (HU-007)', () => {
  const build = (affected: number) => {
    const qb = {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      execute: vi.fn().mockResolvedValue({ affected }),
    };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue({ createQueryBuilder: vi.fn().mockReturnValue(qb) }),
    } as unknown as DataSource;
    return { qb, dao: new UserDao(dataSource) };
  };

  it('actualiza con la condición id + hash + vigencia y anula el token', async () => {
    const { qb, dao } = build(1);

    await expect(dao.consumeResetToken(7, 'h', 'pw')).resolves.toBe(true);

    expect(qb.set).toHaveBeenCalledWith({
      password: 'pw',
      resetToken: null,
      resetTokenExpires: null,
    });
    expect(qb.where).toHaveBeenCalledWith(
      'id = :id AND resetToken = :hash AND resetTokenExpires > :now',
      { id: 7, hash: 'h', now: expect.any(Date) },
    );
  });

  it('devuelve false si ninguna fila cumple la condición (token ya consumido)', async () => {
    const { dao } = build(0);

    await expect(dao.consumeResetToken(7, 'h', 'pw')).resolves.toBe(false);
  });
});
