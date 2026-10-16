import { describe, it, expect, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { CityService } from './city.service.js';
import type { DepartmentDao } from '../department/department.dao.js';
import type { CityDao } from './city.dao.js';

describe('CityService (HU-002)', () => {
  it('departamento existente: devuelve ciudades activas { id, city, departmentId, active }', async () => {
    const departmentDao = {
      findById: vi.fn().mockResolvedValue({ id: 5 }),
    } as unknown as DepartmentDao;
    const cityDao = {
      findActiveByDepartmentId: vi
        .fn()
        .mockResolvedValue([{ id: 7, name: 'Medellín', isActive: true }]),
    } as unknown as CityDao;

    const result = await new CityService(departmentDao, cityDao).findByDepartment(5);

    expect(result).toEqual([{ id: 7, city: 'Medellín', departmentId: 5, active: true }]);
    expect(cityDao.findActiveByDepartmentId).toHaveBeenCalledWith(5);
  });

  it('departamento inexistente: 404 y no consulta ciudades', async () => {
    const departmentDao = {
      findById: vi.fn().mockResolvedValue(null),
    } as unknown as DepartmentDao;
    const cityDao = { findActiveByDepartmentId: vi.fn() } as unknown as CityDao;

    await expect(new CityService(departmentDao, cityDao).findByDepartment(9)).rejects.toThrow(
      new NotFoundException('Departamento no encontrado'),
    );
    expect(cityDao.findActiveByDepartmentId).not.toHaveBeenCalled();
  });
});
