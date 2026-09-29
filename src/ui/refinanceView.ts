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
  type RefinanceInput,
  type TakenBucket,
  type TrackType,
  type YesNoUnknown,
} from '../../lib/mortgage';

/** One mortgage track as the borrower typed it. Percent values are percents, not fractions. */
export interface TrackState {
  amount: number;
  rate: number;
  type: TrackType;
  /** Years remaining on this track; falls back to the mortgage-wide years. */
  years?: number;
  /** Prime: discount below prime. Variable: margin above the anchor. */
  margin?: number;
}

export interface RefiState {
  balance: number;
  payment: number;
  years: number;
  taken?: TakenBucket;
  hasFixed?: YesNoUnknown;
  goal?: Goal;
  /** Set only while the borrower enters the mortgage track by track. */
  tracks?: TrackState[];
  /** Prepayment fee copied from the bank's statement (₪). */
  reportedFee?: number;
}

/** The one place UI state becomes math input, shared by the browser and the lead server. */
export function toRefinanceInput(s: RefiState): RefinanceInput {
  return {
    balance: s.balance,
    monthlyPayment: s.payment,
    months: Math.max(1, Math.round(s.years)) * 12,
    taken: s.taken,
    hasFixed: s.hasFixed,
    goal: s.goal,
    reportedFee: s.reportedFee,
    tracks: s.tracks?.map((t) => ({
      balance: t.amount,
      rate: t.rate / 100,
      months: Math.max(1, Math.round(t.years ?? s.years)) * 12,
      type: t.type,
      margin: t.margin === undefined ? undefined : t.margin / 100,
    })),
  };
}

export interface RefiData {
  assumptions: RefinanceAssumptions;
  minBalance: number;
  ratesPeriod: string;
}

/**
 * typical = worth checking, with a figure for the typical case; borderline = depends on the
 * offer, no figure; none = the mortgage is fine as it is; invalid = the numbers do not add up.
 */
export type FigureKind = 'typical' | 'borderline' | 'none' | 'invalid';

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
  /** After-payment band as % of today's payment: solid to lo, lighter band from lo to hi. */
  afterLoPct: number;
  afterHiPct: number;
  /** Always-visible cost line under the bars (fee + switching costs, included in the result). */
  costs: string;
  /** Progress copy framed as an invitation ("עוד 2 שאלות כדי לדייק את ההערכה"), never as a score of how inaccurate the result is. */
  answeredText: string;
  assumptions: string[];
  accuracy: number;
  answered: number;
  qualifies: boolean;
  /** Screen-reader summary (one sentence). */
  announce: string;
}

/** Optional questions left to sharpen the estimate. Always positive framing. */
export function answeredText(answered: number, total = 3): string {
  const left = Math.max(0, total - answered);
  if (left === 0) return 'ההערכה מדויקת ככל שאפשר';
  if (left === 1) return 'עוד שאלה אחת כדי לדייק את ההערכה';
  return `עוד ${left} שאלות כדי לדייק את ההערכה`;
}

const pctRound = (n: number) => Math.round(n * 1000) / 10;
/** Isolate a figure or range as LTR inside Hebrew text (LRI … PDI), so ranges always read low→high. */
const ltr = (s: string) => `⁦${s}⁩`;

export function refinanceView(s: RefiState, d: RefiData): RefiView {
  const a = d.assumptions;
  const r = refinanceSavings(toRefinanceInput(s), a);

  const base = {
    low: 0,
    high: 0,
    figure: '',
    sentence: '',
    sub: '',
    todayText: formatILS(s.payment),
    afterText: '—',
    afterPct: 100,
    afterLoPct: 100,
    afterHiPct: 100,
    costs: '',
    answeredText: answeredText(0),
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
  const allKept = r.trackCount > 0 && r.kept.length === r.trackCount;
  const keptLines = r.kept.map(({ index, reason }) => {
    const t = s.tracks![index]!;
    const name = `מסלול ${index + 1}`;
    if (reason === 'margin') {
      const market = t.type === 'prime' ? `פריים פחות ${pctText(a.marketMargin.primeDiscount * 100)}` : `עוגן ועוד ${pctText(a.marketMargin.variable * 100)}`;
      const own = t.type === 'prime' ? `פריים פחות ${pctText(t.margin!)}` : `עוגן ועוד ${pctText(t.margin!)}`;
      return `${name}: המרווח שלך (${own}) טוב או קרוב למה שהבנקים נותנים היום (${market}). המרווח קבוע לכל התקופה, ולכן לא כללנו את המסלול במחזור.`;
    }
    return `${name}: הריבית שלו (${formatPercent(t.rate / 100)}) נמוכה מריבית השוק, ולכן לא כללנו אותו במחזור.`;
  });
  const feeLine = r.feeReported
    ? `עמלת פירעון מוקדם: ${formatILS(r.fee.mid)}, כפי שהזנת מהדוח.`
    : `עמלת פירעון מוקדם משוערת: ${ltr(formatILSRange(roundDown(r.fee.low, 10), roundUp(r.fee.high, 10)))}.`;
  const assumptions = [
    ...keptLines,
    `${r.trackCount > 0 ? 'הריבית הממוצעת של המסלולים שהזנת' : 'הריבית האפקטיבית שלך לפי הנתונים'}: כ־${formatPercent(r.currentRate)}.`,
    `ריבית למשכנתא חדשה: ${ltr(`${formatPercent(r.newRate.low)}–${formatPercent(r.newRate.high)}`)}. ההחלטה מתבססת על ממוצע השוק, ${formatPercent(a.benchmarkRate)} (±${bandPp}, נתוני ${d.ratesPeriod}), ולא על הקצה הטוב של הטווח.`,
    ...(allKept ? [] : [feeLine, `עלויות מעבר (שמאות, פתיחת תיק ורישום): ${ltr(formatILSRange(r.switchingCosts.low, r.switchingCosts.high))}.`]),
    'החישוב לא כולל הצמדה למדד. אם חלק מהמשכנתא צמוד, ההחזר בפועל ישתנה עם המדד.',
  ];
  const keptSub = r.kept.length > 0 && !allKept ? `${r.kept.length === 1 ? 'מסלול אחד' : `${r.kept.length} מסלולים`} לא נכלל במחזור כי התנאים שלו טובים.` : '';
  const common = {
    ...base,
    invalidReason: null,
    todayText: formatILS(s.payment),
    afterText: formatILSRange(roundDown(r.newPayment.low, 10), roundDown(r.newPayment.high, 10)),
    afterPct: pctRound(afterPct / 100),
    afterLoPct: pctRound(Math.max(0.04, Math.min(1, r.newPayment.low / s.payment))),
    afterHiPct: pctRound(Math.max(0.04, Math.min(1, r.newPayment.high / s.payment))),
    costs: allKept ? '' : `עמלת פירעון ועלויות מעבר, כלולות בחישוב: ${ltr(costsRange(r))}`,
    answeredText: answeredText(r.answered),
    assumptions,
    accuracy: r.accuracy,
    answered: r.answered,
    previewLabel: 'חיסכון אפשרי',
  };

  if (h.kind === 'none') {
    return {
      ...common,
      kind: 'none',
      label: 'המשכנתא שלך טובה',
      sentence: allKept ? 'כדאי לא לגעת בה. המרווחים והריביות שלך טובים ממה שמקבלים היום.' : 'כדאי לא לגעת בה. מחזור צפוי לעלות לך יותר ממה שיחסוך.',
      sub: allKept ? '' : `הריבית שלך (כ־${formatPercent(r.currentRate)}) נמוכה או קרובה לממוצע בשוק (${formatPercent(a.benchmarkRate)}).${keptSub ? ` ${keptSub}` : ''}`,
      preview: 'כדאי לא לגעת',
      qualifies: false,
      announce: `המשכנתא שלך טובה, כדאי לא לגעת בה. הריבית שלך כ־${formatPercent(r.currentRate)}.`,
    };
  }

  const qualifies = s.balance >= d.minBalance;
  if (h.kind === 'borderline') {
    return {
      ...common,
      kind: 'borderline',
      label: 'גבולי, תלוי בהצעה שתקבלו',
      sentence: 'ייתכן חיסכון קטן, אבל הוא תלוי בריבית שתקבלו בפועל.',
      sub: `רק בתרחיש הטוב ביותר החיסכון מגיע לכ־${formatILS(h.high)}. כדאי לבדוק הצעה לפני שמחליטים.${keptSub ? ` ${keptSub}` : ''}`,
      preview: 'גבולי',
      qualifies,
      announce: 'התוצאה גבולית ותלויה בהצעה שתקבלו. כדאי לבדוק הצעה לפני שמחליטים.',
    };
  }
  const figure = `כ־${formatILS(h.mid)}`;
  const spread = h.low < h.mid || h.high > h.mid ? ` · טווח אפשרי ${ltr(formatILSRange(h.low, h.high))}` : '';
  return {
    ...common,
    kind: 'typical',
    label: 'חיסכון משוער לאורך התקופה',
    low: h.mid,
    high: h.mid,
    figure,
    sub: `כ־${formatILS(h.monthlyMid)} פחות בחודש${spread}${keptSub ? `. ${keptSub}` : ''}`,
    preview: figure,
    qualifies,
    announce: `חיסכון משוער של ${figure} לאורך התקופה.`,
  };
}

/** Fee + switching costs, rounded outward to ₪10. One helper for the result line and the worked example. */
export function costsRange(r: { fee: { low: number; high: number }; switchingCosts: { low: number; high: number } }): string {
  return formatILSRange(roundDown(r.fee.low + r.switchingCosts.low, 10), roundUp(r.fee.high + r.switchingCosts.high, 10));
}

const roundDown = (n: number, step: number) => Math.floor(n / step) * step;
const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;
const formatNumberPp = (fraction: number) => `${(Math.round(fraction * 1000) / 10).toFixed(1)}%`;
/** A percent already expressed in percent (0.67 → "0.67%"). */
const pctText = (percent: number) => `${Number(percent.toFixed(2))}%`;

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
    reportedFee: p.has('rf') && Number.isFinite(Number(p.get('rf'))) && Number(p.get('rf')) >= 0 && Number(p.get('rf')) <= 5_000_000 ? Math.round(Number(p.get('rf'))) : undefined,
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
  if (s.reportedFee !== undefined) p.set('rf', String(s.reportedFee));
  if (step !== 'inputs') p.set('s', step);
  return p;
}
