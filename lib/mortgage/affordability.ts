import { principalFor } from './annuity';

export interface AffordabilityInput {
  /** Household net monthly income, ₪. */
  netIncome: number;
  /** Existing monthly obligations (other loans), ₪. */
  obligations: number;
  /** Own equity available, ₪. */
  equity: number;
  annualRate: number;
  months: number;
  /** Max share of net income that may go to loan payments (fraction). */
  maxPaymentToIncome: number;
  /** Max loan-to-value for this buyer type (fraction). */
  maxLtv: number;
}

export interface AffordabilityResult {
  maxPayment: number;
  /** Largest loan the payment limit allows. */
  maxLoanByIncome: number;
  /** Highest property price reachable: limited by equity/LTV and by income. */
  maxPrice: number;
  /** Loan at that price. */
  loanAtMaxPrice: number;
  binding: 'income' | 'equity';
}

/**
 * How much mortgage can you get: the loan is capped by the payment-to-income
 * limit, and the property price by LTV (price × (1 − LTV) ≤ equity).
 * Purchase costs (tax, lawyer, broker) are not deducted here; callers pass
 * equity net of those if they want them included.
 */
export function affordability(i: AffordabilityInput): AffordabilityResult {
  const maxPayment = Math.max(0, i.netIncome * i.maxPaymentToIncome - i.obligations);
  const maxLoanByIncome = principalFor(maxPayment, i.annualRate, i.months);
  const priceByEquity = i.maxLtv < 1 ? i.equity / (1 - i.maxLtv) : Infinity;
  const priceByIncome = i.equity + maxLoanByIncome;
  const maxPrice = Math.min(priceByEquity, priceByIncome);
  return {
    maxPayment,
    maxLoanByIncome,
    maxPrice,
    loanAtMaxPrice: Math.max(0, maxPrice - i.equity),
    binding: priceByIncome <= priceByEquity ? 'income' : 'equity',
  };
}
