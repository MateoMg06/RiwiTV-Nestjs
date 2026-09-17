import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';

export function createToken(payload: JwtPayload, jwtSecret: string, options: SignOptions): string {
  return jwt.sign(payload, jwtSecret, { ...options, jwtid: randomUUID() });
}

export function verifyToken(refreshToken: string, jwtRefresh: string): string | JwtPayload {
  return jwt.verify(refreshToken, jwtRefresh);
}
