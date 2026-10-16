import { MembershipLevel } from '../../common/enums/domain.enums.js';

/** Descuento (%) por nivel de membresía (RN-032). Única fuente de verdad. */
export const DISCOUNT_BY_LEVEL: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONCE]: 0,
  [MembershipLevel.PLATA]: 5,
  [MembershipLevel.ORO]: 10,
  [MembershipLevel.PLATINO]: 15,
};

export type Benefit = { type: 'DISCOUNT'; percent: number };

export const discountFor = (level: MembershipLevel): number => DISCOUNT_BY_LEVEL[level];

/** Beneficios activos de un nivel: hoy solo el descuento (vacío en BRONCE). */
export function benefitsFor(level: MembershipLevel): Benefit[] {
  const percent = discountFor(level);
  return percent > 0 ? [{ type: 'DISCOUNT', percent }] : [];
}
