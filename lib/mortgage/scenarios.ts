/**
 * Scenario maths behind the secondary calculators: partial prepayment, CPI-linked
 * balances and up-front purchase costs. Same conventions as annuity.ts: nominal annual
 * rate fractions, compounded monthly.
 */
import { monthsToRepay, payment } from './annuity';

export interface PartialPrepaymentInput {
  balance: number;
  annualRate: number;
  monthsRemaining: number;
  /** Lump sum paid towards principal today (capped at the balance). */
  lumpSum: number;
}

export interface PartialPrepaymentResult {
  lumpSum: number;
  currentPayment: number;
  currentInterest: number;
  /** Keep the payment, finish sooner. */
  shorten: { months: number; monthsSaved: number; interest: number; interestSaved: number };
  /** Keep the term, pay less each month. */
  lower: { payment: number; monthlySaving: number; interest: number; interestSaved: number };
}

/** Prepayment fees are not included: they depend on the tracks (see prepaymentFee.ts). */
export function partialPrepayment(i: PartialPrepaymentInput): PartialPrepaymentResult {
  const lump = Math.min(Math.max(0, i.lumpSum), i.balance);
  const p = payment(i.balance, i.annualRate, i.monthsRemaining);
  const currentInterest = p * i.monthsRemaining - i.balance;
  const rest = i.balance - lump;

  const months = rest <= 0 ? 0 : Math.min(i.monthsRemaining, monthsToRepay(rest, i.annualRate, p));
  const shortenInterest = rest <= 0 ? 0 : Math.max(0, p * months - rest);

  const p2 = rest <= 0 ? 0 : payment(rest, i.annualRate, i.monthsRemaining);
  const lowerInterest = rest <= 0 ? 0 : p2 * i.monthsRemaining - rest;

  return {
    lumpSum: lump,
    currentPayment: p,
    currentInterest,
    shorten: { months, monthsSaved: i.monthsRemaining - months, interest: shortenInterest, interestSaved: currentInterest - shortenInterest },
    lower: { payment: p2, monthlySaving: p - p2, interest: lowerInterest, interestSaved: currentInterest - lowerInterest },
  };
}

export interface IndexedResult {
  /** Monthly payment at the start of each year (index 0 = first month). */
  yearlyPayments: number[];
  firstPayment: number;
  lastPayment: number;
  totalPaid: number;
  /** Same loan with no indexation, for comparison. */
  unindexedPayment: number;
  unindexedTotal: number;
}

/**
 * CPI-linked Spitzer loan under a constant annual inflation. The balance is indexed every
 * month by (1+g)^(1/12) and the payment is recomputed on the indexed balance for the months
 * left, which is how linked annuity loans behave. `realRate` is the loan's stated (real) rate.
 */
export function indexedSpitzer(principal: number, realRate: number, months: number, annualInflation: number): IndexedResult {
  const g = Math.pow(1 + annualInflation, 1 / 12);
  const i = realRate / 12;
  let bal = principal;
  let total = 0;
  const yearlyPayments: number[] = [];
  let first = 0;
  let last = 0;
  for (let k = 0; k < months; k++) {
    bal *= g;
    const pay = payment(bal, realRate, months - k);
    if (k % 12 === 0) yearlyPayments.push(pay);
    if (k === 0) first = pay;
    last = pay;
    bal -= pay - bal * i;
    total += pay;
  }
  const flat = payment(principal, realRate, months);
  return { yearlyPayments, firstPayment: first, lastPayment: last, totalPaid: total, unindexedPayment: flat, unindexedTotal: flat * months };
}

export interface UpfrontCostsInput {
  price: number;
  /** Maximum financing share for this buyer (fraction). */
  maxLtv: number;
  purchaseTax: number;
  lawyerRate: number;
  brokerRate: number;
  vatRate: number;
  /** Appraisal, file opening and lien registration for the new mortgage. */
  mortgageFees: number;
}

export interface UpfrontCostsResult {
  minEquityForPrice: number;
  maxLoan: number;
  purchaseTax: number;
  lawyer: number;
  broker: number;
  mortgageFees: number;
  costsTotal: number;
  /** Cash needed on the day: equity share plus all costs. */
  cashNeeded: number;
  cashShareOfPrice: number;
}

export function upfrontCosts(i: UpfrontCostsInput): UpfrontCostsResult {
  const minEquityForPrice = i.price * (1 - i.maxLtv);
  const lawyer = i.price * i.lawyerRate * (1 + i.vatRate);
  const broker = i.price * i.brokerRate * (1 + i.vatRate);
  const costsTotal = i.purchaseTax + lawyer + broker + i.mortgageFees;
  const cashNeeded = minEquityForPrice + costsTotal;
  return {
    minEquityForPrice,
    maxLoan: i.price * i.maxLtv,
    purchaseTax: i.purchaseTax,
    lawyer,
    broker,
    mortgageFees: i.mortgageFees,
    costsTotal,
    cashNeeded,
    cashShareOfPrice: i.price > 0 ? cashNeeded / i.price : 0,
  };
}
