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
  indexedSpitzer,
  partialPrepayment,
  payment,
  purchaseTax,
  upfrontCosts,
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

/** "3 שנים ו־4 חודשים", "8 חודשים", "5 שנים". */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const yy = y === 1 ? 'שנה' : y === 2 ? 'שנתיים' : `${y} שנים`;
  const mm = m === 1 ? 'חודש' : `${m} חודשים`;
  if (y === 0) return m === 0 ? '0 חודשים' : mm;
  return m === 0 ? yy : `${yy} ו־${mm}`;
}

/* ---------- Partial prepayment ---------- */
export interface PrepayState {
  balance: number;
  rate: number; // percent
  years: number;
  lump: number;
}
export function prepayView(s: PrepayState): CalcView {
  const months = Math.round(s.years) * 12;
  const r = partialPrepayment({ balance: s.balance, annualRate: pctIn(s.rate), monthsRemaining: months, lumpSum: s.lump });
  const capped = s.lump > s.balance;
  return {
    out: {
      shortenTime: formatDuration(r.shorten.monthsSaved),
      shortenMonths: formatDuration(r.shorten.months),
      shortenInterest: formatILS(Math.round(r.shorten.interestSaved)),
      lowerPayment: formatILS(Math.round(r.lower.payment)),
      lowerSaving: formatILS(Math.round(r.lower.monthlySaving)),
      lowerInterest: formatILS(Math.round(r.lower.interestSaved)),
      current: formatILS(Math.round(r.currentPayment)),
      note: capped ? 'הסכום שהוזן גבוה מהיתרה, ולכן החישוב מניח פירעון מלא.' : 'לפני עמלת פירעון מוקדם, שתלויה במסלולים שלכם.',
    },
    counts: { shortenInterest: Math.round(r.shorten.interestSaved) },
  };
}

/* ---------- CPI linkage ---------- */
export interface CpiState {
  loan: number;
  rate: number; // real rate, percent
  years: number;
  inflation: number; // percent
}
export const CPI_SCENARIOS = [0, 2, 4, 6] as const;
export function cpiView(s: CpiState): CalcView {
  const n = Math.round(s.years) * 12;
  const r = pctIn(s.rate);
  const x = indexedSpitzer(s.loan, r, n, pctIn(s.inflation));
  const extra = x.totalPaid - x.unindexedTotal;
  return {
    out: {
      first: formatILS(Math.round(x.firstPayment)),
      last: formatILS(Math.round(x.lastPayment)),
      flat: formatILS(Math.round(x.unindexedPayment)),
      total: formatILS(Math.round(x.totalPaid)),
      extra: formatILS(Math.round(extra)),
      growth: formatPercent(x.lastPayment / x.firstPayment - 1, 0),
    },
    rows: {
      scenarios: CPI_SCENARIOS.map((g) => {
        const y = indexedSpitzer(s.loan, r, n, pctIn(g));
        return [`${g}% בשנה`, formatILS(Math.round(y.firstPayment)), formatILS(Math.round(y.lastPayment)), formatILS(Math.round(y.totalPaid)), formatILS(Math.round(y.totalPaid - y.unindexedTotal))];
      }),
    },
    counts: { extra: Math.round(extra) },
  };
}

/* ---------- Up-front costs of buying ---------- */
export interface UpfrontState {
  price: number;
  type: 'firstHome' | 'replacementHome' | 'additionalHome';
  broker: 'yes' | 'no';
}
export interface UpfrontOpts {
  ltv: Record<UpfrontState['type'], number>;
  tax: Record<'singleHome' | 'additionalHome', TaxBracket[]>;
  lawyerRate: number;
  brokerRate: number;
  vatRate: number;
  mortgageFees: number;
}
export function upfrontView(s: UpfrontState, o: UpfrontOpts): CalcView {
  const tax = purchaseTax(s.price, o.tax[s.type === 'additionalHome' ? 'additionalHome' : 'singleHome']).total;
  const r = upfrontCosts({
    price: s.price,
    maxLtv: o.ltv[s.type],
    purchaseTax: tax,
    lawyerRate: o.lawyerRate,
    brokerRate: s.broker === 'yes' ? o.brokerRate : 0,
    vatRate: o.vatRate,
    mortgageFees: o.mortgageFees,
  });
  const up = (n: number) => formatILS(Math.ceil(n / 1000) * 1000);
  return {
    out: {
      cash: up(r.cashNeeded),
      equity: up(r.minEquityForPrice),
      costs: up(r.costsTotal),
      loan: formatILS(Math.floor(r.maxLoan / 1000) * 1000),
      tax: formatILS(Math.round(r.purchaseTax)),
      lawyer: formatILS(Math.round(r.lawyer)),
      broker: formatILS(Math.round(r.broker)),
      fees: formatILS(Math.round(r.mortgageFees)),
      share: formatPercent(r.cashShareOfPrice, 1),
    },
    counts: { cash: Math.ceil(r.cashNeeded / 1000) * 1000 },
  };
}
