/** Refinance calculator: defaults, input ranges and slider steps. */
export const REFI = {
  defaults: { balance: 800_000, payment: 5_200, years: 20 },
  balance: { min: 100_000, max: 3_000_000, step: 10_000 },
  payment: { min: 1_000, max: 25_000, step: 50 },
  years: { min: 1, max: 30, step: 1 },
} as const;
