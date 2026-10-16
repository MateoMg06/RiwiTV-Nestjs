import { MembershipLevel } from '../../common/enums/domain.enums.js';
import { DISCOUNT_BY_LEVEL, benefitsFor, discountFor } from './membership-benefits.js';

describe('membership-benefits', () => {
  it('descuentos por nivel (RN-032)', () => {
    expect(DISCOUNT_BY_LEVEL).toEqual({ BRONCE: 0, PLATA: 5, ORO: 10, PLATINO: 15 });
    expect(discountFor(MembershipLevel.ORO)).toBe(10);
  });

  it('BRONCE no tiene beneficios', () => {
    expect(benefitsFor(MembershipLevel.BRONCE)).toEqual([]);
  });

  it.each([
    [MembershipLevel.PLATA, 5],
    [MembershipLevel.ORO, 10],
    [MembershipLevel.PLATINO, 15],
  ])('%s devuelve su descuento', (level, percent) => {
    expect(benefitsFor(level)).toEqual([{ type: 'DISCOUNT', percent }]);
  });
});
