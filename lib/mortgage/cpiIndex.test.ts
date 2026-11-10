import { describe, expect, it } from 'vitest';
import { cpiActualGrowth, type CpiMonth } from '.';
import { cpiIndex } from '../data';

describe('cpiActualGrowth', () => {
  const series = cpiIndex.series as CpiMonth[];

  it('chains the real CBS series to known cumulative figures', () => {
    expect(cpiActualGrowth(series, 12).cumulativePct).toBeCloseTo(1.6986, 3);
    expect(cpiActualGrowth(series, 36).cumulativePct).toBeCloseTo(7.9535, 3);
    expect(cpiActualGrowth(series, 60).cumulativePct).toBeCloseTo(17.4987, 3);
    expect(cpiActualGrowth(series, 96).cumulativePct).toBeCloseTo(19.9702, 3);
  });

  it('reports the real from/to period', () => {
    const g = cpiActualGrowth(series, 12);
    expect(g).toMatchObject({ fromYear: 2025, fromMonth: 9, toYear: 2026, toMonth: 9 });
  });

  it('matches hand-chaining three known monthly changes', () => {
    const tiny: CpiMonth[] = [
      { year: 2024, month: 1, percentMoM: 0 },
      { year: 2024, month: 2, percentMoM: 1 },
      { year: 2024, month: 3, percentMoM: 2 },
      { year: 2024, month: 4, percentMoM: -1 },
    ];
    // (1.01 * 1.02 * 0.99 - 1) * 100
    expect(cpiActualGrowth(tiny, 3).cumulativePct).toBeCloseTo(1.9898, 3);
  });

  it('rejects an out-of-range window', () => {
    expect(() => cpiActualGrowth(series, 0)).toThrow();
    expect(() => cpiActualGrowth(series, series.length)).toThrow();
  });
});
