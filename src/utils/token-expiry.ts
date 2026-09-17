import { Injectable } from "@nestjs/common";

/**
 * Convierte una cadena de expiración de JWT (ej. "15m", "7d", "1h") a milisegundos.
 * Si no se puede parsear, devuelve el valor por defecto.
 */
@Injectable()
export class TokenExpiry{
  parseExpiryToMs(expiry: string, defaultMs: number): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return defaultMs;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return defaultMs;
    }
  }

  /**
   * Calcula la fecha de expiración a partir de una cadena de expiración de JWT.
   */
  calculateExpiryDate(expiry: string, defaultMs: number): Date {
    const ms = this.parseExpiryToMs(expiry, defaultMs);
    const date = new Date();
    date.setTime(date.getTime() + ms);
    return date;
  }
}