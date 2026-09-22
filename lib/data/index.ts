/**
 * Turns data/*.json into typed inputs for lib/mortgage. The math module never
 * imports JSON itself; this is the one place percents become fractions.
 */
import rates from '../../data/rates.json';
import assumptions from '../../data/assumptions.json';
import prepaymentFee from '../../data/prepayment-fee.json';
import regulation from '../../data/regulation.json';
import purchaseTaxData from '../../data/purchase-tax.json';
import { pct, type RefinanceAssumptions, type TakenBucket, type TaxBracket } from '../mortgage';

export interface Sourced<T = unknown> {
  value: T;
  source: string;
  lastUpdated: string;
  TODO_VERIFY?: boolean;
  unit?: string;
  label?: string;
  note?: string;
}

export type TrackId = keyof typeof rates.tracks;
type Bucket = Exclude<TakenBucket, 'unknown'>;

export const trackRates = Object.fromEntries(
  Object.entries(rates.tracks).map(([k, v]) => [k, pct(v.value)]),
) as Record<TrackId, number>;

/** Weighted benchmark new-loan rate (fraction). */
export function benchmarkRate(): number {
  const mix = assumptions.benchmarkMix.value as Partial<Record<TrackId, number>>;
  let sum = 0;
  let w = 0;
  for (const [track, weight] of Object.entries(mix) as [TrackId, number][]) {
    sum += trackRates[track] * weight;
    w += weight;
  }
  if (Math.abs(w - 1) > 1e-9) throw new Error(`benchmarkMix weights sum to ${w}, expected 1`);
  return sum;
}

/** Year the rate data describes; keeps builds deterministic (no Date.now()). */
export const dataYear = Number(String(rates.period.value).slice(0, 4));

export function refinanceAssumptions(): RefinanceAssumptions {
  const a = assumptions;
  const buckets = a.originBuckets.value as Record<Bucket, [number, number]>;
  const fixedByBucket = rates.fixedRateByOriginBucket as unknown as Record<Bucket, Sourced<[number, number]>>;
  const fixedRateByBucket = {} as Record<Bucket, [number, number]>;
  const yearsElapsedByBucket = {} as Record<Bucket, [number, number]>;
  for (const b of Object.keys(buckets) as Bucket[]) {
    const [r1, r2] = fixedByBucket[b].value;
    fixedRateByBucket[b] = [pct(r1), pct(r2)];
    const [y1, y2] = buckets[b];
    yearsElapsedByBucket[b] = [Math.max(0, dataYear - y2), Math.max(0, dataYear - y1)];
  }
  const refTrack = a.marketFixedReferenceTrack.value as TrackId;
  return {
    benchmarkRate: benchmarkRate(),
    marketFixedRate: trackRates[refTrack],
    bandBase: pct(a.bandBase.value),
    bandNarrowKnown: pct(a.bandNarrowKnown.value),
    bandNarrowUnknown: pct(a.bandNarrowUnknown.value),
    bandMin: pct(a.bandMin.value),
    fixedShareIfYes: a.fixedShareIfYes.value as [number, number],
    fixedShareIfUnknown: a.fixedShareIfUnknown.value as [number, number],
    fixedRateByBucket,
    fixedRateMaxAboveBlended: pct(a.fixedRateMaxAboveBlended.value),
    yearsElapsedByBucket,
    switchingCosts: a.switchingCosts.value as [number, number],
    meaningfulTotal: a.meaningfulTotal.value,
    meaningfulMonthly: a.meaningfulMonthly.value,
    accuracy: a.accuracy.value,
    fee: {
      operationalFee: prepaymentFee.operationalFee.value,
      timeDiscounts: prepaymentFee.timeDiscounts.value,
      noticeDiscount: prepaymentFee.noticeDiscount.value,
    },
  };
}

export const limits = {
  maxLtv: {
    firstHome: regulation.maxLtv.firstHome.value,
    replacementHome: regulation.maxLtv.replacementHome.value,
    additionalHome: regulation.maxLtv.additionalHome.value,
  },
  maxPaymentToIncome: regulation.maxPaymentToIncome.value,
  recommendedPaymentToIncome: regulation.recommendedPaymentToIncome.value,
  maxTermYears: regulation.maxTermYears.value,
};

export const purchaseTaxBrackets = {
  singleHome: purchaseTaxData.singleHome.brackets.value as TaxBracket[],
  additionalHome: purchaseTaxData.additionalHome.brackets.value as TaxBracket[],
  validFrom: purchaseTaxData.validFrom.value,
};

export const datasets = { rates, assumptions, prepaymentFee, regulation, purchaseTax: purchaseTaxData };

/** Every sourced value in every dataset, with its JSON path. */
export function sourcedValues(): { file: string; path: string; entry: Sourced }[] {
  const out: { file: string; path: string; entry: Sourced }[] = [];
  const walk = (file: string, node: unknown, path: string) => {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    if ('value' in node) {
      out.push({ file, path, entry: node as Sourced });
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(file, v, path ? `${path}.${k}` : k);
  };
  for (const [file, data] of Object.entries(datasets)) walk(file, data, '');
  return out;
}

export const unverified = () => sourcedValues().filter((v) => v.entry.TODO_VERIFY);
