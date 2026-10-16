import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { DepartmentService } from './department.service.js';
import type { CountryDao } from '../country.dao.js';
import type { DepartmentDao } from './department.dao.js';

describe('DepartmentService (HU-002)', () => {
  it('pais existente: devuelve { id, department, countryId }', async () => {
    const countryDao = { findById: vi.fn().mockResolvedValue({ id: 1 }) } as unknown as CountryDao;
    const departmentDao = {
      findByCountryId: vi.fn().mockResolvedValue([{ id: 5, name: 'Antioquia' }]),
    } as unknown as DepartmentDao;

    const result = await new DepartmentService(countryDao, departmentDao).findByCountry(1);

    expect(result).toEqual([{ id: 5, department: 'Antioquia', countryId: 1 }]);
    expect(departmentDao.findByCountryId).toHaveBeenCalledWith(1);
  });

  it('pais inexistente: 404 y no consulta departamentos', async () => {
    const countryDao = { findById: vi.fn().mockResolvedValue(null) } as unknown as CountryDao;
    const departmentDao = { findByCountryId: vi.fn() } as unknown as DepartmentDao;

    await expect(
      new DepartmentService(countryDao, departmentDao).findByCountry(9),
    ).rejects.toThrow(new NotFoundException('País no encontrado'));
    expect(departmentDao.findByCountryId).not.toHaveBeenCalled();
  });
});
