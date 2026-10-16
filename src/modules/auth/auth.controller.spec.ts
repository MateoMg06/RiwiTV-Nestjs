import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response } from 'express';
import { RequestMethod, UnauthorizedException } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { AuthResponse } from './interfaces/auth-response.interface.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { UserRole } from '../../common/enums/domain.enums.js';

/**
 * Tests del controller de autenticacion.
 *
 * El service ya esta cubierto; aqui lo que se verifica es la FRONTERA HTTP:
 * que cookies se emiten, con que atributos, de donde se lee el refresh token
 * (cuerpo o cookie) y que se responde cuando falta. Son detalles que decides
 * desde el navegador: una cookie sin `httpOnly`, un refresh accesible por
 * JavaScript o un `secure` mal puesto valen mas que cualquier logica de
 * negocio correcta.
 */

const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refresh_token';

const tokens: AuthResponse = {
  accessToken: 'access-fake',
  refreshToken: 'refresh-fake',
  expiresIn: 900,
  user: {
    id: 1,
    name: 'Ana',
    lastName: 'Restrepo',
    email: 'ana@example.com',
    role: UserRole.USUARIO,
  },
};

/** Busqueda plana de las llamadas a `response.cookie`. */
const cookieCalls = (response: Response) =>
  (response.cookie as unknown as ReturnType<typeof vi.fn>).mock.calls;

const cookieByName = (response: Response, name: string) =>
  cookieCalls(response).find(([key]) => key === name);

const buildRequest = (overrides: Partial<Request> = {}): Request =>
  ({
    headers: {},
    cookies: {},
    ...overrides,
  }) as unknown as Request;

const buildResponse = (): Response =>
  ({
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  }) as unknown as Response;

describe('AuthController', () => {
  let authService: AuthService;
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      register: vi.fn(),
      activate: vi.fn(),
      login: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      logoutAll: vi.fn(),
    } as unknown as AuthService;

    controller = new AuthController(authService);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ------------------------------------------------------------------ register

  describe('register', () => {
    it('delega el alta en el servicio y devuelve su resultado', async () => {
      const created = { user: tokens.user, activationToken: 'a'.repeat(64) };
      (authService.register as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const dto = { email: 'ana@example.com' } as never;
      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it('propaga el conflicto cuando el correo ya esta registrado', async () => {
      (authService.register as ReturnType<typeof vi.fn>).mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(controller.register({} as never)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  // ------------------------------------------------------------------ activate

  describe('activate', () => {
    it('responde en POST verify-email y en el alias activate, 200 y público', () => {
      const handler = AuthController.prototype.activate;
      expect(Reflect.getMetadata('path', handler)).toEqual(['verify-email', 'activate']);
      expect(Reflect.getMetadata('method', handler)).toBe(RequestMethod.POST);
      expect(Reflect.getMetadata('__httpCode__', handler)).toBe(200);
      expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    });

    it('envuelve el usuario activado en la forma { user }', async () => {
      (authService.activate as ReturnType<typeof vi.fn>).mockResolvedValue(tokens.user);

      const result = await controller.activate({ token: 'a'.repeat(64) });

      expect(authService.activate).toHaveBeenCalledWith('a'.repeat(64));
      expect(result).toEqual({ user: tokens.user });
    });
  });

  // --------------------------------------------------------------------- login

  describe('login', () => {
    it('devuelve los tokens en el cuerpo para clientes que no manejan cookies', async () => {
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const response = buildResponse();

      const result = await controller.login(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        buildRequest(),
        response,
      );

      expect(result).toEqual(tokens);
    });

    it('emite las dos cookies httpOnly, con la de refresh restringida a /api/auth', async () => {
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const response = buildResponse();

      await controller.login(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        buildRequest(),
        response,
      );

      const access = cookieByName(response, ACCESS_COOKIE);
      const refresh = cookieByName(response, REFRESH_COOKIE);

      // `httpOnly` es la unica barrera real contra XSS: sin ella, cualquier
      // script inyectado puede leer el token y salir con la sesion del usuario.
      expect(access?.[1]).toBe(tokens.accessToken);
      expect(access?.[2]).toMatchObject({ httpOnly: true, path: '/' });

      // El refresh solo lo necesita /api/auth: limitar el path reduce la ventana
      // en la que un token de renovacion viaja en peticiones normales.
      expect(refresh?.[1]).toBe(tokens.refreshToken);
      expect(refresh?.[2]).toMatchObject({ httpOnly: true, path: '/api/auth' });
    });

    it('no marca secure fuera de produccion (si, el navegador rechazaria la cookie en local)', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const response = buildResponse();

      await controller.login(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        buildRequest(),
        response,
      );

      expect(cookieByName(response, ACCESS_COOKIE)?.[2]).toMatchObject({ secure: false });
    });

    it('fuerza secure y sameSite strict en produccion', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const response = buildResponse();

      await controller.login(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        buildRequest(),
        response,
      );

      expect(cookieByName(response, ACCESS_COOKIE)?.[2]).toMatchObject({
        secure: true,
        sameSite: 'strict',
      });
      expect(cookieByName(response, REFRESH_COOKIE)?.[2]).toMatchObject({
        secure: true,
        sameSite: 'strict',
      });
    });

    it('toma la IP del primer salto de x-forwarded-for, no la del proxy', async () => {
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const request = buildRequest({
        headers: {
          'x-forwarded-for': '203.0.113.7, 10.0.0.1',
          'user-agent': 'RiwiTV/1.0',
        },
      });

      await controller.login(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        request,
        buildResponse(),
      );

      // Detras de un balanceador `req.ip` es la del proxy: registrar eso haria
      // inutil la auditoria de "mis dispositivos".
      expect(authService.login).toHaveBeenCalledWith(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        { ip: '203.0.113.7', userAgent: 'RiwiTV/1.0' },
      );
    });

    it('cae a req.ip cuando no hay cabecera de proxy', async () => {
      (authService.login as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const request = { headers: {}, ip: '198.51.100.4' } as unknown as Request;

      await controller.login(
        { email: 'ana@example.com', password: 'Contrasena1!' },
        request,
        buildResponse(),
      );

      expect(authService.login).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ip: '198.51.100.4' }),
      );
    });
  });

  // ------------------------------------------------------------------- refresh

  describe('refresh', () => {
    it('usa el token del cuerpo cuando viene (movil / TV)', async () => {
      (authService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const response = buildResponse();

      await controller.refresh({ refreshToken: 'refresh-fake' }, buildRequest(), response);

      expect(authService.refresh).toHaveBeenCalledWith('refresh-fake', expect.anything());
      expect(cookieByName(response, REFRESH_COOKIE)?.[2]).toMatchObject({
        httpOnly: true,
      });
    });

    it('cae a la cookie cuando el cuerpo viene vacio (navegador)', async () => {
      (authService.refresh as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
      const request = buildRequest({
        cookies: { [REFRESH_COOKIE]: 'refresh-de-cookie' },
      });

      await controller.refresh(undefined, request, buildResponse());

      expect(authService.refresh).toHaveBeenCalledWith('refresh-de-cookie', expect.anything());
    });

    it('responde 401 -no 400- cuando no hay token en ninguna parte', async () => {
      // La ausencia del token ES una peticion no autorizada, no un error de
      // validacion de entrada: un 400 haria que el cliente lo tratara como un
      // bug de formulario en lugar de "vuelve a iniciar sesion".
      await expect(
        controller.refresh(undefined, buildRequest(), buildResponse()),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('ignora una cookie de refresh vacia o no textual', async () => {
      const request = buildRequest({ cookies: { [REFRESH_COOKIE]: '' } });

      await expect(controller.refresh(undefined, request, buildResponse())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  // -------------------------------------------------------------------- logout

  describe('logout', () => {
    it('revoca la sesion indicada por la cookie', async () => {
      const request = buildRequest({
        cookies: { [REFRESH_COOKIE]: 'refresh-de-cookie' },
      });

      await controller.logout(undefined, request, buildResponse());

      expect(authService.logout).toHaveBeenCalledWith('refresh-de-cookie');
    });

    it('borra las cookies aun sin token: el cliente quiere quedar sin sesion', async () => {
      const response = buildResponse();

      // Sin token no es un error: el logout ya ocurrio. Propagar un 401 aqui
      // obliga al frontend a manejar un caso que en realidad es un exito.
      await expect(controller.logout(undefined, buildRequest(), response)).resolves.toBeUndefined();

      expect(authService.logout).not.toHaveBeenCalled();
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('limpia con las MISMAS opciones con las que se emiten', async () => {
      // Si `clearCookie` no replica `path`, el navegador conserva la cookie y
      // el logout no surte efecto: es el fallo clasico de este endpoint.
      const response = buildResponse();

      await controller.logout(undefined, buildRequest(), response);

      const calls = (response.clearCookie as unknown as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls.find(([name]) => name === ACCESS_COOKIE)?.[1]).toMatchObject({
        httpOnly: true,
        path: '/',
      });
      expect(calls.find(([name]) => name === REFRESH_COOKIE)?.[1]).toMatchObject({
        httpOnly: true,
        path: '/api/auth',
      });
    });
  });

  // ----------------------------------------------------------------- logoutAll

  describe('logout-all', () => {
    it('revoca TODAS las sesiones del usuario del token', async () => {
      const request = {
        headers: {},
        user: { id: 7, role: UserRole.USUARIO },
      } as unknown as AuthenticatedRequest;
      const response = buildResponse();

      await controller.logoutAll(request, response);

      expect(authService.logoutAll).toHaveBeenCalledWith(7);
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('rechaza si la peticion llego sin identidad resuelta', async () => {
      const request = { headers: {}, user: undefined } as unknown as AuthenticatedRequest;

      await expect(controller.logoutAll(request, buildResponse())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(authService.logoutAll).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------------ me

  describe('me', () => {
    it('devuelve la identidad que afirma el access token', () => {
      const request = {
        user: { id: 7, email: 'ana@example.com', role: UserRole.USUARIO },
      } as unknown as AuthenticatedRequest;

      const result = controller.me(request);

      expect(result).toEqual({ id: 7, email: 'ana@example.com', role: UserRole.USUARIO });
    });

    it('nunca incluye el hash de contrasena ni tokens', () => {
      const request = {
        user: {
          id: 7,
          email: 'ana@example.com',
          role: UserRole.USUARIO,
          password: '$2b$10$hash',
          activationToken: 'secreto',
        },
      } as unknown as AuthenticatedRequest;

      // La projection es explicita: aunque el payload tuviera campos de sobra,
      // el controller devuelve solo estos tres.
      expect(Object.keys(controller.me(request)).sort()).toEqual(['email', 'id', 'role']);
    });
  });
});
