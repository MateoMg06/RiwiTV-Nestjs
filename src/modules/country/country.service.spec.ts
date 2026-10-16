import { describe, it, expect, vi } from 'vitest';
import { CountryService } from './country.service.js';
import type { CountryDao } from './country.dao.js';

describe('CountryService (HU-002)', () => {
  it('mapea los paises a { id, country }', async () => {
    const dao = {
      findAll: vi.fn().mockResolvedValue([{ id: 1, name: 'Colombia', isActive: true }]),
    } as unknown as CountryDao;

    await expect(new CountryService(dao).findAll()).resolves.toEqual([
      { id: 1, country: 'Colombia' },
    ]);
  });
});
