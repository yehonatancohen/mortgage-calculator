/**
 * Deterministic number formatting. We deliberately avoid Intl.NumberFormat('he-IL'):
 * it inserts RLM/NBSP marks, places ₪ after the number, and can differ between
 * Node's ICU (build time) and the browser's (hydration), which would make the
 * static text change on load. Callers isolate figures in RTL text with
 * <bdi dir="ltr"> (or unicode-bidi: isolate).
 */

export const SHEKEL = '₪';
export const MINUS = '−';
export const EN_DASH = '–';

export function formatNumber(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return '—';
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(decimals);
  const [int = '', frac] = fixed.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const out = frac ? `${grouped}.${frac}` : grouped;
  return neg && Number(fixed) !== 0 ? MINUS + out : out;
}

/** ₪800,000 (rounded to whole shekels by default). */
export function formatILS(n: number, decimals = 0): string {
  const s = formatNumber(n, decimals);
  return s.startsWith(MINUS) ? `${MINUS}${SHEKEL}${s.slice(1)}` : `${SHEKEL}${s}`;
}

/** ₪120,000–₪180,000; collapses to a single figure when both ends are equal. */
export function formatILSRange(low: number, high: number): string {
  return low === high ? formatILS(low) : `${formatILS(low)}${EN_DASH}${formatILS(high)}`;
}

/** 4.25% */
export function formatPercent(fraction: number, decimals = 2): string {
  return `${formatNumber(fraction * 100, decimals)}%`;
}

/** Round toward zero to a step (conservative for savings figures). */
export const floorTo = (n: number, step: number) => Math.sign(n) * Math.floor(Math.abs(n) / step) * step;
export const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** Parse a typed amount: strips separators, ₪, spaces. Returns null when empty/invalid. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₪,\s‎‏]/g, '');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned) || cleaned === '.') return null;
  return Number(cleaned);
}

/**
 * Live formatting while typing. Keeps the caret after the same digit it was after.
 * Only integer amounts; a trailing "." is preserved so shorthand like "1.2" can be typed.
 */
export function formatWhileTyping(raw: string, caret: number): { text: string; caret: number } {
  const digitsBefore = raw.slice(0, caret).replace(/[^\d.]/g, '').length;
  const clean = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  const [int = '', frac] = clean.split('.');
  const intTrim = int.replace(/^0+(?=\d)/, '');
  const grouped = intTrim.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const text = frac !== undefined ? `${grouped}.${frac}` : grouped;
  // Leading zeros removed shift the digit count.
  const removed = int.length - intTrim.length;
  let target = Math.max(0, digitsBefore - removed);
  let pos = 0;
  while (pos < text.length && target > 0) {
    if (/[\d.]/.test(text.charAt(pos))) target--;
    pos++;
  }
  return { text, caret: pos };
}

export type ShorthandField = 'balance' | 'payment';

/**
 * Smart shorthand: "800" in the balance field most likely means ₪800,000; "1.2" means ₪1,200,000.
 * "4.5" in the payment field means ₪4,500. Returns the suggested value or null.
 */
export function suggestShorthand(value: number, field: ShorthandField): number | null {
  if (!(value > 0)) return null;
  if (field === 'balance') {
    if (value < 10) return Math.round(value * 1_000_000);
    if (value < 10_000) return Math.round(value * 1_000);
    return null;
  }
  if (value < 50) return Math.round(value * 1_000);
  return null;
}
