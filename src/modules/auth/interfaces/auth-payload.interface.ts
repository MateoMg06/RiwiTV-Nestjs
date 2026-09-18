import type { JwtPayload } from 'jsonwebtoken';

export type AuthPayload = JwtPayload & {
  role: string;
  id: number;
  name: string;
  membership: string;
  cityId?: number | null;
  email?: string;
};