import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IsNull, type DataSource, type Repository } from 'typeorm';
import { AuthDao } from './auth.dao.js';
import type { Session } from './entities/session.entity.js';

/**
 * Tests del DAO de sesiones.
 *
 * El DAO es donde vive una parte ESCONDIDA de la seguridad: que condiciones
 * llevan las consultas. "No revocada" se expresa con `revokedAt: IsNull()`:
 * un `undefined` dentro de `where` se descartaria silenciosamente del WHERE y
 * la consulta incluiria tambien las sesiones revocadas.
 */

const buildSession = (overrides: Partial<Session> = {}): Session =>
  ({
    id: 10,
    userId: 1,
    refreshTokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    lastUsedAt: null,
    userAgent: null,
    ip: null,
    ...overrides,
  }) as Session;

describe('AuthDao', () => {
  let repository: Repository<Session>;
  let dataSource: DataSource;
  let dao: AuthDao;

  beforeEach(() => {
    repository = {
      create: vi.fn((data: Partial<Session>) => data as Session),
      save: vi.fn(async (entity: Session) => ({ ...entity, id: 10 })),
      find: vi.fn(),
      findOne: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as Repository<Session>;

    dataSource = {
      getRepository: vi.fn(() => repository),
    } as unknown as DataSource;

    dao = new AuthDao(dataSource);
  });

  describe('createSession', () => {
    it('crea y persiste la entidad', async () => {
      const payload: Partial<Session> = {
        userId: 1,
        refreshTokenHash: 'hash',
        expiresAt: new Date(Date.now() + 1000),
        revokedAt: null,
      };

      const saved = await dao.createSession(payload);

      expect(repository.create).toHaveBeenCalledWith(payload);
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(saved).toMatchObject({ userId: 1, refreshTokenHash: 'hash' });
    });

    it('resuelve el repositorio de Session en cada llamada', async () => {
      await dao.createSession({ userId: 1 });

      // El getter no se cachea a proposito: evita retener un repositorio
      // obsoleto cuando el DataSource se reconecta.
      expect(dataSource.getRepository).toHaveBeenCalledWith(
        expect.any(Function) as unknown as Session,
      );
    });
  });

  describe('findByRefreshTokenHash', () => {
    it('busca por el hash, nunca por el token en claro', async () => {
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(buildSession());

      await dao.findByRefreshTokenHash('sha256-del-token');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { refreshTokenHash: 'sha256-del-token' },
      });
    });

    it('devuelve null cuando no hay sesion con ese hash', async () => {
      (repository.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(dao.findByRefreshTokenHash('nada')).resolves.toBeNull();
    });
  });

  describe('findActiveSessions', () => {
    it('filtra por usuario', async () => {
      (repository.find as ReturnType<typeof vi.fn>).mockResolvedValue([buildSession()]);

      const result = await dao.findActiveSessions(1);

      expect(repository.find).toHaveBeenCalledWith({
        where: { userId: 1, revokedAt: IsNull() },
      });
      expect(result).toHaveLength(1);
    });

    it('filtra las revocadas en la base de datos con IsNull(), no con undefined', async () => {
      await dao.findActiveSessions(1);

      const [{ where }] = (repository.find as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(where.revokedAt).toEqual(IsNull());
      expect(where.revokedAt).not.toBeUndefined();
    });
  });

  describe('revokeSession', () => {
    it('marca la fila con la fecha de revocacion sin tocar el resto', async () => {
      await dao.revokeSession(10);

      expect(repository.update).toHaveBeenCalledWith(10, {
        revokedAt: expect.any(Date),
      });
    });
  });

  describe('revokeAllSessions', () => {
    it('revoca todas las filas del usuario', async () => {
      await dao.revokeAllSessions(1);

      expect(repository.update).toHaveBeenCalledWith(
        { userId: 1, revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );
    });

    it('no reescribe la fecha de las sesiones ya revocadas', async () => {
      await dao.revokeAllSessions(1);

      const criteria = (repository.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(criteria.revokedAt).toEqual(IsNull());
    });
  });

  describe('touchSession', () => {
    it('actualiza `lastUsedAt` sin revocar', async () => {
      await dao.touchSession(10);

      const [, patch] = (repository.update as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(patch.lastUsedAt).toBeInstanceOf(Date);
      expect(patch).not.toHaveProperty('revokedAt');
    });
  });

  describe('purgeExpired', () => {
    it('borra las sesiones vencidas antes del corte y devuelve cuantas eran', async () => {
      (repository.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ affected: 7 });
      const before = new Date('2026-01-01T00:00:00.000Z');

      const purged = await dao.purgeExpired(before);

      expect(purged).toBe(7);
      const criteria = (repository.delete as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(criteria.expiresAt.type).toBe('lessThan');
      expect(criteria.expiresAt.value).toBe(before);
    });

    it('devuelve 0 y no falla cuando el driver no reporta `affected`', async () => {
      (repository.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ affected: undefined });

      // `?? 0` evita un NaN silencioso en el log del job de limpieza.
      await expect(dao.purgeExpired(new Date())).resolves.toBe(0);
    });
  });
});