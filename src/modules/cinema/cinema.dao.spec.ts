import { describe, it, expect, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { CinemaDao } from './cinema.dao.js';
import { Cinema } from './cinema.entity.js';

describe('CinemaDao', () => {
  it('cuenta solo los cines activos de la ciudad', async () => {
    const repo = { count: vi.fn().mockResolvedValue(2) };
    const dataSource = {
      getRepository: vi.fn().mockReturnValue(repo),
    } as unknown as DataSource;

    await expect(
      new CinemaDao(dataSource).countActiveByCityId(5),
    ).resolves.toBe(2);

    expect(dataSource.getRepository).toHaveBeenCalledWith(Cinema);
    expect(repo.count).toHaveBeenCalledWith({
      where: { city: { id: 5 }, isActive: true },
    });
  });
});
