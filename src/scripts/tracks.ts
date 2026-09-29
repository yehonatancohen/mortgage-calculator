/**
 * Optional per-track entry for the refinance inputs. Each track is amount + rate + type; the
 * tracks add up to the balance and monthly payment the calculator already works with, so the
 * savings math and the lead payload stay unchanged.
 */
import { formatILS, formatWhileTyping, parseAmount, payment } from '../../lib/mortgage';

export interface TrackTotals {
  balance: number;
  payment: number;
  anyFixed: boolean;
}

interface Options {
  /** Balance to seed the first track with when the user opens track entry. */
  seedBalance: () => number;
  years: () => number;
  /** Called with the summed totals whenever at least one track is complete. */
  onTotals: (t: TrackTotals) => void;
  /** Called when the last track is removed and the plain balance/payment fields return. */
  onExit: () => void;
}

const MAX_TRACKS = 6;
const AMOUNT_MAX = 20_000_000;
const RATE: [number, number] = [0.1, 20];

const parseRate = (raw: string) => {
  const n = Number(raw.replace(',', '.'));
  return raw.trim() !== '' && Number.isFinite(n) ? n : null;
};
const bdi = (text: string) => Object.assign(document.createElement('bdi'), { className: 'num', textContent: text });

export function initTracks(root: HTMLElement, opts: Options) {
  const wrap = root.querySelector<HTMLElement>('[data-tracks]')!;
  const list = wrap.querySelector<HTMLElement>('[data-track-list]')!;
  const total = wrap.querySelector<HTMLElement>('[data-tracks-total]')!;
  const tpl = wrap.querySelector<HTMLTemplateElement>('[data-track-tpl]')!;
  const addBtn = root.querySelector<HTMLButtonElement>('[data-add-track]')!;
  const singleFields = ['balance', 'payment'].map((n) => root.querySelector<HTMLElement>(`[data-field="${n}"]`)!);
  let problem: string | null = null;
  let sum = { balance: 0, pay: 0 };

  const rows = () => [...list.querySelectorAll<HTMLElement>('[data-track]')];
  const read = (row: HTMLElement) => {
    const amountEl = row.querySelector<HTMLInputElement>('[data-track-amount]')!;
    const rateEl = row.querySelector<HTMLInputElement>('[data-track-rate]')!;
    const amount = parseAmount(amountEl.value);
    const rate = parseRate(rateEl.value);
    return {
      amountEl,
      rateEl,
      blank: amountEl.value.trim() === '' && rateEl.value.trim() === '',
      amount,
      rate,
      okAmount: amount !== null && amount > 0 && amount <= AMOUNT_MAX,
      okRate: rate !== null && rate >= RATE[0] && rate <= RATE[1],
      fixed: (row.querySelector('[data-track-type]') as unknown as { value: string }).value === 'fixed',
    };
  };
  const flag = (el: HTMLInputElement, bad: boolean) => {
    el.setAttribute('aria-invalid', String(bad));
    el.closest('.amount')?.toggleAttribute('data-invalid', bad);
  };

  const syncRange = (range: HTMLInputElement, v: number | null) => {
    const lo = Number(range.min);
    const hi = Number(range.max);
    const c = Math.min(hi, Math.max(lo, v ?? lo));
    range.value = String(c);
    range.style.setProperty('--fill', `${(((c - lo) / (hi - lo)) * 100).toFixed(2)}%`);
  };
  const syncRow = (row: HTMLElement) => {
    const r = read(row);
    syncRange(row.querySelector<HTMLInputElement>('[data-track-amount-range]')!, r.amount);
    syncRange(row.querySelector<HTMLInputElement>('[data-track-rate-range]')!, r.rate);
  };

  function refresh() {
    rows().forEach((row, i) => {
      row.querySelector<HTMLElement>('[data-track-title]')!.textContent = `מסלול ${i + 1}`;
      row.querySelector<HTMLElement>('[data-track-remove]')!.setAttribute('aria-label', `הסרת מסלול ${i + 1}`);
    });
    addBtn.hidden = rows().length >= MAX_TRACKS;
  }

  function setTotal(balance: number, pay: number) {
    sum = { balance, pay };
    total.classList.toggle('tracks__total--attention', problem !== null);
    if (problem) total.textContent = problem;
    else if (balance > 0) total.replaceChildren('סה״כ: יתרה ', bdi(formatILS(balance)), ' · החזר חודשי ', bdi(formatILS(Math.round(pay))));
    else total.textContent = 'הזינו סכום וריבית לכל מסלול, ונחשב את ההחזר.';
  }

  function recompute() {
    if (!api.active()) return;
    const months = Math.max(1, Math.round(opts.years())) * 12;
    let balance = 0;
    let pay = 0;
    let anyFixed = false;
    for (const row of rows()) {
      const r = read(row);
      if (!r.okAmount || !r.okRate) continue;
      balance += r.amount!;
      pay += payment(r.amount!, r.rate! / 100, months);
      anyFixed ||= r.fixed;
    }
    setTotal(balance, pay);
    if (balance > 0) opts.onTotals({ balance: Math.round(balance), payment: Math.round(pay), anyFixed });
  }

  function addRow(amount?: number) {
    const row = (tpl.content.firstElementChild as HTMLElement).cloneNode(true) as HTMLElement;
    if (amount) row.querySelector<HTMLInputElement>('[data-track-amount]')!.value = formatILS(amount).slice(1);
    list.appendChild(row);
    syncRow(row);
    refresh();
    return row;
  }

  function enter() {
    singleFields.forEach((f) => (f.hidden = true));
    wrap.hidden = false;
    addRow(opts.seedBalance());
    addRow();
    recompute();
    // The seeded amount is already there; the useful next thing to type is its rate.
    rows()[0]!.querySelector<HTMLInputElement>('[data-track-rate]')!.focus();
  }

  function exit() {
    wrap.hidden = true;
    list.replaceChildren();
    singleFields.forEach((f) => (f.hidden = false));
    problem = null;
    refresh();
    opts.onExit();
  }

  addBtn.addEventListener('click', () => {
    if (!api.active()) return enter();
    addRow().querySelector<HTMLInputElement>('[data-track-amount]')!.focus();
  });

  list.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const row = t.closest<HTMLElement>('[data-track]');
    if (t.matches('[data-track-amount-range]') || t.matches('[data-track-rate-range]')) {
      const isAmount = t.matches('[data-track-amount-range]');
      const text = row!.querySelector<HTMLInputElement>(isAmount ? '[data-track-amount]' : '[data-track-rate]')!;
      text.value = isAmount ? formatILS(Number(t.value)).slice(1) : Number(t.value).toFixed(2);
      flag(text, false);
      syncRange(t, Number(t.value));
      recompute();
      return;
    }
    if (t.matches('[data-track-amount]')) {
      const { text, caret } = formatWhileTyping(t.value, t.selectionStart ?? t.value.length);
      t.value = text.split('.')[0]!;
      t.setSelectionRange(caret, caret);
    } else if (t.matches('[data-track-rate]')) {
      t.value = t.value.replace(/[^\d.,]/g, '');
    } else return;
    syncRow(row!);
    flag(t, false);
    recompute();
  });
  list.addEventListener('change', recompute);
  list.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-track-remove]');
    if (!btn) return;
    const row = btn.closest<HTMLElement>('[data-track]')!;
    const next = (row.nextElementSibling ?? row.previousElementSibling) as HTMLElement | null;
    row.remove();
    if (rows().length === 0) return exit();
    refresh();
    recompute();
    next?.querySelector<HTMLElement>('input')?.focus();
  });
  list.addEventListener('focusin', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('input')) requestAnimationFrame(() => t.select());
  });

  const api = {
    active: () => !wrap.hidden,
    recompute,
    /** Explain a payment the balance and years cannot produce (null clears it). */
    setProblem(msg: string | null) {
      problem = msg;
      setTotal(sum.balance, sum.pay);
    },
    /** Mark every half-filled or invalid track on submit. Blank rows are ignored. */
    validate() {
      let complete = 0;
      let ok = true;
      for (const row of rows()) {
        const r = read(row);
        if (r.blank) continue;
        flag(r.amountEl, !r.okAmount);
        flag(r.rateEl, !r.okRate);
        if (r.okAmount && r.okRate) complete++;
        else ok = false;
      }
      if (complete === 0) {
        ok = false;
        const first = read(rows()[0]!);
        if (first.blank || !first.okAmount) flag(first.amountEl, true);
        if (first.blank || !first.okRate) flag(first.rateEl, true);
      }
      return ok;
    },
  };
  refresh(); // reveals the button; without JS it stays hidden
  return api;
}

export type TracksApi = ReturnType<typeof initTracks>;
