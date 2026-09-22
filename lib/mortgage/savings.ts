import { monthsToRepay, payment } from './annuity';
import { estimateFixedTrackFee, type PrepaymentFeeParams } from './prepaymentFee';
import { solveAnnualRate } from './solveRate';

/**
 * Refinance savings RANGE.
 *
 * A single number would be dishonest: part of most Israeli mortgages is
 * CPI-linked, the new rate depends on the borrower's profile and track mix,
 * and the prepayment fee depends on facts we may not know. So we compute a
 * low and a high scenario:
 *   low  = new rate at benchmark + band, highest fee, highest switching cost
 *   high = new rate at benchmark − band, lowest fee,  lowest switching cost
 * Savings are nominal ₪ over the remaining term, net of costs. Each optional
 * answer narrows the band and the fee range.
 */

export type TakenBucket = 'before2015' | '2015to2019' | '2020to2022' | 'since2023' | 'unknown';
export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type Goal = 'lower' | 'shorten' | 'consolidate' | 'cashout' | 'unknown';

export interface RefinanceInput {
  balance: number;
  monthlyPayment: number;
  months: number;
  taken?: TakenBucket;
  hasFixed?: YesNoUnknown;
  goal?: Goal;
}

export interface RefinanceAssumptions {
  /** Benchmark new-loan rate (fraction, nominal annual). */
  benchmarkRate: number;
  /** Current market reference rate for fixed tracks (fraction), used by the fee estimate. */
  marketFixedRate: number;
  /** Half-width of the new-rate band with no optional answers (fraction). */
  bandBase: number;
  /** Band narrowing per answered question: known answer / "don't know". */
  bandNarrowKnown: number;
  bandNarrowUnknown: number;
  bandMin: number;
  /** Share of balance on fixed tracks when the user says "yes" / "don't know". */
  fixedShareIfYes: [number, number];
  fixedShareIfUnknown: [number, number];
  /** Contract fixed-rate range by origination bucket (fractions). */
  fixedRateByBucket: Record<Exclude<TakenBucket, 'unknown'>, [number, number]>;
  /** Years elapsed range by bucket (for the time discount). */
  yearsElapsedByBucket: Record<Exclude<TakenBucket, 'unknown'>, [number, number]>;
  /** One-off switching costs (appraisal, file fees, etc.), ₪ range. */
  switchingCosts: [number, number];
  /** Below this net total, savings are not meaningful (₪). */
  meaningfulTotal: number;
  /** Below this monthly difference, savings are not meaningful (₪). */
  meaningfulMonthly: number;
  accuracy: { base: number; perKnown: number; perUnknown: number };
  fee: PrepaymentFeeParams;
}

export type Verdict = 'savings' | 'maybe' | 'none';

export type RefinanceResult =
  | { ok: false; reason: 'invalid_input' | 'payment_too_low' | 'payment_too_high' }
  | {
      ok: true;
      currentRate: number;
      newRate: { low: number; high: number };
      newPayment: { low: number; high: number };
      monthlySaving: { low: number; high: number };
      grossTotal: { low: number; high: number };
      fee: { low: number; high: number };
      switchingCosts: { low: number; high: number };
      netTotal: { low: number; high: number };
      /** For goal "shorten": months saved keeping the current payment at the mid new rate. */
      monthsSaved: number | null;
      verdict: Verdict;
      accuracy: number;
      answered: number;
    };

const answeredCount = (i: RefinanceInput) => [i.taken, i.hasFixed, i.goal].filter((v) => v !== undefined);

export function refinanceSavings(input: RefinanceInput, a: RefinanceAssumptions): RefinanceResult {
  const solved = solveAnnualRate(input.balance, input.monthlyPayment, input.months);
  if (!solved.ok) return { ok: false, reason: solved.reason };

  const answers = answeredCount(input);
  const known = answers.filter((v) => v !== 'unknown').length;
  const unknown = answers.length - known;

  const band = Math.max(a.bandMin, a.bandBase - known * a.bandNarrowKnown - unknown * a.bandNarrowUnknown);
  const rLow = Math.max(0, a.benchmarkRate - band);
  const rHigh = a.benchmarkRate + band;

  const pAtLow = payment(input.balance, rLow, input.months);
  const pAtHigh = payment(input.balance, rHigh, input.months);
  const monthlyLow = input.monthlyPayment - pAtHigh;
  const monthlyHigh = input.monthlyPayment - pAtLow;

  const fee = feeRange(input, a);
  const grossLow = monthlyLow * input.months;
  const grossHigh = monthlyHigh * input.months;
  const netLow = grossLow - fee.high - a.switchingCosts[1];
  const netHigh = grossHigh - fee.low - a.switchingCosts[0];

  const meaningful = (total: number, monthly: number) => total >= a.meaningfulTotal && monthly >= a.meaningfulMonthly;
  const verdict: Verdict = meaningful(netLow, monthlyLow) ? 'savings' : meaningful(netHigh, monthlyHigh) ? 'maybe' : 'none';

  let monthsSaved: number | null = null;
  if (input.goal === 'shorten' && verdict !== 'none') {
    const m = monthsToRepay(input.balance, a.benchmarkRate, input.monthlyPayment);
    monthsSaved = Number.isFinite(m) ? Math.max(0, input.months - m) : null;
  }

  const accuracy = Math.min(100, a.accuracy.base + known * a.accuracy.perKnown + unknown * a.accuracy.perUnknown);

  return {
    ok: true,
    currentRate: solved.annualRate,
    newRate: { low: rLow, high: rHigh },
    newPayment: { low: pAtLow, high: pAtHigh },
    monthlySaving: { low: monthlyLow, high: monthlyHigh },
    grossTotal: { low: grossLow, high: grossHigh },
    fee,
    switchingCosts: { low: a.switchingCosts[0], high: a.switchingCosts[1] },
    netTotal: { low: netLow, high: netHigh },
    monthsSaved,
    verdict,
    accuracy,
    answered: answers.length,
  };
}

function feeRange(input: RefinanceInput, a: RefinanceAssumptions): { low: number; high: number } {
  const share: [number, number] =
    input.hasFixed === 'no' ? [0, 0] : input.hasFixed === 'yes' ? a.fixedShareIfYes : a.fixedShareIfUnknown;

  const buckets = Object.keys(a.fixedRateByBucket) as Exclude<TakenBucket, 'unknown'>[];
  const scenarios: { rate: number; years: number }[] =
    input.taken && input.taken !== 'unknown'
      ? cross(a.fixedRateByBucket[input.taken], a.yearsElapsedByBucket[input.taken])
      : buckets.flatMap((b) => cross(a.fixedRateByBucket[b], a.yearsElapsedByBucket[b]));

  let low = Infinity;
  let high = -Infinity;
  for (const s of share) {
    for (const sc of scenarios) {
      const bal = input.balance * s;
      const f =
        bal > 0
          ? estimateFixedTrackFee(
              { balance: bal, contractRate: sc.rate, marketRate: a.marketFixedRate, monthsRemaining: input.months, yearsElapsed: sc.years },
              a.fee,
            ).total
          : a.fee.operationalFee;
      low = Math.min(low, f);
      high = Math.max(high, f);
    }
  }
  return { low, high };
}

const cross = ([r1, r2]: [number, number], [y1, y2]: [number, number]) => [
  { rate: r1, years: y1 },
  { rate: r1, years: y2 },
  { rate: r2, years: y1 },
  { rate: r2, years: y2 },
];
