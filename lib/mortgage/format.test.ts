import { describe, expect, it } from 'vitest';
import {
  floorTo,
  formatILMobile,
  formatILS,
  formatILSRange,
  formatNumber,
  formatPercent,
  formatWhileTyping,
  isValidILMobile,
  normalizeILMobile,
  parseAmount,
  suggestShorthand,
  toE164IL,
} from '.';

describe('number formatting', () => {
  it('groups thousands deterministically', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(800000)).toBe('800,000');
    expect(formatNumber(1234567.891, 2)).toBe('1,234,567.89');
    expect(formatNumber(-4500)).toBe('−4,500');
    expect(formatNumber(-0.4)).toBe('0');
    expect(formatNumber(NaN)).toBe('—');
  });
  it('₪ prefix and ranges', () => {
    expect(formatILS(800000)).toBe('₪800,000');
    expect(formatILS(-1200)).toBe('−₪1,200');
    expect(formatILSRange(120000, 180000)).toBe('₪120,000–₪180,000');
    expect(formatILSRange(5, 5)).toBe('₪5');
  });
  it('contains no bidi or NBSP control characters', () => {
    expect(formatILSRange(1e6, 2e6)).not.toMatch(/[‎‏  ]/);
  });
  it('percent', () => {
    expect(formatPercent(0.04256)).toBe('4.26%');
    expect(formatPercent(0.05, 1)).toBe('5.0%');
  });
  it('floorTo rounds toward zero', () => {
    expect(floorTo(123_456, 1000)).toBe(123_000);
    expect(floorTo(-123_456, 1000)).toBe(-123_000);
  });
});

describe('input parsing', () => {
  it('parses separators, ₪ and spaces', () => {
    expect(parseAmount('800,000')).toBe(800000);
    expect(parseAmount('₪ 4,500')).toBe(4500);
    expect(parseAmount('1.2')).toBe(1.2);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('.')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
  it('formats while typing and keeps the caret after the same digit', () => {
    expect(formatWhileTyping('800000', 6)).toEqual({ text: '800,000', caret: 7 });
    expect(formatWhileTyping('8000', 1)).toEqual({ text: '8,000', caret: 1 });
    // Deleting a comma region: user typed into the middle
    expect(formatWhileTyping('80,0000', 4)).toEqual({ text: '800,000', caret: 3 });
    expect(formatWhileTyping('0012', 4)).toEqual({ text: '12', caret: 2 });
    expect(formatWhileTyping('1.2', 3)).toEqual({ text: '1.2', caret: 3 });
    expect(formatWhileTyping('', 0)).toEqual({ text: '', caret: 0 });
  });
  it('suggests shorthand', () => {
    expect(suggestShorthand(800, 'balance')).toBe(800_000);
    expect(suggestShorthand(1.2, 'balance')).toBe(1_200_000);
    expect(suggestShorthand(800_000, 'balance')).toBeNull();
    expect(suggestShorthand(4.5, 'payment')).toBe(4_500);
    expect(suggestShorthand(4_500, 'payment')).toBeNull();
    expect(suggestShorthand(0, 'balance')).toBeNull();
  });
});

describe('Israeli mobile', () => {
  it('normalizes and validates', () => {
    expect(normalizeILMobile('+972 50-123-4567')).toBe('0501234567');
    expect(isValidILMobile('050-123-4567')).toBe(true);
    expect(isValidILMobile('972541234567')).toBe(true);
    expect(isValidILMobile('03-1234567')).toBe(false);
    expect(isValidILMobile('05012345')).toBe(false);
  });
  it('formats progressively', () => {
    expect(formatILMobile('05')).toBe('05');
    expect(formatILMobile('0501')).toBe('050-1');
    expect(formatILMobile('0501234')).toBe('050-123-4');
    expect(formatILMobile('05012345678999')).toBe('050-123-4567');
  });
  it('E.164', () => {
    expect(toE164IL('050-123-4567')).toBe('+972501234567');
    expect(toE164IL('1234')).toBeNull();
  });
});
