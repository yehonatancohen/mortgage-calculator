/**
 * Lead scoring. Pure: takes numbers recomputed on the server plus the config.
 * The score and tier are never returned to the visitor.
 */
import type { ScoringConfig } from '../../config/scoring';

export interface RefinanceLeadFacts {
  balance: number;
  months: number;
  phoneVerified: boolean;
  /** Solved current rate and the benchmark (fractions). null when the inputs were impossible. */
  currentRate: number | null;
  benchmarkRate: number;
  netSavingsLow: number | null;
  netSavingsHigh: number | null;
  feeHigh: number | null;
  timing: string | null;
  goal: string | null;
  answered: number;
  entryPage: string;
}

export interface ScoreResult {
  total: number;
  groups: { value: number; fit: number; intent: number };
  signals: Record<string, number>;
  hardFilterPass: boolean;
  hardFilterReasons: string[];
  tier: 'A' | 'B' | 'C';
}

const lin = (x: number, from: number, to: number) => (to === from ? 0 : Math.min(1, Math.max(0, (x - from) / (to - from))));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function scoreRefinanceLead(f: RefinanceLeadFacts, cfg: ScoringConfig): ScoreResult {
  const reasons: string[] = [];
  if (f.balance < cfg.hardFilters.minBalance) reasons.push('balance_below_minimum');
  if (cfg.hardFilters.requireVerifiedPhone && !f.phoneVerified) reasons.push('phone_not_verified');

  let savingsMid = 0;
  if (f.netSavingsHigh !== null) {
    savingsMid = f.netSavingsLow !== null && f.netSavingsLow > 0 ? (f.netSavingsLow + f.netSavingsHigh) / 2 : f.netSavingsHigh / 2;
  }

  const s = {
    balance: lin(f.balance, cfg.value.balance.from, cfg.value.balance.to),
    savings: lin(savingsMid, cfg.value.savings.from, cfg.value.savings.to),
    rateGap: f.currentRate === null ? 0 : lin((f.currentRate - f.benchmarkRate) * 100, cfg.fit.rateGapPp.from, cfg.fit.rateGapPp.to),
    yearsRemaining: Math.min(1, f.months / 12 / cfg.fit.yearsRemainingFull),
    lowFee: f.feeHigh === null || f.balance <= 0 ? 0.5 : 1 - lin((f.feeHigh / f.balance) * 100, 0, cfg.fit.feePctWorst),
    timing: f.timing ? (cfg.intent.timing[f.timing] ?? 0) : 0,
    goal: cfg.intent.goal[f.goal ?? 'none'] ?? 0,
    answered: Math.min(1, f.answered / 3),
    entryPage: entryScore(f.entryPage, cfg),
  };

  const vm = cfg.value.mix;
  const fm = cfg.fit.mix;
  const im = cfg.intent.mix;
  const value = cfg.weights.value * (vm.balance * s.balance + vm.savings * s.savings);
  const fit = cfg.weights.fit * (fm.rateGap * s.rateGap + fm.yearsRemaining * s.yearsRemaining + fm.lowFee * s.lowFee);
  const intent = cfg.weights.intent * (im.timing * s.timing + im.goal * s.goal + im.answered * s.answered + im.entryPage * s.entryPage);
  const total = round1(value + fit + intent);

  const pass = reasons.length === 0;
  const tier = !pass ? 'C' : total >= cfg.tiers.A ? 'A' : total >= cfg.tiers.B ? 'B' : 'C';
  return {
    total,
    groups: { value: round1(value), fit: round1(fit), intent: round1(intent) },
    signals: Object.fromEntries(Object.entries(s).map(([k, v]) => [k, Math.round(v * 1000) / 1000])),
    hardFilterPass: pass,
    hardFilterReasons: reasons,
    tier,
  };
}

export function entryScore(path: string, cfg: ScoringConfig): number {
  for (const rule of cfg.intent.entryPages) {
    if ('exact' in rule ? path === rule.exact : path.startsWith(rule.prefix)) return rule.score;
  }
  return cfg.intent.otherEntryPage;
}

export interface BuyerLeadFacts {
  loan: number;
  phoneVerified: boolean;
  timing: string | null;
}

export function tierBuyerLead(f: BuyerLeadFacts, cfg: ScoringConfig): { tier: 'A' | 'B' | 'C'; reasons: string[] } {
  const reasons: string[] = [];
  if (!f.phoneVerified) reasons.push('phone_not_verified');
  if (f.loan < cfg.buyer.minLoan) reasons.push('loan_below_minimum');
  if (reasons.length) return { tier: 'C', reasons };
  const a = cfg.buyer.tierAWhen;
  return { tier: f.timing === a.timing && f.loan >= a.minLoan ? 'A' : 'B', reasons };
}
