import { describe, expect, it } from 'vitest';
import {
  affordability,
  balanceAfter,
  capitalizationDifference,
  equalPrincipalSchedule,
  estimateFixedTrackFee,
  monthsToRepay,
  payment,
  principalFor,
  purchaseTax,
  refinanceSavings,
  solveAnnualRate,
  spitzerSchedule,
  timeDiscountFor,
  yearly,
  type RefinanceAssumptions,
} from '.';

describe('payment (Spitzer)', () => {
  it('matches a known annuity value', () => {
    // 1,000,000 over 25y at 5%: standard mortgage table value ≈ 5,845.90
    expect(payment(1_000_000, 0.05, 300)).toBeCloseTo(5845.9, 1);
  });
  it('handles the zero-rate limit', () => {
    expect(payment(120_000, 0, 120)).toBe(1000);
    expect(payment(120_000, 1e-15, 120)).toBeCloseTo(1000, 6);
  });
  it('one month means principal plus one month of interest', () => {
    expect(payment(100_000, 0.12, 1)).toBeCloseTo(101_000, 6);
  });
  it('principalFor is the inverse of payment', () => {
    const p = payment(750_000, 0.043, 264);
    expect(principalFor(p, 0.043, 264)).toBeCloseTo(750_000, 4);
  });
  it('rejects non-integer months', () => {
    expect(() => payment(1, 0.05, 0)).toThrow(RangeError);
    expect(() => payment(1, 0.05, 12.5)).toThrow(RangeError);
  });
  it('balanceAfter reaches zero and is consistent with the schedule', () => {
    const s = spitzerSchedule(500_000, 0.04, 240);
    expect(balanceAfter(500_000, 0.04, 240, 60)).toBeCloseTo(s.rows[59]!.balance, 4);
    expect(balanceAfter(500_000, 0.04, 240, 240)).toBe(0);
  });
});

describe('solveAnnualRate', () => {
  const grid = [
    [100_000, 0.001, 12],
    [800_000, 0.031, 240],
    [800_000, 0.045, 240],
    [3_000_000, 0.06, 360],
    [250_000, 0.12, 60],
    [1_500_000, 0.0001, 300],
    [400_000, 0.2, 360],
  ] as const;
  it.each(grid)('round-trips B=%d r=%d n=%d', (B, r, n) => {
    const res = solveAnnualRate(B, payment(B, r, n), n);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.annualRate).toBeCloseTo(r, 7);
      expect(res.iterations).toBeLessThan(60);
    }
  });
  it('solves n = 1', () => {
    const res = solveAnnualRate(100_000, 100_500, 1);
    expect(res.ok && res.annualRate).toBeCloseTo(0.06, 9);
  });
  it('flags a payment too low for any positive rate', () => {
    expect(solveAnnualRate(800_000, 3_000, 240)).toEqual({ ok: false, reason: 'payment_too_low' });
    expect(solveAnnualRate(120_000, 1_000, 120)).toEqual({ ok: false, reason: 'payment_too_low' });
  });
  it('flags an implausibly high implied rate', () => {
    expect(solveAnnualRate(100_000, 50_000, 240)).toEqual({ ok: false, reason: 'payment_too_high' });
  });
  it('rejects invalid input without throwing', () => {
    expect(solveAnnualRate(0, 1000, 12).ok).toBe(false);
    expect(solveAnnualRate(1000, -1, 12).ok).toBe(false);
    expect(solveAnnualRate(1000, 100, 0).ok).toBe(false);
    expect(solveAnnualRate(NaN, 100, 12).ok).toBe(false);
  });
  it('default inputs imply about 3.1%', () => {
    const res = solveAnnualRate(800_000, 4_500, 240);
    expect(res.ok && res.annualRate).toBeGreaterThan(0.03);
    expect(res.ok && res.annualRate).toBeLessThan(0.033);
  });
});

describe('monthsToRepay', () => {
  it('inverts payment', () => {
    const p = payment(600_000, 0.045, 200);
    expect(monthsToRepay(600_000, 0.045, p)).toBe(200);
  });
  it('is infinite when payment does not cover interest', () => {
    expect(monthsToRepay(1_000_000, 0.06, 5_000)).toBe(Infinity);
  });
  it('zero rate', () => {
    expect(monthsToRepay(10_000, 0, 1_000)).toBe(10);
  });
});

describe('schedules', () => {
  it('Spitzer: constant payment, balance hits 0, principal sums to loan', () => {
    const s = spitzerSchedule(800_000, 0.045, 240);
    expect(s.rows).toHaveLength(240);
    expect(s.rows.at(-1)!.balance).toBe(0);
    expect(s.rows.reduce((a, r) => a + r.principal, 0)).toBeCloseTo(800_000, 4);
    expect(s.firstPayment).toBeCloseTo(s.lastPayment, 4);
    expect(s.totalPaid).toBeCloseTo(s.totalInterest + 800_000, 4);
  });
  it('equal principal: falling payments, less interest than Spitzer', () => {
    const e = equalPrincipalSchedule(800_000, 0.045, 240);
    const s = spitzerSchedule(800_000, 0.045, 240);
    expect(e.firstPayment).toBeGreaterThan(s.firstPayment);
    expect(e.lastPayment).toBeLessThan(s.lastPayment);
    expect(e.totalInterest).toBeLessThan(s.totalInterest);
    // Closed form: interest = B·i·(n+1)/2
    expect(e.totalInterest).toBeCloseTo((800_000 * 0.045 / 12) * 241 / 2, 4);
    expect(e.rows.at(-1)!.balance).toBe(0);
  });
  it('yearly rollup sums months', () => {
    const s = spitzerSchedule(100_000, 0.05, 30);
    const y = yearly(s);
    expect(y).toHaveLength(3);
    expect(y.reduce((a, r) => a + r.payment, 0)).toBeCloseTo(s.totalPaid, 6);
    expect(y.at(-1)!.balance).toBe(0);
  });
});

describe('prepayment fee (simplified estimate)', () => {
  const params = { operationalFee: 60, timeDiscounts: [{ minYears: 0, discount: 0 }, { minYears: 1, discount: 0.2 }, { minYears: 3, discount: 0.3 }], noticeDiscount: 0.1 };
  it('no capitalization fee when market rate ≥ contract rate', () => {
    expect(capitalizationDifference({ balance: 500_000, contractRate: 0.03, marketRate: 0.05, monthsRemaining: 200 })).toBe(0);
    expect(estimateFixedTrackFee({ balance: 500_000, contractRate: 0.03, marketRate: 0.05, monthsRemaining: 200, yearsElapsed: 5 }, params).total).toBe(60);
  });
  it('positive when market rate is below contract rate, and equals PV difference', () => {
    const t = { balance: 400_000, contractRate: 0.06, marketRate: 0.04, monthsRemaining: 180 };
    const cap = capitalizationDifference(t);
    const pv = principalFor(payment(400_000, 0.06, 180), 0.04, 180);
    expect(cap).toBeCloseTo(pv - 400_000, 6);
    expect(cap).toBeGreaterThan(0);
  });
  it('applies time and notice discounts in order', () => {
    const t = { balance: 400_000, contractRate: 0.06, marketRate: 0.04, monthsRemaining: 180, yearsElapsed: 4, gaveNotice: true };
    const f = estimateFixedTrackFee(t, params);
    expect(f.total).toBeCloseTo(f.capitalization * 0.7 * 0.9 + 60, 6);
    expect(f.capitalization - f.timeDiscount - f.noticeDiscount + f.operational).toBeCloseTo(f.total, 6);
  });
  it('time discount lookup picks the highest threshold reached', () => {
    expect(timeDiscountFor(0.5, params.timeDiscounts)).toBe(0);
    expect(timeDiscountFor(1, params.timeDiscounts)).toBe(0.2);
    expect(timeDiscountFor(10, params.timeDiscounts)).toBe(0.3);
  });
});

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

describe('refinanceSavings', () => {
  it('finds a savings range for an expensive loan', () => {
    // ~6% loan vs 4% benchmark
    const P = payment(1_000_000, 0.06, 240);
    const r = refinanceSavings({ balance: 1_000_000, monthlyPayment: P, months: 240 }, A);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.currentRate).toBeCloseTo(0.06, 6);
    expect(r.verdict).toBe('savings');
    expect(r.netTotal.low).toBeLessThan(r.netTotal.high);
    expect(r.monthlySaving.low).toBeGreaterThan(0);
    expect(r.newPayment.low).toBeLessThan(r.newPayment.high);
    // net = gross − fee − switching
    expect(r.netTotal.low).toBeCloseTo(r.grossTotal.low - r.fee.high - 6000, 6);
    expect(r.netTotal.high).toBeCloseTo(r.grossTotal.high - r.fee.low - 2000, 6);
  });
  it('is honest when the loan is already cheap', () => {
    const r = refinanceSavings({ balance: 800_000, monthlyPayment: 4_500, months: 240 }, A);
    expect(r.ok && r.verdict).toBe('none');
  });
  it('answers narrow the range and raise accuracy', () => {
    const base = { balance: 1_000_000, monthlyPayment: payment(1_000_000, 0.055, 240), months: 240 };
    const r0 = refinanceSavings(base, A);
    const r1 = refinanceSavings({ ...base, taken: 'since2023' }, A);
    const r3 = refinanceSavings({ ...base, taken: 'since2023', hasFixed: 'no', goal: 'lower' }, A);
    if (!r0.ok || !r1.ok || !r3.ok) throw new Error('expected ok');
    const width = (r: typeof r0) => r.netTotal.high - r.netTotal.low;
    expect(width(r1)).toBeLessThan(width(r0));
    expect(width(r3)).toBeLessThan(width(r1));
    expect(r0.accuracy).toBe(55);
    expect(r3.accuracy).toBe(100);
    expect(r3.fee).toEqual({ low: 60, high: 60 });
  });
  it('"don\'t know" narrows less than a known answer', () => {
    const base = { balance: 1_000_000, monthlyPayment: payment(1_000_000, 0.055, 240), months: 240 };
    const k = refinanceSavings({ ...base, goal: 'lower' }, A);
    const u = refinanceSavings({ ...base, goal: 'unknown' }, A);
    if (!k.ok || !u.ok) throw new Error('expected ok');
    expect(k.newRate.high - k.newRate.low).toBeLessThan(u.newRate.high - u.newRate.low);
    expect(k.accuracy).toBeGreaterThan(u.accuracy);
  });
  it('a fixed track with a high contract rate raises the fee estimate', () => {
    const base = { balance: 1_000_000, monthlyPayment: payment(1_000_000, 0.055, 240), months: 240, taken: 'before2015' as const };
    const yes = refinanceSavings({ ...base, hasFixed: 'yes' }, A);
    const no = refinanceSavings({ ...base, hasFixed: 'no' }, A);
    if (!yes.ok || !no.ok) throw new Error('expected ok');
    expect(yes.fee.high).toBeGreaterThan(no.fee.high);
  });
  it('goal shorten reports months saved', () => {
    const r = refinanceSavings({ balance: 1_000_000, monthlyPayment: payment(1_000_000, 0.06, 240), months: 240, goal: 'shorten' }, A);
    expect(r.ok && r.monthsSaved).toBeGreaterThan(0);
  });
  it('passes impossible inputs through as a reason', () => {
    expect(refinanceSavings({ balance: 800_000, monthlyPayment: 2_000, months: 240 }, A)).toEqual({ ok: false, reason: 'payment_too_low' });
  });
});

describe('affordability', () => {
  const base = { netIncome: 20_000, obligations: 0, equity: 500_000, annualRate: 0.045, months: 360, maxPaymentToIncome: 0.33, maxLtv: 0.75 };
  it('is capped by income when equity is ample', () => {
    const r = affordability({ ...base, equity: 2_000_000 });
    expect(r.binding).toBe('income');
    expect(r.loanAtMaxPrice).toBeCloseTo(r.maxLoanByIncome, 4);
    expect(r.maxPayment).toBeCloseTo(6600, 6);
  });
  it('is capped by LTV when equity is thin', () => {
    const r = affordability({ ...base, equity: 200_000 });
    expect(r.binding).toBe('equity');
    expect(r.maxPrice).toBeCloseTo(800_000, 4);
    expect(r.loanAtMaxPrice).toBeCloseTo(600_000, 4);
  });
  it('obligations reduce the payment capacity, never below zero', () => {
    expect(affordability({ ...base, obligations: 1000 }).maxPayment).toBeCloseTo(5600, 6);
    expect(affordability({ ...base, obligations: 99_999 }).maxPayment).toBe(0);
  });
});

describe('purchaseTax', () => {
  const brackets = [
    { upTo: 1_000_000, rate: 0 },
    { upTo: 2_000_000, rate: 0.05 },
    { upTo: null, rate: 0.1 },
  ];
  it('is progressive', () => {
    expect(purchaseTax(900_000, brackets).total).toBe(0);
    expect(purchaseTax(1_500_000, brackets).total).toBeCloseTo(25_000, 6);
    const r = purchaseTax(3_000_000, brackets);
    expect(r.total).toBeCloseTo(150_000, 6);
    expect(r.lines).toHaveLength(3);
    expect(r.effectiveRate).toBeCloseTo(0.05, 9);
  });
  it('handles zero and exact bracket edges', () => {
    expect(purchaseTax(0, brackets).total).toBe(0);
    expect(purchaseTax(2_000_000, brackets).total).toBeCloseTo(50_000, 6);
  });
  it('rejects malformed tables', () => {
    expect(() => purchaseTax(1, [])).toThrow();
    expect(() => purchaseTax(1, [{ upTo: 5, rate: 0 }])).toThrow();
    expect(() => purchaseTax(1, [{ upTo: 5, rate: 0 }, { upTo: 3, rate: 0 }, { upTo: null, rate: 0 }])).toThrow();
  });
});
