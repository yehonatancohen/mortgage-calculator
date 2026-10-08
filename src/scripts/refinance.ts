/**
 * Refinance calculator controller: steps, history, URL state, live updates, motion.
 * All numbers come from lib/mortgage through the shared view model (src/ui/refinanceView.ts).
 */
import { formatILS, formatWhileTyping, parseAmount } from '../../lib/mortgage';
import { paramsFromState, refinanceView, stateFromParams, type RefiData, type RefiState, type RefiView } from '../ui/refinanceView';
import { track, trackOnce } from './analytics';
import { chipGroup, type ChipGroup } from './chips';
import { enhanceField, type FieldApi } from './fields';
import { setLeadContext } from './leadgate';
import { countTo, reducedMotion, transition } from './motion';
import { initTracks } from './tracks';

const QUESTIONS = ['q-taken', 'q-fixed', 'q-goal'] as const;
const STEPS = ['inputs', 'result', ...QUESTIONS, 'lead', 'alert'] as const;
type Step = (typeof STEPS)[number];
const KEY_BY_STEP = { 'q-taken': 'taken', 'q-fixed': 'hasFixed', 'q-goal': 'goal' } as const;

interface Config extends RefiData {
  defaults: RefiState;
  bounds: { balance: [number, number]; payment: [number, number]; years: [number, number] };
}

export function initRefinance(root: HTMLElement) {
  const cfg = JSON.parse(root.querySelector('[data-refi-data]')!.textContent!) as Config;
  const data: RefiData = { assumptions: cfg.assumptions, minBalance: cfg.minBalance, ratesPeriod: cfg.ratesPeriod };
  const $ = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const $$ = <T extends HTMLElement = HTMLElement>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const out = (k: string) => $$(`[data-out="${k}"]`);

  const initialParams = new URLSearchParams(location.search);
  let state: RefiState = stateFromParams(initialParams, cfg.defaults, cfg.bounds);
  let view: RefiView = refinanceView(state, data);
  let step: Step = 'inputs';

  const primary = $<HTMLButtonElement>('[data-primary]');
  const secondary = $<HTMLButtonElement>('[data-secondary]');
  const footer = $('[data-footer]');
  const preview = $('[data-preview]');
  const announce = $('[data-announce]');

  // ---------- Fields ----------
  const payProblem = () =>
    view.invalidReason === 'payment_too_low'
      ? 'ההחזר נמוך מדי ליתרה ולתקופה. כדאי לבדוק שוב.'
      : view.invalidReason === 'payment_too_high'
        ? 'ההחזר גבוה מאוד ליתרה ולתקופה. כדאי לבדוק שוב.'
        : null;
  const fields: Record<'balance' | 'payment' | 'years', FieldApi> = {
    balance: enhanceField($('[data-field="balance"]'), (v) => change({ balance: v })),
    payment: enhanceField($('[data-field="payment"]'), (v) => change({ payment: v }), () => payProblem()),
    years: enhanceField($('[data-field="years"]'), (v) => {
      change({ years: v });
      tracks.recompute();
    }),
  };
  fields.balance.set(state.balance, { silent: true });
  fields.payment.set(state.payment, { silent: true });
  fields.years.set(state.years, { silent: true });

  // Delegated, so inputs added by the tracks editor behave the same.
  $('[data-step-id="inputs"]').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') {
      e.preventDefault();
      primary.click();
    }
  });

  // ---------- Questions ----------
  const groups = new Map<Step, ChipGroup>();
  for (const q of QUESTIONS) {
    const section = $(`[data-step-id="${q}"]`);
    const key = KEY_BY_STEP[q];
    const g = chipGroup(section.querySelector<HTMLElement>('[role="radiogroup"]')!, (value, chip) => {
      chip.classList.add('is-picked');
      change({ [key]: value } as Partial<RefiState>);
      track(`question_${key === 'hasFixed' ? 'fixed' : key}`, { answer: value });
      window.setTimeout(() => {
        chip.classList.remove('is-picked');
        if (step === q) goTo(nextAfter(q));
      }, reducedMotion() ? 150 : 250);
    });
    g.set((state[key] as string | undefined) ?? null);
    groups.set(q, g);
  }

  // ---------- Tracks (optional): amount + rate per track, summed into balance and payment ----------
  const tracks = initTracks(root, {
    seedBalance: () => state.balance,
    years: () => state.years,
    onTotals: (t) => {
      const fixed = t.anyFixed ? 'yes' : 'no';
      change({ balance: t.balance, payment: t.payment, hasFixed: fixed, tracks: t.tracks });
      groups.get('q-fixed')?.set(fixed);
      tracks.setProblem(payProblem());
    },
    onExit: () => change({ balance: fields.balance.get() ?? state.balance, payment: fields.payment.get() ?? state.payment, tracks: undefined }),
  });

  // ---------- Optional prepayment fee from the bank's statement ----------
  const feeInput = $<HTMLInputElement>('[data-report-fee-input]');
  if (state.reportedFee !== undefined) feeInput.value = formatILS(state.reportedFee).slice(1);
  feeInput.addEventListener('input', () => {
    const { text, caret } = formatWhileTyping(feeInput.value, feeInput.selectionStart ?? feeInput.value.length);
    feeInput.value = text.split('.')[0]!;
    feeInput.setSelectionRange(caret, caret);
    const n = parseAmount(feeInput.value);
    const fee = n !== null && n >= 0 && n <= 5_000_000 ? Math.round(n) : undefined;
    change({ reportedFee: fee });
    if (fee !== undefined) trackOnce('report_fee_entered');
  });

  // ---------- Lead / alert context ----------
  const inputs = () => ({ balance: state.balance, payment: state.payment, years: state.years, taken: state.taken, hasFixed: state.hasFixed, goal: state.goal, tracks: state.tracks, reportedFee: state.reportedFee });
  const leadRoot = root.querySelector<HTMLElement>('[data-lead]');
  const alertRoot = root.querySelector<HTMLElement>('[data-alert]');
  if (leadRoot) setLeadContext(leadRoot, inputs);
  if (alertRoot) setLeadContext(alertRoot, inputs);

  // ---------- Rendering ----------
  // The count-up animates the typical-case figure only (low === high).
  const figureText = (vals: number[]) => `כ־${formatILS(vals[1]!)}`;

  let announceTimer = 0;
  function render(prev: RefiView, v: RefiView) {
    root.dataset.kind = v.kind;
    $('.result').dataset.kind = v.kind;
    const numeric = v.kind === 'typical';
    const prevNumeric = prev.kind === 'typical';
    const from = prevNumeric ? [prev.low, prev.high] : [v.low, v.high];

    out('label').forEach((el) => (el.textContent = v.label));
    const figure = out('figure')[0]!;
    figure.hidden = !numeric;
    out('sentence').forEach((el) => {
      el.hidden = numeric;
      el.textContent = v.sentence;
    });
    if (numeric) {
      figure.style.setProperty('--chars', String(v.figure.length));
      countTo(figure, from, [v.low, v.high], figureText);
    }
    out('sub').forEach((el) => (el.textContent = v.sub));

    const pv = out('preview')[0]!;
    pv.style.setProperty('--chars', String(v.preview.length));
    if (numeric && prevNumeric) countTo(pv, from, [v.low, v.high], figureText);
    else pv.textContent = v.preview;
    preview.dataset.kind = v.kind;

    out('q-figure').forEach((el) => (el.textContent = numeric ? v.figure : '—'));
    out('recap-figure').forEach((el) => (el.textContent = numeric ? v.figure : v.preview));
    out('q-label').forEach((el) => (el.textContent = 'חיסכון משוער'));
    out('recap-label').forEach((el) => (el.textContent = numeric ? 'חיסכון משוער' : 'הבדיקה מול יועץ'));

    out('today').forEach((el) => (el.textContent = v.todayText));
    out('after').forEach((el) => (el.textContent = v.afterText));
    out('after-bar').forEach((el) => {
      el.style.setProperty('--w', `${v.afterHiPct}%`);
      el.style.setProperty('--lo', `${((v.afterLoPct / v.afterHiPct) * 100).toFixed(1)}%`);
    });
    out('costs').forEach((el) => (el.textContent = v.costs));

    const list = out('assumptions')[0]!;
    list.replaceChildren(...v.assumptions.map((line) => Object.assign(document.createElement('li'), { textContent: line })));

    out('accuracy').forEach((el) => (el.textContent = v.answeredText));
    out('accuracy-bar').forEach((el) => el.style.setProperty('--value', `${(v.answered / 3) * 100}%`));
    $$('[role="meter"]').forEach((m) => {
      m.setAttribute('aria-valuenow', String(v.answered));
      m.setAttribute('aria-valuetext', v.answeredText);
    });

    clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => (announce.textContent = v.announce), 800);
    renderFooter();
  }

  function renderFooter() {
    const onQuestion = (QUESTIONS as readonly string[]).includes(step);
    const onForm = step === 'lead' || step === 'alert';
    footer.hidden = onForm;
    preview.hidden = step !== 'inputs';
    primary.hidden = onQuestion;
    secondary.hidden = true;
    if (step === 'inputs') {
      primary.textContent = 'הצגת התוצאה';
    } else if (step === 'result') {
      const allAnswered = QUESTIONS.every((q) => state[KEY_BY_STEP[q]] !== undefined);
      if (!view.qualifies) {
        primary.textContent = view.kind === 'invalid' ? 'חזרה לנתונים' : 'עדכנו אותי כשזה ישתלם';
      } else if (view.kind === 'borderline') {
        primary.textContent = 'לבדיקת הצעה מול יועץ';
      } else if (allAnswered) {
        primary.textContent = 'לבדיקה חינם, בלי התחייבות';
      } else {
        primary.textContent = 'לדייק את החישוב';
        secondary.hidden = false;
        secondary.textContent = 'ישר לבדיקה מול יועץ';
      }
    } else if (onQuestion) {
      secondary.hidden = false;
      secondary.textContent = 'דלג';
    }
  }

  // ---------- State changes ----------
  let urlTimer = 0;
  function change(patch: Partial<RefiState>) {
    const prev = view;
    state = { ...state, ...patch };
    view = refinanceView(state, data);
    render(prev, view);
    clearTimeout(urlTimer);
    urlTimer = window.setTimeout(() => history.replaceState({ step }, '', `?${paramsFromState(state, step)}`), 250);
  }

  // ---------- Navigation ----------
  function nextAfter(s: Step): Step {
    if (s === 'q-taken') return 'q-fixed';
    if (s === 'q-fixed') return 'q-goal';
    return view.qualifies ? 'lead' : 'alert';
  }
  const firstOpenQuestion = (): Step => QUESTIONS.find((q) => state[KEY_BY_STEP[q]] === undefined) ?? 'q-taken';

  function show(s: Step) {
    step = s;
    root.dataset.step = s;
    $$('[data-step-id]').forEach((sec) => (sec.hidden = sec.dataset.stepId !== s));
    if (s !== 'lead' && leadRoot) leadRoot.querySelectorAll<HTMLElement>('[data-stage]').forEach((st) => (st.hidden = st.dataset.stage !== 'form'));
    renderFooter();
  }

  function focusFor(s: Step) {
    const section = $(`[data-step-id="${s}"]`);
    if (s === 'inputs') return;
    if ((QUESTIONS as readonly string[]).includes(s)) {
      const chip = section.querySelector<HTMLElement>('[aria-checked="true"]') ?? section.querySelector<HTMLElement>('[data-answer]');
      chip?.focus({ preventScroll: true });
      return;
    }
    const fine = matchMedia('(pointer: fine)').matches;
    const target = s === 'lead' && fine ? section.querySelector<HTMLElement>('input[name="firstName"]') : section.querySelector<HTMLElement>('[tabindex="-1"]');
    target?.focus({ preventScroll: true });
  }

  function goTo(s: Step, { push = true, dir = 'forward' as 'forward' | 'back' } = {}) {
    if (s === 'lead' && !view.qualifies) s = 'alert';
    const from = step;
    transition(() => {
      show(s);
      focusFor(s);
    }, dir);
    if (push) history.pushState({ step: s }, '', `?${paramsFromState(state, s)}`);
    const top = root.getBoundingClientRect().top;
    if (top < 0) root.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });

    if (from === 'inputs' && s === 'result') trackOnce('step1_complete', { balance: state.balance, years: state.years });
    if (s === 'result') trackOnce('result_view', { kind: view.kind });
    if (s === 'lead') {
      trackOnce('lead_gate_view');
      leadRoot?.dispatchEvent(new CustomEvent('lead:shown'));
    }
    if (s === 'alert') trackOnce('rate_alert_view');
  }

  primary.addEventListener('click', () => {
    if (step === 'inputs') {
      const checks = tracks.active() ? [tracks.validate(), fields.years.validate()] : [fields.balance, fields.payment, fields.years].map((f) => f.validate());
      const ok = checks.every(Boolean);
      if (!ok || view.kind === 'invalid') {
        fields.payment.validate();
        root.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
        return;
      }
      goTo('result');
    } else if (step === 'result') {
      if (view.kind === 'invalid') goTo('inputs', { dir: 'back' });
      else if (!view.qualifies) goTo('alert');
      else if (QUESTIONS.every((q) => state[KEY_BY_STEP[q]] !== undefined)) goTo('lead');
      else goTo(firstOpenQuestion());
    }
  });
  secondary.addEventListener('click', () => {
    if (step === 'result') goTo('lead');
    else if ((QUESTIONS as readonly string[]).includes(step)) {
      track('question_skipped', { step });
      goTo(nextAfter(step));
    }
  });
  $$('[data-back]').forEach((b) => b.addEventListener('click', () => history.back()));

  addEventListener('popstate', (e) => {
    const params = new URLSearchParams(location.search);
    const prev = view;
    // Tracks are not kept in the URL; while the tracks editor is open they stay as typed.
    state = { ...stateFromParams(params, cfg.defaults, cfg.bounds), tracks: tracks.active() ? state.tracks : undefined };
    view = refinanceView(state, data);
    feeInput.value = state.reportedFee !== undefined ? formatILS(state.reportedFee).slice(1) : '';
    fields.balance.set(state.balance, { silent: true });
    fields.payment.set(state.payment, { silent: true });
    fields.years.set(state.years, { silent: true });
    for (const q of QUESTIONS) groups.get(q)?.set((state[KEY_BY_STEP[q]] as string | undefined) ?? null);
    render(prev, view);
    tracks.recompute();
    const s = (e.state?.step as Step | undefined) ?? restorable(params.get('s'));
    transition(() => {
      show(s);
      focusFor(s);
    }, 'back');
  });

  function restorable(s: string | null): Step {
    return s && (STEPS as readonly string[]).includes(s) ? (s as Step) : 'inputs';
  }

  // ---------- Boot ----------
  render(view, view);
  const startStep = restorable(initialParams.get('s'));
  show(startStep === 'lead' && !view.qualifies ? 'alert' : startStep);
  history.replaceState({ step }, '', location.search ? `?${paramsFromState(state, step)}` : location.pathname);
  root.classList.add('is-ready');
}
