/**
 * Annuity (Spitzer / שפיצר) primitives.
 *
 * Rate convention used everywhere in this module: rates are NOMINAL ANNUAL
 * fractions (0.045 = 4.5%), compounded monthly: monthly rate = annual / 12.
 * This matches how Israeli banks quote mortgage rates. Data files store
 * percents; convert once at load with `pct()`.
 */

const EPS = 1e-12;

/** Percent (4.5) → fraction (0.045). */
export const pct = (percent: number): number => percent / 100;

export const monthlyRate = (annualRate: number): number => annualRate / 12;

/** Present value of 1/month for n months at monthly rate i. */
export function annuityFactor(i: number, months: number): number {
  if (Math.abs(i) < EPS) return months;
  return (1 - Math.pow(1 + i, -months)) / i;
}

/** Monthly payment for principal over `months` at nominal annual rate. */
export function payment(principal: number, annualRate: number, months: number): number {
  assertPositiveInt(months, 'months');
  if (principal <= 0) return 0;
  return principal / annuityFactor(monthlyRate(annualRate), months);
}

/** Principal that a fixed monthly payment can carry. Inverse of `payment`. */
export function principalFor(monthlyPayment: number, annualRate: number, months: number): number {
  assertPositiveInt(months, 'months');
  if (monthlyPayment <= 0) return 0;
  return monthlyPayment * annuityFactor(monthlyRate(annualRate), months);
}

/** Balance still owed after `paid` payments. */
export function balanceAfter(principal: number, annualRate: number, months: number, paid: number): number {
  const i = monthlyRate(annualRate);
  const p = payment(principal, annualRate, months);
  if (paid >= months) return 0;
  return p * annuityFactor(i, months - paid);
}

/**
 * Months needed to repay `principal` with a fixed `monthlyPayment`.
 * Returns Infinity when the payment does not cover the first month's interest.
 */
export function monthsToRepay(principal: number, annualRate: number, monthlyPayment: number): number {
  const i = monthlyRate(annualRate);
  if (principal <= 0) return 0;
  if (Math.abs(i) < EPS) return Math.ceil(principal / monthlyPayment);
  const interest = principal * i;
  if (monthlyPayment <= interest) return Infinity;
  return Math.ceil(-Math.log(1 - interest / monthlyPayment) / Math.log(1 + i) - 1e-9);
}

function assertPositiveInt(n: number, name: string) {
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`${name} must be a positive integer, got ${n}`);
}
