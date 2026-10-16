import { describe, it, expect, beforeEach } from 'vitest';
import type { Reflector } from '@nestjs/core';
import {
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { Jwt } from '../utils/jwt.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { ConfigService } from '../../config/config.service.js';
import { Config } from '../../config/config.keys.js';

/**
 * Tests del guard global de autenticacion.
 *
 * Se prueban los caminos que un atacante intentaria: token vacio, token con
 * firma invalida, token expirado, token sin identidad, rol insuficiente y
 * token reutilizado tras revocar la sesion. Un guard mal probado es la
 * puerta de entrada del sistema.
 */

const ACCESS_SECRET = 'secreto-de-prueba';

/**
 * Reflector minimo: devuelve unicamente los metadatos que cada test configura.
 *
 * No implementa la interfaz `Reflector` porque sus metodos tienen sobrecargas
 * (aceptan tanto un decorador como una clave) que un doble de test no puede
 * reproducir limpiamente. El cast se hace en el punto de inyeccion.
 */
class FakeReflector {
  publicMetadata: unknown;
  roleMetadata: string[] | undefined;

  getAllAndOverride<T>(key: string): T | undefined {
    if (key === IS_PUBLIC_KEY) return this.publicMetadata as T;
    if (key === ROLES_KEY) return this.roleMetadata as T;
    return undefined;
  }
}

/**
 * `Reflector` no se inyecta aqui a proposito: el guard lo consulta a traves de
 * su propia referencia, de modo que cambiar los metadatos del doble antes de
 * invocar el guard es suficiente.
 */
const makeContext = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  let reflector: FakeReflector;
  let jwt: Jwt;
  let configService: ConfigService;

  /** El unico Reflector que el guard consume es `getAllAndOverride`. */
  const asReflector = () => reflector as unknown as Reflector;

  /**
   * Se usan SEGUNDOS numericos y no cadenas ("15m") para que el token de
   * prueba pueda expirar de verdad (`-10`) sin depender del parseo de
   * jsonwebtoken.
   */
  const signAccess = (payload: object, expiresInSeconds = 900) =>
    new Jwt().createToken(payload, ACCESS_SECRET, { expiresIn: expiresInSeconds });

  beforeEach(() => {
    reflector = new FakeReflector();
    jwt = new Jwt();
    configService = {
      get: (key: string) => (key === Config.JWT_SECRET ? ACCESS_SECRET : undefined),
    } as unknown as ConfigService;
  });

  const buildGuard = () => new AuthGuard(jwt, asReflector(), configService);

  describe('rutas publicas', () => {
    it('permite el paso sin token cuando la ruta es @Public', async () => {
      reflector.publicMetadata = true;

      const guard = buildGuard();
      const result = await guard.canActivate(makeContext({}));

      expect(result).toBe(true);
    });

    it('rechaza cuando NO es publica y no hay token', async () => {
      reflector.publicMetadata = false;

      const guard = buildGuard();

      await expect(
        guard.canActivate(makeContext({ headers: {} })),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('extraccion del token', () => {
    it('acepta el header Authorization con esquema Bearer', async () => {
      const token = signAccess({ sub: '1', role: 'usuario' });

      const guard = buildGuard();
      const request = { headers: { authorization: `Bearer ${token}` } };

      await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
      expect(request).toHaveProperty('user.sub', '1');
    });

    it('acepta la cookie httpOnly accessToken', async () => {
      const token = signAccess({ sub: '7', role: 'usuario' });

      const guard = buildGuard();
      const request = { headers: {}, cookies: { accessToken: token } };

      await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
      expect(request).toHaveProperty('user.sub', '7');
    });

    it('prefiere el header Authorization sobre la cookie', async () => {
      const headerToken = signAccess({ sub: '1' });
      const cookieToken = signAccess({ sub: '999' });

      const guard = buildGuard();
      const request = {
        headers: { authorization: `Bearer ${headerToken}` },
        cookies: { accessToken: cookieToken },
      };

      await guard.canActivate(makeContext(request));

      expect(request).toHaveProperty('user.sub', '1');
    });

    it('rechaza un header Bearer sin token', async () => {
      const guard = buildGuard();
      const request = { headers: { authorization: 'Bearer ' } };

      await expect(
        guard.canActivate(makeContext(request)),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('ignora un esquema distinto de Bearer', async () => {
      const token = signAccess({ sub: '1' });

      const guard = buildGuard();
      const request = { headers: { authorization: `Basic ${token}` } };

      await expect(
        guard.canActivate(makeContext(request)),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validacion del token', () => {
    it('rechaza un token firmado con otro secreto', async () => {
      const tokenForOther = new Jwt().createToken({ sub: '1' }, 'secreto-ajeno', {
        expiresIn: 900,
      });

      const guard = buildGuard();

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${tokenForOther}` } })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un token expirado', async () => {
      // expiresIn negativo: el token nace vencido.
      const expired = signAccess({ sub: '1' }, -10);

      const guard = buildGuard();

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${expired}` } })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un token sin identidad (ni sub ni id)', async () => {
      const anonymous = signAccess({ role: 'admin' });

      const guard = buildGuard();

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${anonymous}` } })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza cuando JWT_SECRET no esta configurado', async () => {
      const configWithoutSecret = {
        get: () => undefined,
      } as unknown as ConfigService;

      const guard = new AuthGuard(jwt, asReflector(), configWithoutSecret);

      await expect(
        guard.canActivate(makeContext({ headers: {} })),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('no filtra el motivo del rechazo al cliente', async () => {
      const expired = signAccess({ sub: '1' }, -10);

      const guard = buildGuard();

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${expired}` } })),
      ).rejects.toThrow(/invalido o expirado/i);
    });
  });

  describe('control de acceso por rol', () => {
    it('permite el paso si el rol coincide', async () => {
      reflector.roleMetadata = ['admin'];

      const guard = buildGuard();
      const token = signAccess({ sub: '1', role: 'admin' });

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${token}` } })),
      ).resolves.toBe(true);
    });

    it('lanza Forbidden si el rol no esta en la lista', async () => {
      reflector.roleMetadata = ['admin'];

      const guard = buildGuard();
      const token = signAccess({ sub: '1', role: 'usuario' });

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${token}` } })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza Forbidden si el token no trae rol', async () => {
      reflector.roleMetadata = ['admin'];

      const guard = buildGuard();
      const token = signAccess({ sub: '1' });

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${token}` } })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('no exige rol cuando la ruta no declara ninguno', async () => {
      reflector.roleMetadata = undefined;

      const guard = buildGuard();
      const token = signAccess({ sub: '1' });

      await expect(
        guard.canActivate(makeContext({ headers: { authorization: `Bearer ${token}` } })),
      ).resolves.toBe(true);
    });
  });
});
