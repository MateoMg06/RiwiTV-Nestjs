import { describe, it, expect, vi } from 'vitest';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { BadRequestException, ParseIntPipe, RequestMethod } from '@nestjs/common';
import { LocationController } from './location.controller.js';
import type { CountryService } from './country.service.js';
import type { DepartmentService } from './department/department.service.js';
import type { CityService } from './city/city.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('LocationController (HU-002)', () => {
  const routes = [
    ['listCountries', 'countries'],
    ['listDepartments', 'departments/:countryId'],
    ['listCities', 'cities/:departmentId'],
  ] as const;

  it.each(routes)('%s expone GET %s y es publico', (method, path) => {
    const handler = LocationController.prototype[method];
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(path);
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(RequestMethod.GET);
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it.each([
    ['listDepartments', 'countryId'],
    ['listCities', 'departmentId'],
  ] as const)('%s responde 400 si %s no es numerico', async (method, param) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, LocationController, method) as Record<
      string,
      { data: string; pipes: unknown[] }
    >;
    const paramArg = Object.values(args).find((a) => a.data === param);
    expect(paramArg?.pipes).toContain(ParseIntPipe);

    await expect(
      new ParseIntPipe().transform('abc', { type: 'param', data: param }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('delega en los servicios', async () => {
    const countryService = {
      findAll: vi.fn().mockResolvedValue(['c']),
    } as unknown as CountryService;
    const departmentService = {
      findByCountry: vi.fn().mockResolvedValue(['d']),
    } as unknown as DepartmentService;
    const cityService = {
      findByDepartment: vi.fn().mockResolvedValue(['y']),
    } as unknown as CityService;
    const controller = new LocationController(countryService, departmentService, cityService);

    await expect(controller.listCountries()).resolves.toEqual(['c']);
    await expect(controller.listDepartments(1)).resolves.toEqual(['d']);
    await expect(controller.listCities(2)).resolves.toEqual(['y']);
    expect(departmentService.findByCountry).toHaveBeenCalledWith(1);
    expect(cityService.findByDepartment).toHaveBeenCalledWith(2);
  });
});
