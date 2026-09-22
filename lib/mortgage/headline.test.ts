import { describe, expect, it } from 'vitest';
import { headline, payment, refinanceSavings, type RefinanceAssumptions } from '.';

const A: RefinanceAssumptions = {
  benchmarkRate: 0.04,
  marketFixedRate: 0.045,
  bandBase: 0.006,
  bandNarrowKnown: 0.0015,
  bandNarrowUnknown: 0.0005,
  bandMin: 0.0015,
  fixedShareIfYes: [0.2, 0.5],
  fixedShareIfUnknown: [0, 0.5],
  fixedRateByBucket: { before2015: [0.04, 0.06], '2015to2019': [0.025, 0.04], '2020to2022': [0.02, 0.035], since2023: [0.045, 0.06] },
  fixedRateMaxAboveBlended: 0.015,
  yearsElapsedByBucket: { before2015: [12, 21], '2015to2019': [7, 11], '2020to2022': [4, 6], since2023: [0, 3] },
  switchingCosts: [2000, 6000],
  meaningfulTotal: 10_000,
  meaningfulMonthly: 100,
  accuracy: { base: 55, perKnown: 15, perUnknown: 5 },
  fee: { operationalFee: 60, timeDiscounts: [{ minYears: 0, discount: 0 }, { minYears: 1, discount: 0.2 }, { minYears: 3, discount: 0.3 }], noticeDiscount: 0.1 },
};

describe('fee cap', () => {
  it('caps a fixed track contract rate by the blended rate', () => {
    const input = { balance: 800_000, monthlyPayment: 4_500, months: 240, taken: 'before2015' as const, hasFixed: 'yes' as const };
    const capped = refinanceSavings(input, A);
    const loose = refinanceSavings(input, { ...A, fixedRateMaxAboveBlended: 1 });
    if (!capped.ok || !loose.ok) throw new Error('expected ok');
    expect(capped.fee.high).toBeLessThan(loose.fee.high);
  });
});

describe('headline', () => {
  it('range for clear savings, rounded down to ₪1,000', () => {
    const r = refinanceSavings({ balance: 1_000_000, monthlyPayment: payment(1_000_000, 0.065, 240), months: 240 }, A);
    if (!r.ok) throw new Error('expected ok');
    const h = headline(r);
    expect(h.kind).toBe('range');
    if (h.kind !== 'range') return;
    expect(h.low % 1000).toBe(0);
    expect(h.high % 1000).toBe(0);
    expect(h.low).toBeLessThan(h.high);
    expect(h.high).toBeLessThanOrEqual(r.netTotal.high);
    expect(h.monthlyHigh % 10).toBe(0);
  });
  it('"up to" when the low end is not a real saving', () => {
    const r = refinanceSavings({ balance: 1_000_000, monthlyPayment: payment(1_000_000, 0.043, 240), months: 240 }, A);
    if (!r.ok) throw new Error('expected ok');
    expect(r.verdict).toBe('maybe');
    expect(headline(r).kind).toBe('upTo');
  });
  it('none when there is no meaningful saving', () => {
    const r = refinanceSavings({ balance: 800_000, monthlyPayment: 4_500, months: 240 }, A);
    if (!r.ok) throw new Error('expected ok');
    expect(headline(r)).toEqual({ kind: 'none' });
  });
});
