import { Injectable } from '@nestjs/common';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Session } from './entities/session.entity.js';

@Injectable()
export class AuthDao {
  constructor(private readonly dataSource: DataSource) {}

  private get sessionRepo(): Repository<Session> {
    return this.dataSource.getRepository(Session);
  }

  createSession(session: Partial<Session>): Promise<Session> {
    return this.sessionRepo.save(this.sessionRepo.create(session));
  }

  /** Busca la sesion por el hash del refresh token. */
  findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return this.sessionRepo.findOne({ where: { refreshTokenHash: hash } });
  }

  findActiveSessions(userId: number): Promise<Session[]> {
    return this.sessionRepo.find({ where: { userId, revokedAt: undefined } });
  }

  async revokeSession(id: number): Promise<void> {
    await this.sessionRepo.update(id, { revokedAt: new Date() });
  }

  /** "Cerrar sesion en todos los dispositivos". */
  async revokeAllSessions(userId: number): Promise<void> {
    await this.sessionRepo.update(
      { userId, revokedAt: undefined },
      { revokedAt: new Date() },
    );
  }

  async touchSession(id: number): Promise<void> {
    await this.sessionRepo.update(id, { lastUsedAt: new Date() });
  }

  /** Limpieza periodica: sesiones revocadas o vencidas hace mucho. */
  async purgeExpired(before: Date): Promise<number> {
    const result = await this.sessionRepo.delete({
      expiresAt: LessThan(before),
    });
    return result.affected ?? 0;
  }
}
