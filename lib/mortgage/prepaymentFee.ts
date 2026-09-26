import { annuityFactor, monthlyRate, payment } from './annuity';

/**
 * SIMPLIFIED prepayment-fee (עמלת פירעון מוקדם) ESTIMATE.
 *
 * Structure only; every parameter comes from data/prepayment-fee.json.
 * The model: for a fixed-rate track, the capitalization-difference component
 * is the present value of the remaining payments discounted at the current
 * market reference rate, minus the balance, when that is positive (i.e. when
 * the market rate is below the contract rate). A time-elapsed discount reduces it.
 * A flat operational fee is added, plus a fee on the amount repaid when the
 * borrower gave less than ten days' notice (Banking Order 2002, s. 3(2)).
 *
 * It ignores CPI-averaging components and bank-specific details. It is
 * labeled as an estimate everywhere it is shown.
 */

export interface PrepaymentFeeParams {
  /** Flat operational fee per prepayment, ₪. */
  operationalFee: number;
  /** Discount on the capitalization component by years since origination. Sorted by minYears asc. */
  timeDiscounts: { minYears: number; discount: number }[];
  /** Fee on the amount repaid when notice was under ten days (fraction). */
  noNoticeFeeRate: number;
}

export interface FixedTrackInput {
  balance: number;
  /** Contract nominal annual rate (fraction). */
  contractRate: number;
  /** Current market reference nominal annual rate for the same track (fraction). */
  marketRate: number;
  monthsRemaining: number;
  yearsElapsed: number;
  gaveNotice?: boolean;
}

export interface FeeBreakdown {
  capitalization: number;
  timeDiscount: number;
  noticeFee: number;
  operational: number;
  total: number;
}

export function timeDiscountFor(yearsElapsed: number, table: PrepaymentFeeParams['timeDiscounts']): number {
  let d = 0;
  for (const row of table) if (yearsElapsed >= row.minYears) d = row.discount;
  return d;
}

export function capitalizationDifference(t: Pick<FixedTrackInput, 'balance' | 'contractRate' | 'marketRate' | 'monthsRemaining'>): number {
  if (t.balance <= 0 || t.marketRate >= t.contractRate) return 0;
  const p = payment(t.balance, t.contractRate, t.monthsRemaining);
  const pv = p * annuityFactor(monthlyRate(t.marketRate), t.monthsRemaining);
  return Math.max(0, pv - t.balance);
}

export function estimateFixedTrackFee(t: FixedTrackInput, params: PrepaymentFeeParams): FeeBreakdown {
  const cap = capitalizationDifference(t);
  const td = timeDiscountFor(t.yearsElapsed, params.timeDiscounts);
  const afterTime = cap * (1 - td);
  const noticeFee = t.gaveNotice ? 0 : Math.max(0, t.balance) * params.noNoticeFeeRate;
  return {
    capitalization: cap,
    timeDiscount: cap - afterTime,
    noticeFee,
    operational: params.operationalFee,
    total: afterTime + noticeFee + params.operationalFee,
  };
}
