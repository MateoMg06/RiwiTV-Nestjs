import { createHash } from 'crypto';

/** Vigencia del token de activación / verificación de correo (24 h). */
export const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * SHA-256 del token, no bcrypt.
 *
 * bcrypt es lento a propósito para CONTRASEÑAS, porque el atacante elige el valor que adivina.
 * Aquí el valor lo genera el servidor con alta entropía: no hay diccionario que atacar.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
