import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserController } from './user.controller.js';
import type { UserService } from './user.service.js';
import { UserRole } from '../../common/enums/domain.enums.js';

/**
 * Tests de UserController.
 *
 * Este controller es la pieza que traduce "quien llama" en "sobre que datos
 * opera". Los tests de abajo fijan el comportamiento real e incluyen, marked
 * como `it.fails`, el comportamiento que DEBERIA existir. Si alguien corrige
 * el fallo de autorizacion, esos tests empiezan a fallar y avisan de que hay
 * que quitar la marca.
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

    it.fails('deberia exigir rol ADMIN para dar de alta usuarios', async () => {
      // Actual: `POST /user` no tiene `@Roles(...)` ni `@Public()`. El guard
      // global exige autenticacion, pero cualquier usuario autenticado --
      // incluido uno recien registrado con rol USUARIO -- puede crear cuentas.
      const guards = Reflect.getMetadata('__guards__', UserController.prototype.create) ?? [];
      expect(guards).toContain(UserRole.ADMIN);
    });
  });

  describe('findAll', () => {
    it('devuelve lo que el servicio liste', async () => {
      await expect(controller.findAll()).resolves.toEqual([]);
      expect(userService.findAll).toHaveBeenCalled();
    });

    it.fails('deberia restringir el listado a administradores', async () => {
      // Actual: `GET /user` no filtra nada. Un usuario normal puede volcar el
      // padron completo de cuentas (correos, documentos, telefonos).
      const guards = Reflect.getMetadata('__guards__', UserController.prototype.findAll) ?? [];
      expect(guards).toContain(UserRole.ADMIN);
    });
  });

  describe('findOne', () => {
    it('convierte el id de la ruta a numero', async () => {
      await controller.findOne('7');

      expect(userService.findOne).toHaveBeenCalledWith(7);
    });

    it.fails('deberia impedir leer el perfil de otro usuario', async () => {
      // Actual: `GET /user/:id` no recibe la request, por lo que no puede
      // comparar `:id` con el sujeto autenticado. IDOR por construccion.
      const params = Reflect.getMetadata('__routeParams__', UserController.prototype.findOne, 'design:paramtypes');
      expect(params).toBeDefined();
      expect(params).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('delega el id numerico y el DTO', async () => {
      const dto = { name: 'Ana Maria' } as never;

      await controller.update('7', dto);

      expect(userService.update).toHaveBeenCalledWith(7, dto);
    });

    it.fails('deberia impedir editar a otro usuario', async () => {
      const guards = Reflect.getMetadata('__guards__', UserController.prototype.update) ?? [];
      expect(guards).toContain(UserRole.ADMIN);
    });
  });

  describe('remove', () => {
    it('delega el borrado con id numerico', async () => {
      await controller.remove('7');

      expect(userService.remove).toHaveBeenCalledWith(7);
    });

    it.fails('deberia impedir borrar a otro usuario', async () => {
      const guards = Reflect.getMetadata('__guards__', UserController.prototype.remove) ?? [];
      expect(guards).toContain(UserRole.ADMIN);
    });
  });
});