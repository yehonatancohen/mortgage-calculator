import { monthsToRepay, payment } from './annuity';
import { estimateFixedTrackFee, type PrepaymentFeeParams } from './prepaymentFee';
import { solveAnnualRate } from './solveRate';

/**
 * Refinance savings.
 *
 * A single number would be dishonest: part of most Israeli mortgages is
 * CPI-linked, the new rate depends on the borrower's profile and track mix,
 * and the prepayment fee depends on facts we may not know. So we compute three
 * scenarios:
 *   low  = new rate at benchmark + band, highest fee, highest switching cost
 *   mid  = new rate at the market benchmark, middle fee and switching cost (the typical case)
 *   high = new rate at benchmark − band, lowest fee,  lowest switching cost
 * Savings are nominal ₪ over the remaining term, net of costs. Each optional
 * answer narrows the band and the fee range.
 *
 * The VERDICT is decided at the typical (mid) case, never the best one: a borrower whose rate
 * only beats the market in the best case is told the mortgage is fine as it is.
 *
 * When the borrower enters their mortgage track by track we know each rate, and for prime and
 * variable tracks also the margin. The margin is what the bank keeps for the whole term, so a
 * track whose margin is as good as today's market (within a tolerance) is not worth touching:
 * it is left out of the refinance and adds neither savings nor costs.
 */

export type TakenBucket = 'before2015' | '2015to2019' | '2020to2022' | 'since2023' | 'unknown';
export type YesNoUnknown = 'yes' | 'no' | 'unknown';
export type Goal = 'lower' | 'shorten' | 'consolidate' | 'cashout' | 'unknown';
export type TrackType = 'fixed' | 'prime' | 'variable';

export interface TrackInput {
  balance: number;
  /** Current total rate of the track (fraction). */
  rate: number;
  /** Months remaining on this track. */
  months: number;
  type: TrackType;
  /**
   * Prime: discount below the prime anchor. Variable: margin above the anchor. Fraction; the
   * borrower reads it from the mortgage report. Undefined when they did not enter it.
   */
  margin?: number;
}

export interface RefinanceInput {
  balance: number;
  monthlyPayment: number;
  months: number;
  taken?: TakenBucket;
  hasFixed?: YesNoUnknown;
  goal?: Goal;
  /** Track-by-track detail. When present it replaces balance / monthlyPayment / months. */
  tracks?: TrackInput[];
  /** Prepayment fee copied from the bank's early-repayment statement (₪). Replaces the estimate. */
  reportedFee?: number;
}

export interface RefinanceAssumptions {
  /** Benchmark new-loan rate (fraction, nominal annual). */
  benchmarkRate: number;
  /** Current market reference rate for fixed tracks (fraction), used by the fee estimate. */
  marketFixedRate: number;
  /** Today's average margins on new prime / variable tracks (fractions). */
  marketMargin: { primeDiscount: number; variable: number };
  /** A track margin this close to (or better than) the market's is good enough to keep. */
  marginTolerance: number;
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
  /**
   * A fixed track's contract rate cannot sit far above the loan's blended rate: capped at
   * min(blended / fixedShare, blended + this margin). Keeps the fee estimate consistent with
   * the rate we solved from the user's own numbers.
   */
  fixedRateMaxAboveBlended: number;
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

/** savings = worth checking (typical case pays off); maybe = borderline; none = leave it alone. */
export type Verdict = 'savings' | 'maybe' | 'none';

interface Band {
  low: number;
  mid: number;
  high: number;
}

export type RefinanceResult =
  | { ok: false; reason: 'invalid_input' | 'payment_too_low' | 'payment_too_high' }
  | {
      ok: true;
      currentRate: number;
      newRate: Band;
      /** Whole-mortgage monthly payment after the refinance (tracks that are kept included). */
      newPayment: Band;
      monthlySaving: Band;
      grossTotal: Band;
      fee: Band;
      switchingCosts: Band;
      netTotal: Band;
      /** For goal "shorten": months saved keeping the current payment at the mid new rate. */
      monthsSaved: number | null;
      verdict: Verdict;
      accuracy: number;
      answered: number;
      /** Tracks left out of the refinance, and why (margin as good as the market, or rate already below it). */
      kept: { index: number; reason: 'margin' | 'rate' }[];
      /** Number of tracks entered (0 when the mortgage was entered as one balance and payment). */
      trackCount: number;
      /** The fee came from the borrower's statement, not from our estimate. */
      feeReported: boolean;
    };

const answeredCount = (i: RefinanceInput) => [i.taken, i.hasFixed, i.goal].filter((v) => v !== undefined);
const mid = (b: { low: number; high: number }) => (b.low + b.high) / 2;

interface Seg {
  balance: number;
  payment: number;
  months: number;
  rate: number;
  track?: TrackInput;
}

/** Why a track is not worth refinancing, or null when it is a candidate. */
function keepReason(t: TrackInput, a: RefinanceAssumptions): 'margin' | 'rate' | null {
  if (t.margin !== undefined) {
    if (t.type === 'prime' && t.margin >= a.marketMargin.primeDiscount - a.marginTolerance) return 'margin';
    if (t.type === 'variable' && t.margin <= a.marketMargin.variable + a.marginTolerance) return 'margin';
  }
  return t.rate <= a.benchmarkRate ? 'rate' : null;
}

export function refinanceSavings(input: RefinanceInput, a: RefinanceAssumptions): RefinanceResult {
  const usingTracks = (input.tracks?.length ?? 0) > 0;
  let segs: Seg[];
  let currentRate: number;

  if (usingTracks) {
    const bad = input.tracks!.some((t) => !(t.balance > 0) || !(t.rate > 0 && t.rate < 0.5) || !(t.months >= 1));
    if (bad) return { ok: false, reason: 'invalid_input' };
    segs = input.tracks!.map((t) => ({ balance: t.balance, payment: payment(t.balance, t.rate, t.months), months: t.months, rate: t.rate, track: t }));
    const total = segs.reduce((s, x) => s + x.balance, 0);
    currentRate = segs.reduce((s, x) => s + x.rate * x.balance, 0) / total;
  } else {
    const solved = solveAnnualRate(input.balance, input.monthlyPayment, input.months);
    if (!solved.ok) return { ok: false, reason: solved.reason };
    segs = [{ balance: input.balance, payment: input.monthlyPayment, months: input.months, rate: solved.annualRate }];
    currentRate = solved.annualRate;
  }

  const answers = answeredCount(input);
  const known = answers.filter((v) => v !== 'unknown').length;
  const unknown = answers.length - known;

  const band = Math.max(a.bandMin, a.bandBase - known * a.bandNarrowKnown - unknown * a.bandNarrowUnknown);
  const newRate: Band = { low: Math.max(0, a.benchmarkRate - band), mid: a.benchmarkRate, high: a.benchmarkRate + band };

  const kept: { index: number; reason: 'margin' | 'rate' }[] = [];
  const cands: Seg[] = [];
  const keptSegs: Seg[] = [];
  segs.forEach((s, index) => {
    const reason = s.track ? keepReason(s.track, a) : null;
    if (reason) {
      kept.push({ index, reason });
      keptSegs.push(s);
    } else cands.push(s);
  });

  const keptPay = keptSegs.reduce((s, x) => s + x.payment, 0);
  const curPay = cands.reduce((s, x) => s + x.payment, 0);
  const newPay = (r: number) => cands.reduce((s, x) => s + payment(x.balance, r, x.months), 0);
  const gross = (r: number) => cands.reduce((s, x) => s + (x.payment - payment(x.balance, r, x.months)) * x.months, 0);

  const monthlySaving: Band = { low: curPay - newPay(newRate.high), mid: curPay - newPay(newRate.mid), high: curPay - newPay(newRate.low) };
  const grossTotal: Band = { low: gross(newRate.high), mid: gross(newRate.mid), high: gross(newRate.low) };
  const newPayment: Band = { low: keptPay + newPay(newRate.low), mid: keptPay + newPay(newRate.mid), high: keptPay + newPay(newRate.high) };

  const feeReported = input.reportedFee !== undefined && cands.length > 0;
  const feeLH = cands.length === 0 ? { low: 0, high: 0 } : feeReported ? { low: input.reportedFee!, high: input.reportedFee! } : usingTracks ? trackFee(cands, input, a) : feeRange(input, a, currentRate);
  const fee: Band = { ...feeLH, mid: mid(feeLH) };
  const sw = cands.length === 0 ? ([0, 0] as const) : a.switchingCosts;
  const switchingCosts: Band = { low: sw[0], mid: (sw[0] + sw[1]) / 2, high: sw[1] };

  const netTotal: Band = {
    low: grossTotal.low - fee.high - switchingCosts.high,
    mid: grossTotal.mid - fee.mid - switchingCosts.mid,
    high: grossTotal.high - fee.low - switchingCosts.low,
  };

  const meaningful = (total: number, monthly: number) => total >= a.meaningfulTotal && monthly >= a.meaningfulMonthly;
  const verdict: Verdict = meaningful(netTotal.mid, monthlySaving.mid)
    ? 'savings'
    : netTotal.mid > 0 && meaningful(netTotal.high, monthlySaving.high)
      ? 'maybe'
      : 'none';

  let monthsSaved: number | null = null;
  if (input.goal === 'shorten' && verdict !== 'none') {
    const totalBalance = segs.reduce((s, x) => s + x.balance, 0);
    const totalPay = segs.reduce((s, x) => s + x.payment, 0);
    const totalMonths = Math.max(...segs.map((x) => x.months));
    const m = monthsToRepay(totalBalance, a.benchmarkRate, totalPay);
    monthsSaved = Number.isFinite(m) ? Math.max(0, totalMonths - m) : null;
  }

  const accuracy = Math.min(100, a.accuracy.base + known * a.accuracy.perKnown + unknown * a.accuracy.perUnknown);

  return {
    ok: true,
    currentRate,
    newRate,
    newPayment,
    monthlySaving,
    grossTotal,
    fee,
    switchingCosts,
    netTotal,
    monthsSaved,
    verdict,
    accuracy,
    answered: answers.length,
    kept,
    trackCount: usingTracks ? segs.length : 0,
    feeReported,
  };
}

/** Elapsed-years scenarios for the time discount: the chosen origination bucket, or every bucket. */
function elapsedScenarios(taken: TakenBucket | undefined, a: RefinanceAssumptions): number[] {
  const buckets = Object.keys(a.yearsElapsedByBucket) as Exclude<TakenBucket, 'unknown'>[];
  return taken && taken !== 'unknown' ? a.yearsElapsedByBucket[taken] : buckets.flatMap((b) => a.yearsElapsedByBucket[b]);
}

/** Fee when the tracks are known: each fixed track's own rate and remaining months, summed. */
function trackFee(cands: Seg[], input: RefinanceInput, a: RefinanceAssumptions): { low: number; high: number } {
  const years = elapsedScenarios(input.taken, a);
  const fixed = cands.filter((c) => c.track?.type === 'fixed');
  if (fixed.length === 0) return { low: a.fee.operationalFee, high: a.fee.operationalFee };
  let low = 0;
  let high = 0;
  for (const c of fixed) {
    const fees = years.map((y) => estimateFixedTrackFee({ balance: c.balance, contractRate: c.rate, marketRate: a.marketFixedRate, monthsRemaining: c.months, yearsElapsed: y, gaveNotice: true }, a.fee).total);
    low += Math.min(...fees);
    high += Math.max(...fees);
  }
  return { low, high };
}

function feeRange(input: RefinanceInput, a: RefinanceAssumptions, blendedRate: number): { low: number; high: number } {
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
      const cap = s > 0 ? Math.min(blendedRate / s, blendedRate + a.fixedRateMaxAboveBlended) : 0;
      const contractRate = Math.min(sc.rate, cap);
      const f =
        bal > 0
          ? estimateFixedTrackFee(
              { balance: bal, contractRate, marketRate: a.marketFixedRate, monthsRemaining: input.months, yearsElapsed: sc.years, gaveNotice: true },
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

export type Headline =
  | { kind: 'typical'; mid: number; low: number; high: number; monthlyMid: number; monthlyLow: number; monthlyHigh: number }
  | { kind: 'borderline'; high: number }
  | { kind: 'none' };

/**
 * What the UI may honestly say. Totals are rounded DOWN to ₪1,000 and monthly figures to ₪10,
 * so we never overstate. The headline figure is the typical case; the low/high range is only
 * supporting detail. A borderline result carries no headline figure at all.
 */
export function headline(r: Extract<RefinanceResult, { ok: true }>): Headline {
  const down = (n: number, step: number) => Math.floor(n / step) * step;
  if (r.verdict === 'none') return { kind: 'none' };
  if (r.verdict === 'maybe') return { kind: 'borderline', high: down(r.netTotal.high, 1000) };
  return {
    kind: 'typical',
    mid: down(r.netTotal.mid, 1000),
    low: Math.max(0, down(r.netTotal.low, 1000)),
    high: down(r.netTotal.high, 1000),
    monthlyMid: down(r.monthlySaving.mid, 10),
    monthlyLow: Math.max(0, down(r.monthlySaving.low, 10)),
    monthlyHigh: down(r.monthlySaving.high, 10),
  };
}
