import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class Jwt {
  createToken(payload: JwtPayload, jwtSecret: string, options: SignOptions): string {
    return jwt.sign(payload, jwtSecret, { ...options, jwtid: randomUUID() });
  }

  verifyToken(refreshToken: string, jwtRefresh: string): string | JwtPayload {
    return jwt.verify(refreshToken, jwtRefresh);
  }
}