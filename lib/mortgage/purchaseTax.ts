/**
 * Progressive purchase tax (מס רכישה). Brackets come from data/purchase-tax.json.
 * `upTo: null` marks the open-ended top bracket.
 */
export interface TaxBracket {
  upTo: number | null;
  /** Marginal rate as a fraction. */
  rate: number;
}

export interface TaxLine {
  from: number;
  to: number;
  rate: number;
  taxable: number;
  tax: number;
}

export interface PurchaseTaxResult {
  total: number;
  effectiveRate: number;
  lines: TaxLine[];
}

export function purchaseTax(price: number, brackets: TaxBracket[]): PurchaseTaxResult {
  validate(brackets);
  const lines: TaxLine[] = [];
  let from = 0;
  let total = 0;
  for (const b of brackets) {
    if (price <= from) break;
    const to = b.upTo ?? Infinity;
    const taxable = Math.min(price, to) - from;
    const tax = taxable * b.rate;
    lines.push({ from, to, rate: b.rate, taxable, tax });
    total += tax;
    from = to;
  }
  return { total, effectiveRate: price > 0 ? total / price : 0, lines };
}

function validate(brackets: TaxBracket[]) {
  if (!brackets.length) throw new Error('No purchase-tax brackets');
  let prev = 0;
  brackets.forEach((b, idx) => {
    const last = idx === brackets.length - 1;
    if (b.upTo === null && !last) throw new Error('Only the last bracket may be open-ended');
    if (b.upTo !== null && b.upTo <= prev) throw new Error('Brackets must ascend');
    if (b.upTo !== null) prev = b.upTo;
  });
  if (brackets.at(-1)?.upTo !== null) throw new Error('Last bracket must be open-ended');
}
