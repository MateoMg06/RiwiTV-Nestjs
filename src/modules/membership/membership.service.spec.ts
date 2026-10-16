import { describe, it, expect, vi } from 'vitest';
import { InternalServerErrorException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { MembershipService } from './membership.service.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';

function setup(create: ReturnType<typeof vi.fn>) {
  const dao = { create };
  return { dao, service: new MembershipService(dao as never) };
}

describe('MembershipService.createForUser (HU-006)', () => {
  it('crea la membresía ACTIVE con código RTV-XXXXXXXXXX', async () => {
    const saved = { id: 1 };
    const { dao, service } = setup(vi.fn().mockResolvedValue(saved));

    await expect(service.createForUser(7)).resolves.toBe(saved);

    expect(dao.create).toHaveBeenCalledWith(
      {
        userId: 7,
        code: expect.stringMatching(/^RTV-[0-9A-F]{10}$/),
        status: MembershipStatus.ACTIVE,
      },
      undefined,
    );
  });

  it('pasa el manager de la transacción al DAO', async () => {
    const manager = {} as EntityManager;
    const { dao, service } = setup(vi.fn().mockResolvedValue({ id: 1 }));

    await service.createForUser(7, manager);

    expect(dao.create).toHaveBeenCalledWith(expect.anything(), manager);
  });

  it('reintenta con otro código si el DAO informa colisión', async () => {
    const saved = { id: 1 };
    const create = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(saved);
    const { service } = setup(create);

    await expect(service.createForUser(7)).resolves.toBe(saved);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].code).not.toBe(create.mock.calls[1][0].code);
  });

  it('falla tras 3 colisiones seguidas', async () => {
    const create = vi.fn().mockResolvedValue(null);
    const { service } = setup(create);

    await expect(service.createForUser(7)).rejects.toBeInstanceOf(InternalServerErrorException);
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('propaga otros errores del DAO sin reintentar', async () => {
    const error = new Error('db caída');
    const create = vi.fn().mockRejectedValue(error);
    const { service } = setup(create);

    await expect(service.createForUser(7)).rejects.toBe(error);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
