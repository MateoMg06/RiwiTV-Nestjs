import { UserRole } from '../../../common/enums/domain.enums.js';

/**
 * Respuesta de login / refresh.
 *
 * `user` NO incluye el hash de la contrasena: la entidad lo declara con
 * `select: false`, pero ademas se serializa aqui de forma explicita. Dos
 * barreras en vez de una, porque exponer un hash por error es una filtracion
 * que obliga a rotar todas las contrasenas.
 */
export interface AuthUser {
  id: number;
  name: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  /** Segundos de vida del access token. El frontend lo usa para renovar antes de que expire. */
  expiresIn: number;
  user: AuthUser;
}
