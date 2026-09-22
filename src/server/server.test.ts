import { describe, expect, it } from 'vitest';
import { computeBuyer, computeRefinance, validateLead } from './leads';
import { checkToken, issueToken } from './otp';
import { randomCode, randomToken, safeEqual } from './crypto';
import type { Env } from './env';

const base = {
  kind: 'refinance' as const,
  firstName: 'דנה',
  phone: '050-123-4567',
  token: 'x',
  timing: 'now' as const,
  consentContact: true,
  inputs: { balance: 1_200_000, payment: 8_300, years: 22 },
};

describe('validateLead', () => {
  it('accepts a complete payload and normalizes the phone', () => {
    const v = validateLead(base);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.value.phoneE164).toBe('+972501234567');
  });
  it('requires explicit contact consent', () => {
    expect(validateLead({ ...base, consentContact: false })).toEqual({ ok: false, error: 'consent_required' });
  });
  it('rejects bad phone, name, timing and kind', () => {
    expect(validateLead({ ...base, phone: '03-1234567' }).ok).toBe(false);
    expect(validateLead({ ...base, firstName: 'a' }).ok).toBe(false);
    expect(validateLead({ ...base, timing: 'soon' as never }).ok).toBe(false);
    expect(validateLead({ ...base, kind: 'other' as never }).ok).toBe(false);
    expect(validateLead(null).ok).toBe(false);
  });
  it('strips markup from the name and keeps only utm_* keys', () => {
    const v = validateLead({ ...base, firstName: '<b>דנה</b>', utm: { utm_source: 'google', evil: 'x' } });
    if (!v.ok) throw new Error('expected ok');
    expect(v.value.firstName).toBe('bדנה/b');
    expect(v.value.utm).toEqual({ utm_source: 'google' });
  });
});

describe('server recompute', () => {
  it('recomputes refinance results and scores without trusting client numbers', () => {
    const c = computeRefinance({ ...base.inputs, savings: 9_999_999 }, true, 'now', '/');
    expect(c).not.toBeNull();
    expect(c!.inputs).not.toHaveProperty('savings');
    expect(c!.score).toBeGreaterThan(0);
    expect(['A', 'B', 'C']).toContain(c!.tier);
  });
  it('an unverified phone is always tier C', () => {
    expect(computeRefinance(base.inputs, false, 'now', '/')!.tier).toBe('C');
  });
  it('rejects out-of-range inputs', () => {
    expect(computeRefinance({ balance: -1, payment: 5000, years: 20 }, true, 'now', '/')).toBeNull();
    expect(computeRefinance({ balance: 800000, payment: 5000 }, true, 'now', '/')).toBeNull();
  });
  it('computes buyer affordability', () => {
    const c = computeBuyer({ netIncome: 22_000, obligations: 0, equity: 600_000, years: 25, buyerType: 'firstHome' }, true, 'now');
    expect(c).not.toBeNull();
    expect(Number((c!.results as { loanAtMaxPrice: number }).loanAtMaxPrice)).toBeGreaterThan(0);
    expect(computeBuyer({ netIncome: 22_000, obligations: 0, equity: 600_000, years: 25, buyerType: 'castle' }, true, 'now')).toBeNull();
  });
});

describe('OTP verification token', () => {
  const env = { OTP_SECRET: 'test-secret' } as Env;
  it('verifies for the same phone only', async () => {
    const t = await issueToken(env, '+972501234567');
    expect(await checkToken(env, '+972501234567', t)).toBe(true);
    expect(await checkToken(env, '+972501234568', t)).toBe(false);
    expect(await checkToken({ OTP_SECRET: 'other' } as Env, '+972501234567', t)).toBe(false);
  });
  it('rejects tampered or expired tokens', async () => {
    const t = await issueToken(env, '+972501234567');
    const [, sig] = t.split('.');
    expect(await checkToken(env, '+972501234567', `${Math.floor(Date.now() / 1000) + 99999}.${sig}`)).toBe(false);
    expect(await checkToken(env, '+972501234567', `1.${sig}`)).toBe(false);
    expect(await checkToken(env, '+972501234567', undefined)).toBe(false);
  });
});

describe('crypto helpers', () => {
  it('codes are 6 digits and tokens are url-safe', () => {
    for (let i = 0; i < 50; i++) expect(randomCode()).toMatch(/^\d{6}$/);
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});
