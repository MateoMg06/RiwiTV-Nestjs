import type { Request } from 'express';
import { AuthPayload } from './auth-payload.interface.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

/*
Uso en guards
const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
req.user = await this.jwtService.verifyAsync<AuthPayload>(token)
*/
