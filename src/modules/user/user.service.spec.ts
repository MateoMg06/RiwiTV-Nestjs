import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserService } from './user.service.js';
import type { UserDao } from './user.dao.js';
import type { CityDao } from '../country/city/city.dao.js';
import type { CinemaDao } from '../cinema/cinema.dao.js';
import type { CreateUserDto } from './create-user.dto.js';
import type { UpdateUserDto } from './update-user.dto.js';
import type { User } from './user.entity.js';
import { Bcrypt } from '../../common/utils/bcrypt.js';
import { Password } from '../../common/utils/password.js';
import { UserRole } from '../../common/enums/domain.enums.js';

/**
 * Tests de UserService.
 *
 * Es la pieza que decide COMO se guarda una credencial y QUE campos puede
 * elegir el cliente. Dos propiedades son innegociables: la contrasena nunca se
 * guarda en claro y el rol nunca viene del cliente. Ambas se verifican aqui con
 * bcrypt real, no con un doble que devuelve "todo bien".
 */

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    name: 'Ana',
    lastName: 'Restrepo',
    email: 'ana@example.com',
    role: UserRole.USUARIO,
    ...overrides,
  }) as User;

const buildCreateDto = (overrides: Partial<CreateUserDto> = {}): CreateUserDto =>
  ({
    name: 'Ana',
    lastName: 'Restrepo',
    email: 'ana@example.com',
    confirmEmail: 'ana@example.com',
    password: 'Contrasena1!',
    confirmPassword: 'Contrasena1!',
    phone: '+573001234567',
    documentType: 'CC',
    documentNumber: 'CC123456',
    birthDate: new Date('1995-01-01'),
    acceptsDataProcessing: true,
    acceptsTerms: true,
    acceptsNotifications: false,
    ...overrides,
  }) as CreateUserDto;

describe('UserService', () => {
  let userDao: UserDao;
  let cityDao: CityDao;
  let cinemaDao: CinemaDao;
  let bcrypt: Bcrypt;
  let service: UserService;

  beforeEach(() => {
    userDao = {
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByEmailWithPassword: vi.fn(),
      findByDocumentNumber: vi.fn().mockResolvedValue(null),
      findByActivationToken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as UserDao;

    cityDao = { findById: vi.fn() } as unknown as CityDao;
    cinemaDao = { countActiveByCityId: vi.fn() } as unknown as CinemaDao;

    bcrypt = new Bcrypt();
    service = new UserService(userDao, bcrypt, new Password(), cityDao, cinemaDao);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('findOne / findAll / remove', () => {
    it('devuelve 404 si el usuario no existe', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('elimina y propaga 404 cuando el DAO no borro nada', async () => {
      (userDao.delete as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      await expect(service.remove(99)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('elimina sin lanzar cuando el DAO confirma el borrado', async () => {
      (userDao.delete as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await expect(service.remove(1)).resolves.toBeUndefined();
    });
  });

  describe('create', () => {
    it('rechaza un correo ya registrado', async () => {
      (userDao.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await expect(service.create(buildCreateDto())).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(userDao.create).not.toHaveBeenCalled();
    });

    it('rechaza contrasenas que no coinciden', async () => {
      await expect(
        service.create(buildCreateDto({ confirmPassword: 'Otra1!' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza correos que no coinciden', async () => {
      await expect(
        service.create(buildCreateDto({ confirmEmail: 'otro@example.com' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('exige consentimiento de tratamiento de datos y no escribe nada en la base', async () => {
      await expect(
        service.create(buildCreateDto({ acceptsDataProcessing: false })),
      ).rejects.toBeInstanceOf(BadRequestException);

      // El consentimiento se valida ANTES de tocar la base: guardar el usuario y
      // fallar despues dejaria un registro sin consentimiento valido, que es
      // justo lo que la norma de datos prohibe.
      expect(userDao.create).not.toHaveBeenCalled();
    });

    it('exige aceptar los terminos', async () => {
      await expect(
        service.create(buildCreateDto({ acceptsTerms: false })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userDao.create).not.toHaveBeenCalled();
    });

    it('rechaza un documento ya registrado', async () => {
      (userDao.findByDocumentNumber as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser(),
      );

      await expect(service.create(buildCreateDto())).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(userDao.create).not.toHaveBeenCalled();
    });

    it('guarda la contrasena hasheada con bcrypt, nunca en claro', async () => {
      (userDao.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await service.create(buildCreateDto());

      const saved = (userDao.create as ReturnType<typeof vi.fn>).mock.calls[0][0];

      expect(saved.password).not.toBe('Contrasena1!');
      expect(saved.password).toMatch(/^\$2[aby]\$/);
      // Verificacion funcional, no de forma: el hash realmente acepta la clave.
      await expect(bcrypt.comparePassword('Contrasena1!', saved.password)).resolves.toBe(true);
    });

    it('respeta SALT_ROUNDS del entorno', async () => {
      vi.stubEnv('SALT_ROUNDS', '4');
      const cheap = new UserService(userDao, new Bcrypt(), new Password(), cityDao, cinemaDao);
      (userDao.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await cheap.create(buildCreateDto());

      const saved = (userDao.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved.password).toMatch(/^\$2[aby]\$04\$/);
    });

    it('fuerza el rol USUARIO aunque el cliente envíe admin', async () => {
      (userDao.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      // Defensa en profundidad: proteger solo el endpoint publico deja la puerta
      // abierta en cuanto alguien reutilice este servicio desde otro sitio.
      await service.create(buildCreateDto({ role: UserRole.ADMIN }));

      expect((userDao.create as ReturnType<typeof vi.fn>).mock.calls[0][0].role).toBe(
        UserRole.USUARIO,
      );
    });

    it('nunca persiste los campos de confirmacion', async () => {
      (userDao.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await service.create(buildCreateDto());

      const saved = (userDao.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(saved).not.toHaveProperty('confirmPassword');
      expect(saved).not.toHaveProperty('confirmEmail');
    });
  });

  describe('update', () => {
    it('propaga 404 si el usuario no existe', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(99, {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rechaza cambiar a un correo que otro usuario ya usa', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (userDao.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({ id: 2 }),
      );

      await expect(
        service.update(1, { email: 'tomado@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('permite mantener el propio correo sin entrar en conflicto consigo mismo', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (userDao.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser({ id: 1 }));
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await expect(
        service.update(1, { email: 'ana@example.com' }),
      ).resolves.toBeDefined();
    });

    it('exige confirmar la contrasena cuando se cambia', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await expect(
        service.update(1, { password: 'NuevaClave1!' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza confirmaciones que no coinciden', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await expect(
        service.update(1, { password: 'NuevaClave1!', confirmPassword: 'Otra1!' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hashea la nueva contrasena', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await service.update(1, { password: 'NuevaClave1!', confirmPassword: 'NuevaClave1!' });

      const patch = (userDao.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(patch.password).toMatch(/^\$2[aby]\$/);
      await expect(
        bcrypt.comparePassword('NuevaClave1!', patch.password),
      ).resolves.toBe(true);
    });

    it('ignora un rol enviado por el cliente en la actualizacion', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await service.update(1, { name: 'Ana Maria', role: UserRole.ADMIN } as UpdateUserDto);

      // Un usuario no se auto-promueve: la promocion de rol es una operacion
      // administrativa explicita y separada.
      expect((userDao.update as ReturnType<typeof vi.fn>).mock.calls[0][1]).not.toHaveProperty(
        'role',
      );
    });

    it('no toca cityId al actualizar (la ciudad solo cambia por setLocation)', async () => {
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      await service.update(1, { name: 'Ana' });

      expect((userDao.update as ReturnType<typeof vi.fn>).mock.calls[0][1]).not.toHaveProperty(
        'cityId',
      );
    });

    it('devuelve el estado previo si el DAO no devuelve nada', async () => {
      const user = buildUser();
      (userDao.findById as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.update(1, { name: 'X' })).resolves.toBe(user);
    });
  });

  describe('setLocation (HU-002)', () => {
    const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mock(userDao.findById).mockResolvedValue(buildUser());
      mock(cityDao.findById).mockResolvedValue({ id: 5, isActive: true });
      mock(cinemaDao.countActiveByCityId).mockResolvedValue(1);
    });

    it('guarda la ciudad y devuelve el usuario actualizado', async () => {
      const updated = buildUser({ cityId: 5 });
      mock(userDao.update).mockResolvedValue(updated);

      await expect(service.setLocation(1, 5)).resolves.toBe(updated);
      expect(userDao.update).toHaveBeenCalledWith(1, { cityId: 5 });
      expect(cinemaDao.countActiveByCityId).toHaveBeenCalledWith(5);
    });

    it('404 si el usuario no existe y no consulta la ciudad', async () => {
      mock(userDao.findById).mockResolvedValue(null);

      await expect(service.setLocation(1, 5)).rejects.toThrow(
        new NotFoundException('Usuario no encontrado'),
      );
      expect(cityDao.findById).not.toHaveBeenCalled();
    });

    it('404 si la ciudad no existe', async () => {
      mock(cityDao.findById).mockResolvedValue(null);

      await expect(service.setLocation(1, 5)).rejects.toThrow(
        new NotFoundException('Ciudad no encontrada'),
      );
      expect(userDao.update).not.toHaveBeenCalled();
    });

    it('422 si la ciudad está inactiva y no consulta cines', async () => {
      mock(cityDao.findById).mockResolvedValue({ id: 5, isActive: false });

      const result = service.setLocation(1, 5);
      await expect(result).rejects.toBeInstanceOf(UnprocessableEntityException);
      await expect(result).rejects.toThrow('La ciudad está inactiva');
      expect(cinemaDao.countActiveByCityId).not.toHaveBeenCalled();
    });

    it('422 si la ciudad no tiene cines activos (RN-006) y no actualiza', async () => {
      mock(cinemaDao.countActiveByCityId).mockResolvedValue(0);

      const result = service.setLocation(1, 5);
      await expect(result).rejects.toBeInstanceOf(UnprocessableEntityException);
      await expect(result).rejects.toThrow('La ciudad no tiene cines activos');
      expect(userDao.update).not.toHaveBeenCalled();
    });

    it('permite cambiar de ciudad dos veces', async () => {
      mock(userDao.update).mockResolvedValue(buildUser());

      await service.setLocation(1, 5);
      await service.setLocation(1, 6);

      expect(mock(userDao.update).mock.calls).toEqual([
        [1, { cityId: 5 }],
        [1, { cityId: 6 }],
      ]);
    });
  });
});