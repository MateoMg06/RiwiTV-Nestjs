import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Jwt } from '../utils/jwt.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { ConfigService } from '../../config/config.service.js';
import { Config } from '../../config/config.keys.js';
import type { AuthPayload } from '../../modules/auth/interfaces/auth-payload.interface.js';
import type { AuthenticatedRequest } from '../../modules/auth/interfaces/authenticated-request.interface.js';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly jwt: Jwt,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    const payload = this.verify(token);

    request.user = payload;

    this.assertRoles(context, payload);

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }

  private verify(token: string): AuthPayload {
    const secret = this.configService.get(Config.JWT_SECRET);

    if (!secret) {
      // Falla ruidosamente: es un error de configuracion, no del cliente.
      this.logger.error(
        'JWT_SECRET no configurado. No se puede validar el token de acceso.',
      );
      throw new UnauthorizedException('Error de configuracion de autenticacion');
    }

    let decoded: unknown;

    try {
      decoded = this.jwt.verifyToken(token, secret);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'token invalido';
      this.logger.debug(`Token rechazado: ${reason}`);
      // Mensaje generico a proposito: no revela si fallo la firma o expiro.
      throw new UnauthorizedException('Token invalido o expirado');
    }

    if (typeof decoded === 'string' || decoded === null) {
      throw new UnauthorizedException('Token invalido o expirado');
    }

    const payload = decoded as AuthPayload;

    if (!payload.sub && payload.id === undefined) {
      this.logger.warn('Token valido pero sin identidad (sub/id ausentes)');
      throw new UnauthorizedException('Token invalido o expirado');
    }

    return payload;
  }

  private assertRoles(context: ExecutionContext, payload: AuthPayload): void {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return;
    }

    if (!payload.role || !requiredRoles.includes(payload.role)) {
      throw new ForbiddenException('No tienes permisos para acceder a este recurso');
    }
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const authHeader = request.headers?.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        return token;
      }
    }

    const cookieToken = request.cookies?.['accessToken'];

    return typeof cookieToken === 'string' && cookieToken ? cookieToken : undefined;
  }
}
