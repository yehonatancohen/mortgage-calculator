/**
 * Israeli mobile numbers: 05X-XXX-XXXX (10 digits, national format).
 * Accepts +972 / 972 prefixes and strips separators.
 * Prefix list is intentionally broad (050–059); the OTP step is the real check.
 */

export function normalizeILMobile(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('972')) d = '0' + d.slice(3);
  return d;
}

export function isValidILMobile(raw: string): boolean {
  return /^05\d{8}$/.test(normalizeILMobile(raw));
}

/** Progressive display format while typing: 05 → 050- → 050-123- → 050-123-4567. */
export function formatILMobile(raw: string): string {
  const d = normalizeILMobile(raw).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** E.164 for SMS providers: 0501234567 → +972501234567. */
export function toE164IL(raw: string): string | null {
  const d = normalizeILMobile(raw);
  return /^05\d{8}$/.test(d) ? `+972${d.slice(1)}` : null;
}
