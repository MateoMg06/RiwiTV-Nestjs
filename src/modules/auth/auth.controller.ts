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
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUser } from './interfaces/auth-response.interface.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { MembershipStatus } from '../../common/enums/domain.enums.js';
import { CaptchaChallenge } from '../../common/utils/captcha.js';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiAuth } from '../../common/decorators/api-auth.decorator.js';

/** Nombres de las cookies de sesion, centralizados para no desincronizarlos. */
const ACCESS_COOKIE = 'accessToken';
const REFRESH_COOKIE = 'refresh_token';
/**
 * Path de la cookie de refresh. Incluye el prefijo global `api` (main.ts): con
 * solo `/auth` el navegador nunca la enviaria a `/api/auth/refresh`.
 */
const REFRESH_COOKIE_PATH = '/api/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Obtiene un CAPTCHA para el registro.
   * Publico porque se necesita antes de registrarse.
   */
  @Public()
  @ApiOperation({
    summary: 'Obtener un CAPTCHA',
    description: 'HU-006. Público. Se necesita antes de registrarse.',
  })
  @ApiOkResponse({ description: '`{ token, question }`. La respuesta no se expone.' })
  @Get('captcha')
  async getCaptcha(): Promise<CaptchaChallenge> {
    return this.authService.getCaptcha();
  }

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
  @ApiOperation({
    summary: 'Registrar un usuario',
    description:
      'HU-006. Público. Exige la respuesta del CAPTCHA. Crea el usuario y su membresía Activa (RN-022: contraseña de al menos 10 caracteres con complejidad) y envía el correo de activación. Fuera de producción devuelve también `activationToken`.',
  })
  @ApiCreatedResponse({
    description: '`{ user, membership: { code, status }, activationToken? }`.',
  })
  @ApiBadRequestResponse({
    description:
      'CAPTCHA requerido o incorrecto, o datos inválidos (contraseña, correos o contraseñas que no coinciden, consentimientos).',
  })
  @ApiConflictResponse({ description: 'El correo o el documento ya están registrados.' })
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<{
    user: AuthUser;
    membership: { code: string; status: MembershipStatus };
    activationToken?: string;
  }> {
    return this.authService.register(dto);
  }

  /**
   * Confirmacion de cuenta. Es publica porque el usuario aun no tiene sesion:
   * literalmente no puede autenticarse para activar su propia cuenta.
   * `verify-email` es la ruta del backlog (HU-006); `activate` se conserva como alias.
   */
  @Public()
  @ApiOperation({
    summary: 'Activar la cuenta (o confirmar un correo nuevo)',
    description:
      'HU-006 / RN-034. Público. `verify-email` es la ruta del backlog y `activate` es un alias con el mismo comportamiento. El token es de un solo uso.',
  })
  @ApiOkResponse({ description: '`{ user }` con la cuenta activa.' })
  @ApiBadRequestResponse({ description: 'Token inválido o expirado.' })
  @ApiConflictResponse({ description: 'El correo nuevo ya lo tomó otro usuario.' })
  @Post(['verify-email', 'activate'])
  @HttpCode(HttpStatus.OK)
  async activate(@Body() dto: ActivateAccountDto): Promise<{ user: AuthUser }> {
    const user = await this.authService.activate(dto.token);
    return { user };
  }

  @Public()
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'HU-007. Público. Una sola sesión viva por usuario: cada login revoca las anteriores (RN-030). Bloqueo de 15 minutos tras 5 intentos fallidos. Emite las cookies httpOnly `accessToken` (path `/`) y `refresh_token` (path `/api/auth`).',
  })
  @ApiOkResponse({
    description:
      'Access token y refresh token, con `user`, `membership` y `benefits`. Además se emiten las cookies de sesión.',
  })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Correo o contraseña incorrectos.' })
  @ApiForbiddenResponse({ description: 'Cuenta bloqueada temporalmente o no activada.' })
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

  /** Publico: quien olvido su contrasena no tiene sesion. Responde siempre igual (200). */
  @Public()
  @ApiOperation({
    summary: 'Solicitar el restablecimiento de contraseña',
    description:
      'HU-007. Público. Responde siempre 200 con el mismo mensaje, exista o no el correo.',
  })
  @ApiOkResponse({ description: '`{ message }`.' })
  @ApiBadRequestResponse({ description: 'Correo con formato inválido.' })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  /** Publico: la autorizacion es el token de un solo uso recibido por correo. */
  @Public()
  @ApiOperation({
    summary: 'Restablecer la contraseña',
    description:
      'HU-007. Público. El token llega por correo y es de un solo uso. Revoca todas las sesiones del usuario.',
  })
  @ApiOkResponse({ description: '`{ message }`.' })
  @ApiBadRequestResponse({
    description:
      'Token inválido o expirado, contraseñas que no coinciden o contraseña que no cumple la política.',
  })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto, this.contextFrom(request));
  }

  /**
   * El refresh es publico a proposito: cuando se le llama, el access token ya
   * expiro y el guard lo rechazaria. La seguridad no esta en "estar
   * autenticado" sino en que el refresh token sea valido, no este revocado y
   * no se haya reutilizado.
   */
  @Public()
  @ApiOperation({
    summary: 'Renovar los tokens',
    description:
      'HU-007. Público a propósito: el access token ya expiró. Lee `refreshToken` del cuerpo o de la cookie `refresh_token`. Rota el refresh token; reutilizar uno revocado cierra todas las sesiones. Emite las cookies httpOnly `accessToken` (path `/`) y `refresh_token` (path `/api/auth`).',
  })
  @ApiOkResponse({ description: 'Nuevo par de tokens. Además se renuevan las cookies de sesión.' })
  @ApiUnauthorizedResponse({ description: 'Refresh token ausente, inválido, revocado o expirado.' })
  @ApiBody({ type: RefreshTokenDto, required: false })
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

    const result = await this.authService.refresh(refreshToken, this.contextFrom(request));
    this.setAuthCookies(response, result);
    return result;
  }

  @Public()
  @ApiOperation({
    summary: 'Cerrar la sesión actual',
    description:
      'HU-007. Público. Lee `refreshToken` del cuerpo o de la cookie `refresh_token`; sin token también responde 204. Borra las cookies `accessToken` y `refresh_token`.',
  })
  @ApiNoContentResponse({ description: 'Sesión cerrada, sin cuerpo.' })
  @ApiBody({ type: RefreshTokenDto, required: false })
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
  @ApiAuth()
  @ApiOperation({
    summary: 'Cerrar todas las sesiones',
    description:
      'HU-007. Revoca todas las sesiones del usuario autenticado y borra las cookies `accessToken` y `refresh_token`.',
  })
  @ApiNoContentResponse({ description: 'Sesiones cerradas, sin cuerpo.' })
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
  @ApiAuth()
  @ApiOperation({
    summary: 'Identidad del usuario autenticado',
    description: 'Devuelve lo que afirma el access token.',
  })
  @ApiOkResponse({ description: '`{ id, email, role }`.' })
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

    // El refresh se limita a /api/auth: es la unica ruta que lo necesita. Asi, si
    // el servidor llegara a emitirlo en otra respuesta, el navegador no lo
    // adjuntaria a las peticiones normales de la API.
    response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
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
      path: REFRESH_COOKIE_PATH,
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
