/**
 * View models for the secondary calculators. Like refinanceView, each function renders the
 * static HTML at build time and updates the page in the browser from the same code.
 * Output keys map to [data-out="key"] elements; `rows` keys map to [data-rows="key"] tbodies.
 */
import {
  affordability,
  equalPrincipalSchedule,
  estimateFixedTrackFee,
  formatILS,
  formatNumber,
  formatPercent,
  payment,
  purchaseTax,
  spitzerSchedule,
  yearly,
  type PrepaymentFeeParams,
  type TaxBracket,
} from '../../lib/mortgage';

export interface CalcView {
  out: Record<string, string>;
  rows?: Record<string, string[][]>;
  /** Numbers for count-up on [data-count="key"] elements. */
  counts?: Record<string, number>;
}

const pctIn = (p: number) => p / 100;

/* ---------- Monthly payment ---------- */
export interface MonthlyState {
  loan: number;
  rate: number; // percent
  years: number;
}
export function monthlyView(s: MonthlyState): CalcView {
  const n = Math.round(s.years) * 12;
  const r = pctIn(s.rate);
  const sp = spitzerSchedule(s.loan, r, n);
  const ks = equalPrincipalSchedule(s.loan, r, n);
  const p = payment(s.loan, r, n);
  return {
    out: {
      payment: formatILS(p),
      total: formatILS(sp.totalPaid),
      interest: formatILS(sp.totalInterest),
      ksFirst: formatILS(ks.firstPayment),
      ksLast: formatILS(ks.lastPayment),
      ksInterest: formatILS(ks.totalInterest),
      ksSaving: formatILS(sp.totalInterest - ks.totalInterest),
    },
    counts: { payment: Math.round(p) },
  };
}

/* ---------- Prepayment fee ---------- */
export interface FeeState {
  balance: number;
  contract: number; // percent
  market: number; // percent
  years: number;
  elapsed: number;
  notice: boolean;
}
export function feeView(s: FeeState, params: PrepaymentFeeParams): CalcView {
  const f = estimateFixedTrackFee(
    { balance: s.balance, contractRate: pctIn(s.contract), marketRate: pctIn(s.market), monthsRemaining: Math.round(s.years) * 12, yearsElapsed: s.elapsed, gaveNotice: s.notice },
    params,
  );
  const why =
    s.market >= s.contract
      ? 'הריבית היום לא נמוכה מהריבית בחוזה, ולכן אין עמלת היוון. נשארת רק עמלה תפעולית.'
      : 'הריבית היום נמוכה מהריבית בחוזה, ולכן הבנק גובה את ההפרש (עמלת היוון), בניכוי ההנחות.';
  return {
    out: {
      total: formatILS(Math.round(f.total)),
      capitalization: formatILS(Math.round(f.capitalization)),
      timeDiscount: f.timeDiscount > 0 ? `−${formatILS(Math.round(f.timeDiscount))}` : formatILS(0),
      noticeFee: formatILS(Math.round(f.noticeFee)),
      operational: formatILS(f.operational),
      why,
    },
    counts: { total: Math.round(f.total) },
  };
}

/* ---------- Purchase tax ---------- */
export interface TaxState {
  price: number;
  type: 'singleHome' | 'additionalHome';
}
export function taxView(s: TaxState, tables: Record<TaxState['type'], TaxBracket[]>): CalcView {
  const t = purchaseTax(s.price, tables[s.type]);
  return {
    out: {
      total: formatILS(Math.round(t.total)),
      effective: formatPercent(t.effectiveRate),
      net: formatILS(Math.round(s.price + t.total)),
    },
    rows: {
      lines: t.lines.map((l) => [
        l.to === Infinity ? `מעל ${formatILS(l.from)}` : `${formatILS(l.from)}–${formatILS(l.to)}`,
        formatPercent(l.rate, 1),
        formatILS(Math.round(l.taxable)),
        formatILS(Math.round(l.tax)),
      ]),
    },
    counts: { total: Math.round(t.total) },
  };
}

/* ---------- How much mortgage ---------- */
export interface AffordState {
  income: number;
  obligations: number;
  equity: number;
  years: number;
  type: 'firstHome' | 'replacementHome' | 'additionalHome';
}
export function affordView(s: AffordState, o: { rate: number; pti: number; ltv: Record<AffordState['type'], number> }): CalcView {
  const a = affordability({
    netIncome: s.income,
    obligations: s.obligations,
    equity: s.equity,
    annualRate: o.rate,
    months: Math.round(s.years) * 12,
    maxPaymentToIncome: o.pti,
    maxLtv: o.ltv[s.type],
  });
  const monthly = a.loanAtMaxPrice > 0 ? payment(a.loanAtMaxPrice, o.rate, Math.round(s.years) * 12) : 0;
  const binding =
    a.binding === 'income'
      ? `ההכנסה היא הגבול: החזר של עד ${formatILS(Math.round(a.maxPayment))} בחודש (${formatNumber(o.pti * 100)}% מההכנסה הפנויה).`
      : `ההון העצמי הוא הגבול: אפשר לממן עד ${formatNumber(o.ltv[s.type] * 100)}% משווי הדירה.`;
  return {
    out: {
      maxPrice: formatILS(Math.floor(a.maxPrice / 1000) * 1000),
      loan: formatILS(Math.floor(a.loanAtMaxPrice / 1000) * 1000),
      monthly: formatILS(Math.round(monthly)),
      binding,
      rate: formatPercent(o.rate),
    },
    counts: { maxPrice: Math.floor(a.maxPrice / 1000) * 1000 },
  };
}

/* ---------- Amortization: Spitzer vs equal principal ---------- */
export function amortView(s: MonthlyState): CalcView {
  const n = Math.round(s.years) * 12;
  const r = pctIn(s.rate);
  const sp = spitzerSchedule(s.loan, r, n);
  const ks = equalPrincipalSchedule(s.loan, r, n);
  const ys = yearly(sp);
  const yk = yearly(ks);
  return {
    out: {
      diff: formatILS(Math.round(sp.totalInterest - ks.totalInterest)),
      spFirst: formatILS(sp.firstPayment),
      spLast: formatILS(sp.lastPayment),
      spInterest: formatILS(sp.totalInterest),
      ksFirst: formatILS(ks.firstPayment),
      ksLast: formatILS(ks.lastPayment),
      ksInterest: formatILS(ks.totalInterest),
    },
    rows: {
      years: ys.map((row, i) => [
        String(i + 1),
        formatILS(row.payment),
        formatILS(row.interest),
        formatILS(row.balance),
        formatILS(yk[i]!.payment),
        formatILS(yk[i]!.interest),
        formatILS(yk[i]!.balance),
      ]),
    },
    counts: { diff: Math.round(sp.totalInterest - ks.totalInterest) },
  };
}
