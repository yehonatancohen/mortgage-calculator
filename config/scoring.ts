/**
 * Lead scoring configuration. SERVER-ONLY: never import this from client code.
 * Tune thresholds and weights here; lib/scoring/score.ts holds the logic.
 * Recalibrate from advisor outcomes (contacted / meeting / closed / not relevant) in /admin.
 */
export const scoring = {
  version: '2026-09-22',

  hardFilters: {
    minBalance: 300_000,
    requireVerifiedPhone: true,
  },

  /** Group weights; must sum to 100. */
  weights: { value: 35, fit: 30, intent: 35 },

  value: {
    /** Share of the group for each signal (sum to 1). */
    mix: { balance: 0.5, savings: 0.5 },
    /** Linear scale: at `from` → 0, at `to` → 1. */
    balance: { from: 300_000, to: 2_000_000 },
    /** Mid of the net savings range (or half the "up to" figure). */
    savings: { from: 0, to: 150_000 },
  },

  fit: {
    mix: { rateGap: 0.5, yearsRemaining: 0.25, lowFee: 0.25 },
    /** Current rate minus benchmark, in percentage points. */
    rateGapPp: { from: 0, to: 1.5 },
    /** Full credit at or above this many years remaining; linear below. */
    yearsRemainingFull: 10,
    /** Estimated fee (high end) as % of balance: 0% → 1, `feePctWorst`% → 0. */
    feePctWorst: 3,
  },

  intent: {
    mix: { timing: 0.4, goal: 0.2, answered: 0.2, entryPage: 0.2 },
    timing: { now: 1, months: 0.6, checking: 0.2 } as Record<string, number>,
    goal: { lower: 0.9, shorten: 0.9, consolidate: 0.8, cashout: 0.7, unknown: 0.4, none: 0.3 } as Record<string, number>,
    /** Entry page rules; first match wins, fallback `otherEntryPage`. */
    entryPages: [
      { exact: '/', score: 1 },
      { prefix: '/banks/', score: 1 },
      { prefix: '/calculators/prepayment-fee/', score: 0.9 },
      { prefix: '/guides/', score: 0.6 },
      { prefix: '/calculators/', score: 0.6 },
    ] as ({ prefix: string; score: number } | { exact: string; score: number })[],
    otherEntryPage: 0.4,
  },

  tiers: { A: 70, B: 45 },

  /** Buyer leads (how-much-mortgage path): simple rules; reviewed manually unless clearly strong. */
  buyer: {
    minLoan: 400_000,
    tierAWhen: { timing: 'now', minLoan: 800_000 },
  },
} as const;

export type ScoringConfig = typeof scoring;
