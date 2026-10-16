/**
 * Enums del dominio, centralizados para que el DTO, la entidad y la migracion
 * compartan exactamente las mismas cadenas. Si un valor cambia aqui, el cambio
 * se propaga a las tres capas.
 */

export enum UserRole {
  ADMIN = 'admin',
  USUARIO = 'usuario',
}

export enum Membership {
  BASICA = 'básica',
  PLATA = 'plata',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

/** Formato de exhibicion de una funcion. */
export enum ShowFormat {
  DOS_D = '2D',
  TRES_D = '3D',
  IMAX = 'IMAX',
  VIP = 'VIP',
}

/** Estado de la membresía digital (HU-006). Nace `ACTIVE` al registrarse. */
export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
}

/** Estado de una funcion. Solo `CANCELLED` se oculta de la cartelera. */
export enum ShowtimeStatus {
  ACTIVE = 'ACTIVE',
  SOLD_OUT = 'SOLD_OUT',
  CANCELLED = 'CANCELLED',
}

/** Estado de una pelicula en el catalogo. */
export enum MovieStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

/** Estado de una solicitud de aviso de estreno. `SENT` se añadirá con el envío del correo (RN-020). */
export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
}

/** Audio de una funcion. */
export enum AudioType {
  DUBBED = 'DUBBED',
  SUBTITLED = 'SUBTITLED',
  ORIGINAL = 'ORIGINAL',
}

/** Clasificacion por edad. Determina si una funcion es apta para menores. */
export enum AgeRating {
  TODOS = 'todos',
  DOCE = '12+',
  DIECISEIS = '16+',
  DIECIOCHO = '18+',
}

/** Tipo de butaca. Determina el recargo de precio, nunca el precio base. */
export enum SeatType {
  ESTANDAR = 'estandar',
  VIP = 'vip',
  ACCESIBLE = 'accesible',
  PAREJA = 'pareja',
}

/** Ciclo de vida de un ticket. */
export enum TicketStatus {
  PENDIENTE = 'pendiente',
  PAGADO = 'pagado',
  USADO = 'usado',
  REEMBOLSADO = 'reembolsado',
  CANCELADO = 'cancelado',
}

/** Metodos de pago soportados por el cine. */
export enum PaymentMethod {
  TARJETA = 'tarjeta',
  PSE = 'pse',
  EFECTIVO = 'efectivo',
  TRANSFERENCIA = 'transferencia',
}

/** Estados del proceso de pago. */
export enum PaymentStatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
  REEMBOLSADO = 'reembolsado',
}

/**
 * Estados de una reserva. `EXPIRADA` la asigna el sistema cuando expira el
 * TTL; nunca la escribe el cliente.
 */
export enum ReservationStatus {
  ACTIVA = 'activa',
  CONVERTIDA = 'convertida',
  EXPIRADA = 'expirada',
  CANCELADA = 'cancelada',
}

/** Devuelve el arreglo de valores, util para validaciones @IsIn y migraciones. */
export const enumValues = <T extends Record<string, string>>(e: T): Array<T[keyof T]> =>
  Object.values(e) as Array<T[keyof T]>;
