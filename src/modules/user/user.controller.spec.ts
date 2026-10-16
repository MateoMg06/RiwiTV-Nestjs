import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { UserController } from './user.controller.js';
import type { UserService } from './user.service.js';
import { UserRole } from '../../common/enums/domain.enums.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';

const rolesOf = (handler: unknown): string[] => Reflect.getMetadata(ROLES_KEY, handler) ?? [];

/**
 * Tests de UserController.
 *
 * Este controller es la pieza que traduce "quien llama" en "sobre que datos
 * opera". Incluye pruebas de autorizacion: un usuario autenticado solo puede
 * leer, editar o borrar su propio perfil; solo un admin puede hacerlo con el
 * de otros.
 */

describe('UserController', () => {
  let userService: UserService;
  let controller: UserController;

  beforeEach(() => {
    userService = {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      findAll: vi.fn().mockResolvedValue([]),
      findOne: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      remove: vi.fn().mockResolvedValue(undefined),
    } as unknown as UserService;

    controller = new UserController(userService);
  });

  describe('create', () => {
    it('delega el alta en el servicio', async () => {
      const dto = { name: 'Ana', email: 'ana@example.com' } as never;

      await controller.create(dto);

      expect(userService.create).toHaveBeenCalledWith(dto);
    });

    it('exige rol ADMIN para dar de alta usuarios', () => {
      // El alta publica es /auth/register (con captcha y activacion).
      expect(rolesOf(UserController.prototype.create)).toEqual([UserRole.ADMIN]);
    });
  });

  describe('findAll', () => {
    it('devuelve lo que el servicio liste', async () => {
      await expect(controller.findAll()).resolves.toEqual([]);
      expect(userService.findAll).toHaveBeenCalled();
    });

    it('restringe el listado a administradores', () => {
      expect(rolesOf(UserController.prototype.findAll)).toEqual([UserRole.ADMIN]);
    });
  });

  describe('findOne', () => {
    it('consulta el id recibido', async () => {
      await controller.findOne(7, { user: { id: 7, role: UserRole.ADMIN } } as any);

      expect(userService.findOne).toHaveBeenCalledWith(7);
    });

    it('impide leer el perfil de otro usuario', async () => {
      const request = { user: { id: 1, role: UserRole.USUARIO } } as any;

      expect(() => controller.findOne(7, request)).toThrow(ForbiddenException);
      expect(userService.findOne).not.toHaveBeenCalled();
    });

    it('permite leer el propio perfil', async () => {
      const request = { user: { id: 7, role: UserRole.USUARIO } } as any;

      await controller.findOne(7, request);
      expect(userService.findOne).toHaveBeenCalledWith(7);
    });

    it('permite a admin leer cualquier perfil', async () => {
      const request = { user: { id: 1, role: UserRole.ADMIN } } as any;

      await controller.findOne(7, request);
      expect(userService.findOne).toHaveBeenCalledWith(7);
    });
  });

  describe('update', () => {
    it('delega el id numerico y el DTO', async () => {
      const dto = { name: 'Ana Maria' } as never;

      await controller.update(7, dto, { user: { id: 7, role: UserRole.ADMIN } } as any);

      expect(userService.update).toHaveBeenCalledWith(7, dto);
    });

    it('impide editar el perfil de otro usuario', async () => {
      const request = { user: { id: 1, role: UserRole.USUARIO } } as any;

      expect(() => controller.update(7, { name: 'X' }, request)).toThrow(
        ForbiddenException,
      );
      expect(userService.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('delega el borrado con id numerico', async () => {
      await controller.remove(7, { user: { id: 7, role: UserRole.ADMIN } } as any);

      expect(userService.remove).toHaveBeenCalledWith(7);
    });

    it('impide borrar el perfil de otro usuario', async () => {
      const request = { user: { id: 1, role: UserRole.USUARIO } } as any;

      expect(() => controller.remove(7, request)).toThrow(ForbiddenException);
      expect(userService.remove).not.toHaveBeenCalled();
    });
  });
});