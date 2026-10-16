import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { DataSource, EntityManager } from 'typeorm';
import type { MembershipService } from '../membership/membership.service.js';
import type { MailService } from '../../common/utils/mail.js';
import type { AuthDao } from './auth.dao.js';
import type { UserService } from '../user/user.service.js';
import type { UserDao } from '../user/user.dao.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { Session } from './entities/session.entity.js';
import type { User } from '../user/user.entity.js';
import { Bcrypt } from '../../common/utils/bcrypt.js';
import { Jwt } from '../../common/utils/jwt.js';
import { TokenExpiry } from '../../common/utils/token-expiry.js';
import { ConfigService } from '../../config/config.service.js';
import { Captcha } from '../../common/utils/captcha.js';
import { Config } from '../../config/config.keys.js';
import { AccountStatus, MembershipStatus, UserRole } from '../../common/enums/domain.enums.js';

/**
 * Tests de la logica de autenticacion.
 *
 * Aqui se concentrates lo que de verdad importa: no se puede permitir que un
 * refresh token robado siga sirviendo, ni que una cuenta inactiva inicie
 * sesion, ni que un atacanteuer bloquee una cuenta ajena de forma permanente.
 */

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 1,
    name: 'Ana',
    lastName: 'Restrepo',
    email: 'ana@example.com',
    password: 'hash-bcrypt',
    role: UserRole.USUARIO,
    accountStatus: AccountStatus.ACTIVE,
    failedLoginAttempts: 0,
    lockedUntil: null,
    activationToken: null,
    activationTokenExpires: null,
    ...overrides,
  }) as User;

const buildSession = (overrides: Partial<Session> = {}): Session =>
  ({
    id: 10,
    userId: 1,
    refreshTokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    lastUsedAt: null,
    userAgent: null,
    ip: null,
    ...overrides,
  }) as Session;

const buildRegisterDto = (overrides: Partial<RegisterDto> = {}): RegisterDto =>
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
    captchaToken: 'captcha-token',
    captchaAnswer: 7,
    ...overrides,
  }) as RegisterDto;

describe('AuthService', () => {
  let authDao: AuthDao;
  let userService: UserService;
  let userDao: UserDao;
  let bcrypt: Bcrypt;
  let jwt: Jwt;
  let tokenExpiry: TokenExpiry;
  let configService: ConfigService;
  let captcha: Captcha;
  let manager: EntityManager;
  let dataSource: DataSource;
  let membershipService: MembershipService;
  let mail: MailService;
  let service: AuthService;

  beforeEach(() => {
    authDao = {
      createSession: vi.fn(),
      findByRefreshTokenHash: vi.fn(),
      findActiveSessions: vi.fn(),
      revokeSession: vi.fn(),
      revokeAllSessions: vi.fn(),
      touchSession: vi.fn(),
      purgeExpired: vi.fn(),
    } as unknown as AuthDao;

    userService = {
      create: vi.fn(),
      findOne: vi.fn(),
    } as unknown as UserService;

    userDao = {
      findByEmailWithPassword: vi.fn(),
      findByActivationToken: vi.fn(),
      update: vi.fn(),
    } as unknown as UserDao;

    // Se usa el Bcrypt real: el objetivo es verificar que el camino feliz
    // funciona con la libreria de verdad, no con un doble que siempre dice
    // "si". El coste de bcrypt en unos pocos tests es aceptable.
    bcrypt = new Bcrypt();

    jwt = new Jwt();

    tokenExpiry = new TokenExpiry();

    captcha = { verifyCaptcha: vi.fn().mockReturnValue(true) } as unknown as Captcha;

    configService = {
      get: vi.fn((key: string) => {
        const map: Record<string, string> = {
          [Config.JWT_SECRET]: 'secreto-de-acceso',
          [Config.JWT_REFRESH_SECRET]: 'secreto-de-refresco',
        };
        return map[key];
      }),
    } as unknown as ConfigService;

    manager = {} as EntityManager;
    dataSource = {
      transaction: vi.fn((cb: (m: EntityManager) => Promise<unknown>) => cb(manager)),
    } as unknown as DataSource;
    membershipService = {
      createForUser: vi
        .fn()
        .mockResolvedValue({ code: 'RTV-0123456789', status: MembershipStatus.ACTIVE }),
      findByUserId: vi.fn().mockResolvedValue(null),
    } as unknown as MembershipService;

    mail = { sendActivation: vi.fn().mockResolvedValue(undefined) } as unknown as MailService;

    service = new AuthService(
      authDao,
      userService,
      userDao,
      bcrypt,
      jwt,
      tokenExpiry,
      configService,
      captcha,
      dataSource,
      membershipService,
      mail,
    );
  });

  describe('getCaptcha', () => {
    it('no expone la respuesta al cliente', async () => {
      const real = new AuthService(
        authDao,
        userService,
        userDao,
        bcrypt,
        jwt,
        tokenExpiry,
        configService,
        new Captcha(),
      );

      const challenge = await real.getCaptcha();

      expect(challenge).toEqual({ token: expect.any(String), question: expect.any(String) });
      expect(challenge).not.toHaveProperty('answer');
    });
  });

  describe('register', () => {
    it('exige el captcha antes de crear el usuario', async () => {
      await expect(
        service.register(buildRegisterDto({ captchaToken: undefined })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('rechaza una respuesta de captcha incorrecta', async () => {
      (captcha.verifyCaptcha as ReturnType<typeof vi.fn>).mockReturnValue(false);

      await expect(service.register(buildRegisterDto())).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(captcha.verifyCaptcha).toHaveBeenCalledWith('captcha-token', 7);
      expect(userService.create).not.toHaveBeenCalled();
    });

    it('fuerza el rol USUARIO aunque el cliente intente enviar otro', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      const dto = buildRegisterDto();
      // Se simula un cliente malicioso que inyecta el campo a mano.
      await service.register({ ...dto, role: UserRole.ADMIN } as unknown as RegisterDto);

      expect(userService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.USUARIO }),
        manager,
        expect.any(Object),
      );
    });

    it('genera un token de activacion y lo persiste en la creacion del usuario', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      const result = await service.register(buildRegisterDto());

      expect(result.activationToken).toMatch(/^[0-9a-f]{64}$/);
      expect(userService.create).toHaveBeenCalledWith(expect.anything(), manager, {
        activationToken: result.activationToken,
        activationTokenExpires: expect.any(Date),
      });
      // Sin UPDATE posterior: el token viaja en el mismo INSERT.
      expect(userDao.update).not.toHaveBeenCalled();
    });

    it('crea usuario y membresia dentro de una transaccion', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser({ id: 5 }));

      const result = await service.register(buildRegisterDto());

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(membershipService.createForUser).toHaveBeenCalledWith(5, manager);
      expect(result.membership).toEqual({
        code: 'RTV-0123456789',
        status: MembershipStatus.ACTIVE,
      });
      expect(result.user).toMatchObject({ id: 5, email: 'ana@example.com' });
    });

    it('envia el correo de activacion tras la transaccion', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      const result = await service.register(buildRegisterDto());

      expect(mail.sendActivation).toHaveBeenCalledWith(
        'ana@example.com',
        'Ana',
        result.activationToken,
      );
      const txOrder = (dataSource.transaction as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0];
      const mailOrder = (mail.sendActivation as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0];
      expect(mailOrder).toBeGreaterThan(txOrder);
    });

    it('si el envio del correo falla, el registro igual termina bien', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (mail.sendActivation as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('smtp caido'));

      await expect(service.register(buildRegisterDto())).resolves.toMatchObject({
        user: { id: 1 },
        membership: { code: 'RTV-0123456789' },
      });
    });

    it('si la membresia falla, no se envia correo', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (membershipService.createForUser as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('sin membresia'),
      );

      await expect(service.register(buildRegisterDto())).rejects.toThrow();
      expect(mail.sendActivation).not.toHaveBeenCalled();
    });

    it('si la membresia falla, el error se propaga (la transaccion revierte al usuario)', async () => {
      (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      const error = new Error('sin membresia');
      (membershipService.createForUser as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(service.register(buildRegisterDto())).rejects.toBe(error);
    });

    it('devuelve el token solo fuera de produccion', async () => {
      const previous = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'production';
        (userService.create as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

        const result = await service.register(buildRegisterDto());

        // En produccion el token viaja por correo; devolverlo aqui equivaldria
        // a no verificar nada.
        expect(result.activationToken).toBeUndefined();
      } finally {
        process.env.NODE_ENV = previous;
      }
    });
  });

  describe('activate', () => {
    it('rechaza un token inexistente', async () => {
      (userDao.findByActivationToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.activate('x'.repeat(64))).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza un token expirado', async () => {
      (userDao.findByActivationToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({
          activationToken: 'x'.repeat(64),
          activationTokenExpires: new Date(Date.now() - 1_000),
        }),
      );

      await expect(service.activate('x'.repeat(64))).rejects.toThrow(/expirado/);
    });

    it('activa la cuenta e invalida el token en la misma operacion', async () => {
      (userDao.findByActivationToken as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({
          accountStatus: AccountStatus.INACTIVE,
          activationToken: 'x'.repeat(64),
          activationTokenExpires: new Date(Date.now() + 60_000),
        }),
      );
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({ accountStatus: AccountStatus.ACTIVE }),
      );

      const result = await service.activate('x'.repeat(64));

      expect(result.id).toBe(1);
      expect(userDao.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          accountStatus: AccountStatus.ACTIVE,
          activationToken: null,
          activationTokenExpires: null,
        }),
      );
    });
  });

  describe('login', () => {
    it('rechaza una contrasena incorrecta con el mismo mensaje que un correo inexistente', async () => {
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());

      const conUsuario = service.login({ email: 'ana@example.com', password: 'mala' });
      const sinUsuario = service.login({ email: 'nadie@example.com', password: 'mala' });

      await expect(conUsuario).rejects.toThrow('Correo o contrasena incorrectos');
      await expect(sinUsuario).rejects.toThrow('Correo o contrasena incorrectos');
    });

    it('no filtra si el correo existe: compara siempre contra bcrypt', async () => {
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const spy = vi.spyOn(bcrypt, 'comparePassword');

      await service.login({ email: 'nadie@example.com', password: 'mala' }).catch(() => {});

      // Aunque el usuario no exista, se ejecuta la comparacion: si no, el tiempo
      // de respuesta revelaria que correos estan registrados.
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('cuenta un intento fallido sin bloquear por debajo del maximo', async () => {
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await service.login({ email: 'ana@example.com', password: 'mala' }).catch(() => {});

      // `lockedUntil` NO aparece en el parche: la cuenta sigue desbloqueada.
      // Escribir `undefined` daria el mismo resultado en la base, pero a costa
      // de perder la intencion del codigo.
      const patch = (userDao.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(patch.failedLoginAttempts).toBe(1);
      expect(patch).not.toHaveProperty('lockedUntil');
    });

    it('bloquea temporalmente al alcanzar el maximo de intentos', async () => {
      const user = buildUser({ failedLoginAttempts: 4 });
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await service.login({ email: 'ana@example.com', password: 'mala' }).catch(() => {});

      // El quinto intento falla (5 >= 5) y bloquea 15 minutos, reiniciando el
      // contador para que el bloqueo caduque solo.
      const patch = (userDao.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(patch.lockedUntil).toBeInstanceOf(Date);
      expect(patch.failedLoginAttempts).toBe(0);
    });

    it('impide iniciar sesion a una cuenta inactiva', async () => {
      // Aqui la contrasena SI es correcta: lo que se prueba es el estado de la
      // cuenta, no la verificacion de la clave.
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);

      const user = buildUser({ accountStatus: AccountStatus.INACTIVE });
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await expect(
        service.login({ email: 'ana@example.com', password: 'la-correcta' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('RN-030: un login correcto revoca las sesiones previas antes de crear la nueva', async () => {
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (authDao.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.login({ email: 'ana@example.com', password: 'la-correcta' });

      expect(authDao.revokeAllSessions).toHaveBeenCalledTimes(1);
      expect(authDao.revokeAllSessions).toHaveBeenCalledWith(1);
      const revokeOrder = (authDao.revokeAllSessions as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0];
      const createOrder = (authDao.createSession as ReturnType<typeof vi.fn>).mock
        .invocationCallOrder[0];
      expect(revokeOrder).toBeLessThan(createOrder);
    });

    it('devuelve tokens, usuario, membresia y beneficios vacios', async () => {
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (membershipService.findByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 4,
        userId: 1,
        code: 'RTV-0123456789',
        status: MembershipStatus.ACTIVE,
      });

      const result = await service.login({ email: 'ana@example.com', password: 'ok' });

      expect(membershipService.findByUserId).toHaveBeenCalledWith(1);
      expect(result.membership).toEqual({
        code: 'RTV-0123456789',
        status: MembershipStatus.ACTIVE,
      });
      expect(result.benefits).toEqual([]);
      expect(result.user.email).toBe('ana@example.com');
      expect(result.accessToken).toEqual(expect.any(String));
      expect(result.refreshToken).toEqual(expect.any(String));
    });

    it('membership es null si el usuario no tiene membresia', async () => {
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      const result = await service.login({ email: 'ana@example.com', password: 'ok' });

      expect(result.membership).toBeNull();
      expect(result.benefits).toEqual([]);
    });

    it('RN-027: con el bloqueo vigente un fallo no suma intentos ni reajusta lockedUntil', async () => {
      const user = buildUser({
        failedLoginAttempts: 0,
        lockedUntil: new Date(Date.now() + 60_000),
      });
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await expect(
        service.login({ email: 'ana@example.com', password: 'mala' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(userDao.update).not.toHaveBeenCalled();
    });

    it('RN-027: con el bloqueo ya vencido un fallo vuelve a contar', async () => {
      const user = buildUser({ lockedUntil: new Date(Date.now() - 1_000) });
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await service.login({ email: 'ana@example.com', password: 'mala' }).catch(() => {});

      expect(userDao.update).toHaveBeenCalledTimes(1);
    });

    it('RN-027: el 5.o fallo consecutivo bloquea la cuenta 15 minutos', async () => {
      const user = buildUser({ failedLoginAttempts: 4 });
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      const before = Date.now();

      await service.login({ email: 'ana@example.com', password: 'mala' }).catch(() => {});

      const patch = (userDao.update as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const lockedMs = (patch.lockedUntil as Date).getTime() - before;
      expect(Math.abs(lockedMs - 15 * 60_000)).toBeLessThan(5_000);
    });

    it('RN-028: el access token dura 15 minutos (expiresIn 900)', async () => {
      vi.stubEnv('JWT_ACCESS_EXPIRES_IN', '15m');
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      const createToken = vi.spyOn(jwt, 'createToken');
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      const result = await service.login({ email: 'ana@example.com', password: 'ok' });

      expect(result.expiresIn).toBe(900);
      expect(createToken.mock.calls[0][2]).toEqual({ expiresIn: 900 });
      vi.unstubAllEnvs();
    });

    it('RN-029: la sesion (refresh) expira en 7 dias', async () => {
      vi.stubEnv('JWT_REFRESH_EXPIRES_IN', '7d');
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await service.login({ email: 'ana@example.com', password: 'ok' });

      const session = (authDao.createSession as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const diff = (session.expiresAt as Date).getTime() - (Date.now() + 7 * 24 * 3_600_000);
      expect(Math.abs(diff)).toBeLessThan(5_000);
      vi.unstubAllEnvs();
    });

    it('RN-031: una cuenta inactiva no crea sesion ni emite tokens', async () => {
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      const createToken = vi.spyOn(jwt, 'createToken');
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({ accountStatus: AccountStatus.INACTIVE }),
      );

      await service.login({ email: 'ana@example.com', password: 'ok' }).catch(() => {});

      expect(authDao.createSession).not.toHaveBeenCalled();
      expect(createToken).not.toHaveBeenCalled();
    });

    it('RN-030: un login fallido o con cuenta inactiva no revoca sesiones', async () => {
      const user = buildUser();
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);
      (userDao.update as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await service.login({ email: 'ana@example.com', password: 'mala' }).catch(() => {});

      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({ accountStatus: AccountStatus.INACTIVE }),
      );
      await service.login({ email: 'ana@example.com', password: 'ok' }).catch(() => {});

      expect(authDao.revokeAllSessions).not.toHaveBeenCalled();
    });

    it('impide iniciar sesion a una cuenta bloqueada', async () => {
      vi.spyOn(bcrypt, 'comparePassword').mockResolvedValue(true);

      const user = buildUser({ lockedUntil: new Date(Date.now() + 60_000) });
      (userDao.findByEmailWithPassword as ReturnType<typeof vi.fn>).mockResolvedValue(user);

      await expect(
        service.login({ email: 'ana@example.com', password: 'la-correcta' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('rechaza un token desconocido', async () => {
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.refresh('desconocido')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza una sesion expirada', async () => {
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildSession({ expiresAt: new Date(Date.now() - 1_000) }),
      );

      await expect(service.refresh('token')).rejects.toThrow(/expiro/);
    });

    it('detecta reutilizacion y revoca TODAS las sesiones del usuario', async () => {
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildSession({ revokedAt: new Date() }),
      );

      await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);

      // Es la respuesta al unico indicador fiable de robo de token: no se sabe
      // cual de las dos presentaciones es la falsa, asi que se cae todas.
      expect(authDao.revokeAllSessions).toHaveBeenCalledWith(1);
    });

    it('rechaza el refresh si la cuenta fue desactivada despues', async () => {
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildSession(),
      );
      // Sin refresh, una cuenta suspendida podria seguir operando con un access
      // token de larga duracion.
      (userService.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(
        buildUser({ accountStatus: AccountStatus.INACTIVE }),
      );

      await expect(service.refresh('token')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rota el token revocando la sesion anterior', async () => {
      const session = buildSession();
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(session);
      (userService.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(buildUser());
      (authDao.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await service.refresh('token');

      expect(authDao.revokeSession).toHaveBeenCalledWith(session.id);
      expect(authDao.createSession).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('no falla si la sesion ya no existe', async () => {
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.logout('token')).resolves.toBeUndefined();
      expect(authDao.revokeSession).not.toHaveBeenCalled();
    });

    it('revoca la sesion activa', async () => {
      const session = buildSession();
      (authDao.findByRefreshTokenHash as ReturnType<typeof vi.fn>).mockResolvedValue(session);

      await service.logout('token');

      expect(authDao.revokeSession).toHaveBeenCalledWith(session.id);
    });
  });
});
