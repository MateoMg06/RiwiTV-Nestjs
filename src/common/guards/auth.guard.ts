import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Jwt } from '../utils/jwt.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthPayload } from '../../modules/auth/interfaces/auth-payload.interface.js';
import type { AuthenticatedRequest } from '../../modules/auth/interfaces/authenticated-request.interface.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: Jwt,
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token no proporcionado');
    }

    try {
      const payload = this.jwt.verifyToken(token, process.env.JWT_SECRET!) as AuthPayload;
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Check roles if required
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = request.user?.role;
      if (!userRole || !requiredRoles.includes(userRole)) {
        throw new ForbiddenException('No tienes permisos para acceder a este recurso');
      }
    }

    return true;
  }

  private extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    // Try to get token from Authorization header
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from cookies
    const cookies = request.headers?.cookie;
    if (cookies) {
      const tokenCookie = cookies
        .split(';')
        .map((c: string) => c.trim())
        .find((c: string) => c.startsWith('access_token='));
      if (tokenCookie) {
        return tokenCookie.substring('access_token='.length);
      }
    }

    return undefined;
  }
}