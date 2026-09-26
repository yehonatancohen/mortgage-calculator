import { describe, expect, it } from 'vitest';
import { scoring } from '../../config/scoring';
import { entryScore, scoreRefinanceLead, tierBuyerLead, type RefinanceLeadFacts } from './score';

const strong: RefinanceLeadFacts = {
  balance: 1_500_000,
  months: 240,
  phoneVerified: true,
  currentRate: 0.062,
  benchmarkRate: 0.047,
  netSavingsLow: 90_000,
  netSavingsHigh: 160_000,
  feeHigh: 5_000,
  timing: 'now',
  goal: 'lower',
  answered: 3,
  entryPage: '/',
};

describe('scoring config', () => {
  it('weights sum to 100 and every mix sums to 1', () => {
    const w = scoring.weights;
    expect(w.value + w.fit + w.intent).toBe(100);
    for (const mix of [scoring.value.mix, scoring.fit.mix, scoring.intent.mix]) {
      expect(Object.values(mix).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
  });
});

describe('scoreRefinanceLead', () => {
  it('a strong, verified lead is tier A and within 0..100', () => {
    const r = scoreRefinanceLead(strong, scoring);
    expect(r.tier).toBe('A');
    expect(r.total).toBeGreaterThan(70);
    expect(r.total).toBeLessThanOrEqual(100);
    expect(r.groups.value + r.groups.fit + r.groups.intent).toBeCloseTo(r.total, 0);
  });
  it('low balance forces tier C whatever the score', () => {
    expect(scoreRefinanceLead({ ...strong, balance: 250_000 }, scoring).hardFilterReasons).toContain('balance_below_minimum');
  });
  it('an unverified phone no longer blocks a lead (SMS verification is disabled)', () => {
    expect(scoreRefinanceLead({ ...strong, phoneVerified: false }, scoring).tier).toBe('A');
  });
  it('requireVerifiedPhone, if re-enabled, forces tier C for an unverified lead', () => {
    const cfg = { ...scoring, hardFilters: { ...scoring.hardFilters, requireVerifiedPhone: true } };
    expect(scoreRefinanceLead({ ...strong, phoneVerified: false }, cfg)).toMatchObject({ tier: 'C', hardFilterPass: false, hardFilterReasons: ['phone_not_verified'] });
  });
  it('weak intent and small savings keep a lead out of tier A', () => {
    const r = scoreRefinanceLead(
      { ...strong, timing: 'checking', goal: null, answered: 0, entryPage: '/guides/x/', netSavingsLow: null, netSavingsHigh: 20_000, currentRate: 0.048 },
      scoring,
    );
    expect(r.tier).not.toBe('A');
  });
  it('impossible inputs get no rate-gap credit', () => {
    expect(scoreRefinanceLead({ ...strong, currentRate: null }, scoring).signals.rateGap).toBe(0);
  });
  it('entry pages: refinance and bank pages rank above generic ones', () => {
    expect(entryScore('/', scoring)).toBe(1);
    expect(entryScore('/banks/leumi/', scoring)).toBe(1);
    expect(entryScore('/guides/x/', scoring)).toBeLessThan(1);
    expect(entryScore('/about/', scoring)).toBe(scoring.intent.otherEntryPage);
  });
});

describe('tierBuyerLead', () => {
  it('applies the buyer rules', () => {
    expect(tierBuyerLead({ loan: 1_000_000, phoneVerified: true, timing: 'now' }, scoring).tier).toBe('A');
    expect(tierBuyerLead({ loan: 500_000, phoneVerified: true, timing: 'now' }, scoring).tier).toBe('B');
    expect(tierBuyerLead({ loan: 1_000_000, phoneVerified: false, timing: 'now' }, scoring).tier).toBe('A');
    expect(tierBuyerLead({ loan: 300_000, phoneVerified: true, timing: 'now' }, scoring).tier).toBe('C');
  });
  it('requireVerifiedPhone, if re-enabled, forces tier C for an unverified lead', () => {
    const cfg = { ...scoring, hardFilters: { ...scoring.hardFilters, requireVerifiedPhone: true } };
    expect(tierBuyerLead({ loan: 1_000_000, phoneVerified: false, timing: 'now' }, cfg).tier).toBe('C');
  });
});
