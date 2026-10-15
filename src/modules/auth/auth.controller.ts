import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService, SessionContext } from './auth.service.js';
import { LoginDto, RefreshTokenDto } from './dto/login.dto.js';
import { ActivateAccountDto } from './dto/activate-account.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUser } from './interfaces/auth-response.interface.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';

/** Nombres de las cookies de sesion, centralizados para no desincronizarlos. */
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registro.
   *
   * `@Public` es obligatorio: el guard global protege TODO por defecto. Sin
   * esta marca, un usuario sin sesion no podria crear su cuenta, que es el
   * deadlock clasico al activar un guard global sin excepciones.
   */
  /**
   * Registro publico. Usa `RegisterDto`, NO `CreateUserDto`: el endpoint es
   * publico y el DTO general admite `role`, lo que permitiria auto-asignarse
   * admin en el registro.
   */
  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{ user: AuthUser; activationToken?: string }> {
    return this.authService.register(dto);
  }

  /**
   * Confirmacion de cuenta. Es publica porque el usuario aun no tiene sesion:
   * literalmente no puede autenticarse para activar su propia cuenta.
   */
  @Public()
  @Post('activate')
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateAccountDto): Promise<{ user: AuthUser }> {
    const user = await this.authService.activate(dto.token);
    return { user };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    const result = await this.authService.login(dto, this.contextFrom(request));
    this.setAuthCookies(response, result);
    return result;
  }

  /**
   * El refresh es publico a proposito: cuando se le llama, el access token ya
   * expiro y el guard lo rechazaria. La seguridad no esta en "estar
   * autenticado" sino en que el refresh token sea valido, no este revocado y
   * no se haya reutilizado.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    // Acepta el token del cuerpo (movil/TV) o de la cookie (navegador).
    // Si falta, se responde 401 y no un error de validacion: la ausencia del
    // token ES una peticion no autorizada.
    const refreshToken = dto?.refreshToken ?? this.readRefreshCookie(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token no proporcionado');
    }

    const result = await this.authService.refresh(
      refreshToken,
      this.contextFrom(request),
    );
    this.setAuthCookies(response, result);
    return result;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshTokenDto | undefined,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = dto?.refreshToken ?? this.readRefreshCookie(request);

    // Logout sin token no es un error: el cliente quiere quedar sin sesion y
    // eso ya ocurrio. La cookie se borra igual, asi que el navegador queda
    // desconectado aunque el cuerpo venga vacio.
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearAuthCookies(response);
  }

  /** Revoca todas las sesiones del usuario autenticado. */
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const userId = request.user?.id;
    if (userId === undefined) {
      throw new UnauthorizedException('Token invalido o expirado');
    }

    await this.authService.logoutAll(userId);
    this.clearAuthCookies(response);
  }

  /** Identidad del usuario autenticado, segun lo que afirma su access token. */
  @Get('me')
  me(@Req() request: AuthenticatedRequest): {
    id: number;
    email?: string;
    role?: string;
  } {
    return {
      id: request.user?.id as number,
      email: request.user?.email,
      role: request.user?.role,
    };
  }

  // --------------------------------------------------------------- privado

  /**
   * Cookies httpOnly: el JavaScript de la pagina no puede leerlas, asi que un
   * XSS no puede robar el token. `sameSite: 'strict'` impide que se envien en
   * peticiones originadas por otro sitio. `secure` depende del entorno: en
   * produccion debe ser `true` siempre, y en local el navegador descartaria
   * la cookie si se exigiera HTTPS.
   */
  private setAuthCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookie(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });

    // El refresh se limita a /auth: es la unica ruta que lo necesita. Asi, si
    // el servidor llegara a emitirlo en otra respuesta, el navegador no lo
    // adjuntaria a las peticiones normales de la API.
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/auth',
    });
  }

  private clearAuthCookies(response: Response): void {
    const isProduction = process.env.NODE_ENV === 'production';

    response.clearCookie(ACCESS_COOKIE, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
    });

    response.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/auth',
    });
  }

  private readRefreshCookie(request: Request): string | undefined {
    const value = request.cookies?.[REFRESH_COOKIE];
    return typeof value === 'string' && value ? value : undefined;
  }

  /**
   * IP y user-agent se guardan en la sesion: sirven para "ver mis dispositivos"
   * y para detectar un token usado desde un lugar insospechado. Se lee
   * `x-forwarded-for` porque detras de un proxy (Nginx, balanceador) `req.ip`
   * seria siempre la direccion del proxy, no la del cliente real.
   */
  private contextFrom(request: Request): SessionContext {
    const forwarded = request.headers['x-forwarded-for'];
    const firstHop = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];

    return {
      ip: firstHop?.trim() || request.ip || request.socket?.remoteAddress,
      userAgent: request.headers['user-agent'],
    };
  }
}
