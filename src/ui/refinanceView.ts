/**
 * View model for the refinance calculator. The SAME function renders the static HTML at build
 * time and updates the page in the browser, so hydration never changes a single character.
 */
import {
  formatILS,
  formatILSRange,
  formatPercent,
  headline,
  refinanceSavings,
  type Goal,
  type RefinanceAssumptions,
  type TakenBucket,
  type YesNoUnknown,
} from '../../lib/mortgage';

export interface RefiState {
  balance: number;
  payment: number;
  years: number;
  taken?: TakenBucket;
  hasFixed?: YesNoUnknown;
  goal?: Goal;
}

export interface RefiData {
  assumptions: RefinanceAssumptions;
  minBalance: number;
  ratesPeriod: string;
}

export type FigureKind = 'range' | 'upTo' | 'none' | 'invalid';

export interface RefiView {
  kind: FigureKind;
  invalidReason: 'payment_too_low' | 'payment_too_high' | 'invalid_input' | null;
  /** Line above the figure. */
  label: string;
  /** Numbers for the figure (count-up animates between these). */
  low: number;
  high: number;
  /** Rendered figure text (for kind range/upTo). */
  figure: string;
  /** One honest sentence for kind none/invalid. */
  sentence: string;
  /** Secondary line under the figure. */
  sub: string;
  /** Compact text for the sticky footer. */
  preview: string;
  previewLabel: string;
  /** Before/after monthly payment. */
  todayText: string;
  afterText: string;
  afterPct: number;
  assumptions: string[];
  accuracy: number;
  answered: number;
  qualifies: boolean;
  /** Screen-reader summary (one sentence). */
  announce: string;
}

const pctRound = (n: number) => Math.round(n * 1000) / 10;
/** Isolate a figure or range as LTR inside Hebrew text (LRI … PDI), so ranges always read low→high. */
const ltr = (s: string) => `⁦${s}⁩`;

export function refinanceView(s: RefiState, d: RefiData): RefiView {
  const a = d.assumptions;
  const r = refinanceSavings({ balance: s.balance, monthlyPayment: s.payment, months: Math.max(1, Math.round(s.years)) * 12, taken: s.taken, hasFixed: s.hasFixed, goal: s.goal }, a);

  const base = {
    low: 0,
    high: 0,
    figure: '',
    sentence: '',
    sub: '',
    todayText: formatILS(s.payment),
    afterText: '—',
    afterPct: 100,
    accuracy: a.accuracy.base,
    answered: 0,
  };

  if (!r.ok) {
    const sentence = r.reason === 'payment_too_low' ? 'ההחזר נמוך מדי ליתרה ולתקופה.' : r.reason === 'payment_too_high' ? 'ההחזר גבוה מאוד ליתרה ולתקופה.' : 'חסרים נתונים.';
    return {
      ...base,
      kind: 'invalid',
      invalidReason: r.reason,
      label: 'כדאי לבדוק את הנתונים',
      sentence,
      preview: '—',
      previewLabel: 'חיסכון אפשרי',
      assumptions: [],
      qualifies: false,
      announce: `${sentence} כדאי לבדוק את הנתונים.`,
    };
  }

  const h = headline(r);
  const afterMid = (r.newPayment.low + r.newPayment.high) / 2;
  const afterPct = Math.max(4, Math.min(100, (afterMid / s.payment) * 100));
  const bandPp = formatNumberPp((r.newRate.high - r.newRate.low) / 2);
  const assumptions = [
    `הריבית האפקטיבית שלך לפי הנתונים: כ־${formatPercent(r.currentRate)}.`,
    `ריבית למשכנתא חדשה: ${ltr(`${formatPercent(r.newRate.low)}–${formatPercent(r.newRate.high)}`)} (ממוצע שוק ${formatPercent(a.benchmarkRate)} ±${bandPp}, נתוני ${d.ratesPeriod}).`,
    `עמלת פירעון מוקדם משוערת: ${ltr(formatILSRange(roundDown(r.fee.low, 10), roundUp(r.fee.high, 10)))}.`,
    `עלויות מעבר (שמאות, פתיחת תיק ורישום): ${ltr(formatILSRange(r.switchingCosts.low, r.switchingCosts.high))}.`,
    'החישוב לא כולל הצמדה למדד. אם חלק מהמשכנתא צמוד, ההחזר בפועל ישתנה עם המדד.',
  ];
  const common = {
    ...base,
    invalidReason: null,
    todayText: formatILS(s.payment),
    afterText: formatILSRange(roundDown(r.newPayment.low, 10), roundDown(r.newPayment.high, 10)),
    afterPct: pctRound(afterPct / 100),
    assumptions,
    accuracy: r.accuracy,
    answered: r.answered,
    previewLabel: 'חיסכון אפשרי',
  };

  if (h.kind === 'none') {
    return {
      ...common,
      kind: 'none',
      label: 'חיסכון אפשרי לאורך התקופה',
      sentence: 'כרגע מחזור לא צפוי לחסוך לך סכום משמעותי.',
      sub: `הריבית שלך (כ־${formatPercent(r.currentRate)}) כבר קרובה לממוצע בשוק.`,
      preview: 'אין חיסכון משמעותי',
      qualifies: false,
      announce: `כרגע מחזור לא צפוי לחסוך סכום משמעותי. הריבית שלך כ־${formatPercent(r.currentRate)}.`,
    };
  }

  const qualifies = s.balance >= d.minBalance;
  if (h.kind === 'upTo') {
    const figure = formatILS(h.high);
    return {
      ...common,
      kind: 'upTo',
      label: 'חיסכון אפשרי לאורך התקופה, עד',
      low: h.high,
      high: h.high,
      figure,
      sub: h.monthlyHigh > 0 ? `עד כ־${formatILS(h.monthlyHigh)} פחות בחודש` : '',
      preview: `עד ${figure}`,
      qualifies,
      announce: `חיסכון אפשרי של עד ${figure} לאורך התקופה.`,
    };
  }
  const figure = formatILSRange(h.low, h.high);
  return {
    ...common,
    kind: 'range',
    label: 'חיסכון אפשרי לאורך התקופה',
    low: h.low,
    high: h.high,
    figure,
    sub: `כ־${ltr(formatILSRange(h.monthlyLow, h.monthlyHigh))} פחות בחודש`,
    preview: figure,
    qualifies,
    announce: `חיסכון אפשרי של ${figure} לאורך התקופה.`,
  };
}

const roundDown = (n: number, step: number) => Math.floor(n / step) * step;
const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;
const formatNumberPp = (fraction: number) => `${(Math.round(fraction * 1000) / 10).toFixed(1)}%`;

/** URL <-> state. Short keys keep shared links readable. */
const TAKEN_KEYS = ['before2015', '2015to2019', '2020to2022', 'since2023', 'unknown'] as const;
const YNU_KEYS = ['yes', 'no', 'unknown'] as const;
const GOAL_KEYS = ['lower', 'shorten', 'consolidate', 'cashout', 'unknown'] as const;

export function stateFromParams(p: URLSearchParams, defaults: RefiState, bounds: { balance: [number, number]; payment: [number, number]; years: [number, number] }): RefiState {
  const n = (k: string, [min, max]: [number, number], fallback: number) => {
    const v = Number(p.get(k));
    return p.has(k) && Number.isFinite(v) && v >= min && v <= max ? Math.round(v) : fallback;
  };
  const pick = <T extends readonly string[]>(k: string, list: T) => {
    const v = p.get(k);
    return v && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined;
  };
  return {
    balance: n('b', bounds.balance, defaults.balance),
    payment: n('p', bounds.payment, defaults.payment),
    years: n('y', bounds.years, defaults.years),
    taken: pick('t', TAKEN_KEYS),
    hasFixed: pick('f', YNU_KEYS),
    goal: pick('g', GOAL_KEYS),
  };
}

export function paramsFromState(s: RefiState, step: string): URLSearchParams {
  const p = new URLSearchParams();
  p.set('b', String(s.balance));
  p.set('p', String(s.payment));
  p.set('y', String(s.years));
  if (s.taken) p.set('t', s.taken);
  if (s.hasFixed) p.set('f', s.hasFixed);
  if (s.goal) p.set('g', s.goal);
  if (step !== 'inputs') p.set('s', step);
  return p;
}
