import { describe, expect, it } from 'vitest';
import { headline, payment, refinanceSavings, type RefinanceAssumptions, type TrackInput } from '.';

const A: RefinanceAssumptions = {
  benchmarkRate: 0.0452,
  marketFixedRate: 0.0462,
  marketMargin: { primeDiscount: 0.0067, variable: 0.0098 },
  marginTolerance: 0.0025,
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
  fee: { operationalFee: 60, timeDiscounts: [{ minYears: 0, discount: 0 }, { minYears: 3, discount: 0.2 }, { minYears: 5, discount: 0.3 }], noNoticeFeeRate: 0.001 },
};

const ok = (input: Parameters<typeof refinanceSavings>[0]) => {
  const r = refinanceSavings(input, A);
  if (!r.ok) throw new Error('expected ok');
  return r;
};
const single = (balance: number, rate: number, months: number) => ({ balance, monthlyPayment: payment(balance, rate, months), months });

describe('fee cap', () => {
  it('caps a fixed track contract rate by the blended rate', () => {
    const input = { balance: 800_000, monthlyPayment: 4_500, months: 240, taken: 'before2015' as const, hasFixed: 'yes' as const };
    const capped = ok(input);
    const loose = refinanceSavings(input, { ...A, fixedRateMaxAboveBlended: 1 });
    if (!loose.ok) throw new Error('expected ok');
    expect(capped.fee.high).toBeLessThan(loose.fee.high);
  });
});

describe('headline', () => {
  it('typical case for clear savings, rounded down to ₪1,000', () => {
    const r = ok(single(1_000_000, 0.065, 240));
    expect(r.verdict).toBe('savings');
    const h = headline(r);
    expect(h.kind).toBe('typical');
    if (h.kind !== 'typical') return;
    expect(h.mid % 1000).toBe(0);
    expect(h.mid).toBeLessThanOrEqual(r.netTotal.mid);
    expect(h.low).toBeLessThanOrEqual(h.mid);
    expect(h.mid).toBeLessThanOrEqual(h.high);
    expect(h.monthlyMid % 10).toBe(0);
  });
  it('the headline figure is the typical case, not the best case', () => {
    const r = ok(single(1_000_000, 0.065, 240));
    const h = headline(r);
    if (h.kind !== 'typical') throw new Error('expected typical');
    expect(h.mid).toBeLessThan(Math.floor(r.netTotal.high / 1000) * 1000);
  });
  it('borderline when only the best case pays off, and it carries no headline figure', () => {
    // ~4.7% vs a 4.52% benchmark: positive at the typical rate but too small to matter.
    const r = ok({ ...single(500_000, 0.047, 240), hasFixed: 'no' });
    expect(r.netTotal.mid).toBeGreaterThan(0);
    expect(r.verdict).toBe('maybe');
    expect(headline(r).kind).toBe('borderline');
  });
  it('none when the rate is already below the market, even if the best case would pay off', () => {
    // Facebook case: 930K at a blended 4.27%. The old best-case headline said "save up to ₪21,000".
    const r = ok(single(930_000, 0.0427, 300));
    expect(r.netTotal.high).toBeGreaterThan(A.meaningfulTotal);
    expect(r.netTotal.mid).toBeLessThan(0);
    expect(r.verdict).toBe('none');
    expect(headline(r)).toEqual({ kind: 'none' });
  });
});

describe('tracks and margins', () => {
  const variable = (margin: number | undefined, rate = 0.0476): TrackInput => ({ type: 'variable', balance: 727_000, rate, months: 300, margin });

  it('does not touch a variable track whose margin beats the market (Facebook case: 727K, anchor 4.56 + 0.2)', () => {
    const r = ok({ ...single(727_000, 0.0476, 300), tracks: [variable(0.002)] });
    expect(r.kept).toEqual([{ index: 0, reason: 'margin' }]);
    expect(r.verdict).toBe('none');
    expect(r.netTotal.mid).toBe(0);
    expect(r.switchingCosts.high).toBe(0);
  });
  it('without the margin the same track looks worth refinancing, which is why we ask', () => {
    const r = ok({ ...single(727_000, 0.0476, 300), tracks: [variable(undefined)] });
    expect(r.kept).toEqual([]);
    expect(r.verdict).not.toBe('none');
  });
  it('refinances a variable track whose margin is clearly above the market', () => {
    const r = ok({ ...single(727_000, 0.06, 300), tracks: [variable(0.02, 0.06)] });
    expect(r.kept).toEqual([]);
    expect(r.verdict).toBe('savings');
  });
  it('treats prime minus 0.5 as good enough to keep (market is about minus 0.67, tolerance 0.25)', () => {
    const t: TrackInput = { type: 'prime', balance: 600_000, rate: 0.0525, months: 240, margin: 0.005 };
    expect(ok({ ...single(600_000, 0.0525, 240), tracks: [t] }).kept).toEqual([{ index: 0, reason: 'margin' }]);
    const worse = ok({ ...single(600_000, 0.0525, 240), tracks: [{ ...t, margin: 0.001 }] });
    expect(worse.kept).toEqual([]);
  });
  it('keeps a track whose rate is already below the market benchmark', () => {
    const t: TrackInput = { type: 'fixed', balance: 500_000, rate: 0.03, months: 240 };
    expect(ok({ ...single(500_000, 0.03, 240), tracks: [t] }).kept).toEqual([{ index: 0, reason: 'rate' }]);
  });
  it('only the good-margin track is left out; the rest still counts', () => {
    const tracks: TrackInput[] = [variable(0.002), { type: 'fixed', balance: 500_000, rate: 0.065, months: 240 }];
    const r = ok({ ...single(1_227_000, 0.055, 300), tracks });
    expect(r.kept).toEqual([{ index: 0, reason: 'margin' }]);
    expect(r.verdict).toBe('savings');
    // The kept track still counts in the whole-mortgage payment after the refinance.
    const keptPay = payment(727_000, 0.0476, 300);
    expect(r.newPayment.mid).toBeCloseTo(keptPay + payment(500_000, A.benchmarkRate, 240), 6);
  });
  it('each track uses its own remaining months', () => {
    const tracks: TrackInput[] = [
      { type: 'fixed', balance: 600_000, rate: 0.06, months: 240 },
      { type: 'fixed', balance: 837_000, rate: 0.06, months: 360 },
    ];
    const r = ok({ balance: 1_437_000, monthlyPayment: 1, months: 300, tracks });
    expect(r.newPayment.mid).toBeCloseTo(payment(600_000, A.benchmarkRate, 240) + payment(837_000, A.benchmarkRate, 360), 6);
    expect(r.currentRate).toBeCloseTo(0.06, 10);
  });
});

describe('reported fee', () => {
  it('replaces the estimate with the exact figure', () => {
    const r = ok({ ...single(1_437_000, 0.06, 300), reportedFee: 14_300 });
    expect(r.feeReported).toBe(true);
    expect(r.fee).toEqual({ low: 14_300, mid: 14_300, high: 14_300 });
    const est = ok(single(1_437_000, 0.06, 300));
    expect(est.feeReported).toBe(false);
  });
  it('is ignored when every track is kept, since nothing is prepaid', () => {
    const t: TrackInput = { type: 'fixed', balance: 500_000, rate: 0.03, months: 240 };
    const r = ok({ ...single(500_000, 0.03, 240), tracks: [t], reportedFee: 9_000 });
    expect(r.feeReported).toBe(false);
    expect(r.fee.high).toBe(0);
  });
});
