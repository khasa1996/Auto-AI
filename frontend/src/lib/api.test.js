import { formatINR } from './api';

describe('formatINR', () => {
  it('returns "-" for null or undefined', () => {
    expect(formatINR(null)).toBe("-");
    expect(formatINR(undefined)).toBe("-");
  });

  it('formats numbers less than 1 Lakh normally with Indian comma separation', () => {
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(500)).toBe("₹500");
    expect(formatINR(99999)).toBe("₹99,999");
  });

  it('formats numbers between 1 Lakh and 1 Crore in Lakhs (L)', () => {
    expect(formatINR(100000)).toBe("₹1.00 L");
    expect(formatINR(150000)).toBe("₹1.50 L");
    expect(formatINR(2500000)).toBe("₹25.00 L");
  });

  it('formats numbers 1 Crore and above in Crores (Cr)', () => {
    expect(formatINR(10000000)).toBe("₹1.00 Cr");
    expect(formatINR(15500000)).toBe("₹1.55 Cr");
    expect(formatINR(100000000)).toBe("₹10.00 Cr");
  });
});
