import type { Benefit } from '../../membership/membership-benefits.js';
import { MembershipLevel, MembershipStatus, UserRole } from '../../../common/enums/domain.enums.js';

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

/**
 * Respuesta de login (HU-007): ademas de los tokens, la membresía y los beneficios activos.
 * `benefits` sale del nivel de la membresía (`[]` si no tiene).
 */
export interface LoginResponse extends AuthResponse {
  membership: { code: string; status: MembershipStatus; level: MembershipLevel } | null;
  benefits: Benefit[];
}
