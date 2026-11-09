/**
 * Actual (not hypothetical) cumulative CPI change over a real elapsed period, for the
 * "what actually happened to my linked balance" section of the CPI-linkage calculator —
 * as opposed to indexedSpitzer's constant-inflation scenarios.
 *
 * Chains the series's own month-over-month % change rather than dividing two indexValue
 * levels, because CBS periodically rebases the index (data/cpi-index.json carries more than
 * one indexBase), so raw index levels from different bases are not comparable by division.
 */
export interface CpiMonth {
  year: number;
  month: number;
  percentMoM: number;
}

export interface CpiActualGrowth {
  monthsBack: number;
  cumulativePct: number;
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

export function cpiActualGrowth(series: readonly CpiMonth[], monthsBack: number): CpiActualGrowth {
  if (monthsBack <= 0 || monthsBack >= series.length) throw new Error(`monthsBack must be between 1 and ${series.length - 1}`);
  const recent = series.slice(series.length - monthsBack);
  let factor = 1;
  for (const m of recent) factor *= 1 + m.percentMoM / 100;
  const from = series[series.length - 1 - monthsBack];
  const to = series[series.length - 1];
  if (!from || !to) throw new Error('series too short for the requested window');
  return {
    monthsBack,
    cumulativePct: (factor - 1) * 100,
    fromYear: from.year,
    fromMonth: from.month,
    toYear: to.year,
    toMonth: to.month,
  };
}
