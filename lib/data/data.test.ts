import { describe, expect, it } from 'vitest';
import { benchmarkRate, limits, purchaseTaxBrackets, refinanceAssumptions, sourcedValues, trackRates } from '.';
import { purchaseTax } from '../mortgage';

describe('data files', () => {
  const values = sourcedValues();

  it('finds sourced values', () => {
    expect(values.length).toBeGreaterThan(20);
  });

  it.each(values.map((v) => [`${v.file}:${v.path}`, v.entry] as const))('%s has source and lastUpdated', (_, e) => {
    expect(typeof e.source).toBe('string');
    expect(e.source === 'internal:methodology' || /^https:\/\//.test(e.source)).toBe(true);
    expect(e.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    if ('TODO_VERIFY' in e) expect(e.TODO_VERIFY).toBe(true);
  });

  it('market values from an external source must be verified or flagged', () => {
    for (const v of values) {
      if (v.entry.source !== 'internal:methodology' && !v.entry.TODO_VERIFY) {
        // Verified values must not still say PLACEHOLDER.
        expect(v.entry.note ?? '').not.toMatch(/PLACEHOLDER/);
      }
      if (v.entry.note?.includes('PLACEHOLDER')) expect(v.entry.TODO_VERIFY).toBe(true);
    }
  });

  it('rates are plausible fractions', () => {
    for (const r of Object.values(trackRates)) expect(r).toBeGreaterThan(0), expect(r).toBeLessThan(0.2);
    expect(benchmarkRate()).toBeGreaterThan(0);
  });

  it('builds refinance assumptions', () => {
    const a = refinanceAssumptions();
    expect(a.bandMin).toBeLessThanOrEqual(a.bandBase);
    for (const [y1, y2] of Object.values(a.yearsElapsedByBucket)) expect(y1).toBeLessThanOrEqual(y2);
  });

  it('limits are fractions', () => {
    for (const v of Object.values(limits.maxLtv)) expect(v).toBeGreaterThan(0), expect(v).toBeLessThanOrEqual(1);
    expect(limits.maxPaymentToIncome).toBeLessThanOrEqual(1);
  });

  it('purchase-tax tables are valid', () => {
    expect(() => purchaseTax(2_500_000, purchaseTaxBrackets.singleHome)).not.toThrow();
    expect(() => purchaseTax(2_500_000, purchaseTaxBrackets.additionalHome)).not.toThrow();
  });
});
