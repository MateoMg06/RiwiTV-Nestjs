// src/modules/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface.js';
import type { AuthPayload } from '../interfaces/auth-payload.interface.js';

export const CurrentUser = createParamDecorator(
  (field: keyof AuthPayload | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
    return field ? user?.[field] : user;
  },
);