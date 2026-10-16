import type { JwtPayload } from 'jsonwebtoken';

/** Claims del access token: los que emite `AuthService.issueTokens` (`sub`, `id`, `email`, `role`). */
export type AuthPayload = JwtPayload & {
  role: string;
  id: number;
  email?: string;
};
