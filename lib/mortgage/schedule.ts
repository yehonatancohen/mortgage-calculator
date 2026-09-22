import { monthlyRate, payment } from './annuity';

export interface ScheduleRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}

export interface Schedule {
  rows: ScheduleRow[];
  totalPaid: number;
  totalInterest: number;
  firstPayment: number;
  lastPayment: number;
}

/** Spitzer (annuity): equal payments, interest share falls over time. */
export function spitzerSchedule(principal: number, annualRate: number, months: number): Schedule {
  const i = monthlyRate(annualRate);
  const p = payment(principal, annualRate, months);
  const rows: ScheduleRow[] = [];
  let bal = principal;
  for (let m = 1; m <= months; m++) {
    const interest = bal * i;
    // Last row absorbs floating-point drift so the balance lands on exactly 0.
    const princ = m === months ? bal : p - interest;
    bal = m === months ? 0 : bal - princ;
    rows.push({ month: m, payment: interest + princ, interest, principal: princ, balance: bal });
  }
  return summarize(rows);
}

/** Equal principal (קרן שווה): fixed principal share, payments fall over time. */
export function equalPrincipalSchedule(principal: number, annualRate: number, months: number): Schedule {
  if (!Number.isInteger(months) || months < 1) throw new RangeError('months must be a positive integer');
  const i = monthlyRate(annualRate);
  const princ = principal / months;
  const rows: ScheduleRow[] = [];
  let bal = principal;
  for (let m = 1; m <= months; m++) {
    const interest = bal * i;
    const pr = m === months ? bal : princ;
    bal = m === months ? 0 : bal - pr;
    rows.push({ month: m, payment: interest + pr, interest, principal: pr, balance: bal });
  }
  return summarize(rows);
}

/** Collapse monthly rows into yearly rows (for display tables). */
export function yearly(schedule: Schedule): ScheduleRow[] {
  const out: ScheduleRow[] = [];
  for (let k = 0; k < schedule.rows.length; k += 12) {
    const chunk = schedule.rows.slice(k, k + 12);
    const last = chunk[chunk.length - 1]!;
    out.push({
      month: last.month,
      payment: sum(chunk, 'payment'),
      interest: sum(chunk, 'interest'),
      principal: sum(chunk, 'principal'),
      balance: last.balance,
    });
  }
  return out;
}

function summarize(rows: ScheduleRow[]): Schedule {
  const totalPaid = sum(rows, 'payment');
  return {
    rows,
    totalPaid,
    totalInterest: sum(rows, 'interest'),
    firstPayment: rows[0]?.payment ?? 0,
    lastPayment: rows.at(-1)?.payment ?? 0,
  };
}

const sum = (rows: ScheduleRow[], k: keyof ScheduleRow) => rows.reduce((s, r) => s + r[k], 0);
