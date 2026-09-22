import { annuityFactor } from './annuity';

export type SolveRateResult =
  | { ok: true; annualRate: number; iterations: number }
  | { ok: false; reason: 'invalid_input' | 'payment_too_low' | 'payment_too_high' };

export interface SolveRateOptions {
  /** Upper bound on the annual rate considered plausible. Default 25%. */
  maxAnnualRate?: number;
  tolerance?: number;
  maxIterations?: number;
}

/**
 * Solve the nominal annual rate implied by a balance, a monthly payment and
 * the months remaining (Newton's method inside a bisection bracket).
 *
 * Never throws for user input: impossible combinations return a reason the
 * UI can turn into a hint.
 *  - payment_too_low: payment × months ≤ balance → would need a rate ≤ 0.
 *  - payment_too_high: implies a rate above `maxAnnualRate`.
 */
export function solveAnnualRate(
  balance: number,
  monthlyPayment: number,
  months: number,
  { maxAnnualRate = 0.25, tolerance = 1e-10, maxIterations = 100 }: SolveRateOptions = {},
): SolveRateResult {
  if (!(balance > 0) || !(monthlyPayment > 0) || !Number.isInteger(months) || months < 1) {
    return { ok: false, reason: 'invalid_input' };
  }
  if (monthlyPayment * months <= balance) return { ok: false, reason: 'payment_too_low' };

  // f(i) = balance − payment · a(i, n); decreasing payment-capacity as i grows → f increasing in i.
  const f = (i: number) => balance - monthlyPayment * annuityFactor(i, months);
  let lo = 0;
  let hi = maxAnnualRate / 12;
  if (f(hi) < 0) return { ok: false, reason: 'payment_too_high' };

  // Initial guess from the average-balance approximation.
  let i = Math.min(hi, Math.max(1e-6, (2 * (monthlyPayment * months - balance)) / (balance * (months + 1))));

  for (let k = 1; k <= maxIterations; k++) {
    const fi = f(i);
    if (Math.abs(fi) < tolerance * balance) return { ok: true, annualRate: i * 12, iterations: k };
    if (fi > 0) hi = i;
    else lo = i;
    // Numerical derivative is robust across the i → 0 limit.
    const h = Math.max(1e-9, i * 1e-6);
    const d = (f(i + h) - f(i - h)) / (2 * h);
    let next = d !== 0 ? i - fi / d : NaN;
    if (!(next > lo && next < hi)) next = (lo + hi) / 2; // bisection fallback
    i = next;
  }
  return { ok: true, annualRate: i * 12, iterations: maxIterations };
}
