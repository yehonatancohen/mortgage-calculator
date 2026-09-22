/**
 * Enhances AmountField markup: formatting while typing, slider sync, shorthand suggestion,
 * after-blur validation, slider value bubble. Never shows an error while the user is typing.
 */
import { formatILS, formatNumber, formatWhileTyping, parseAmount, suggestShorthand, type ShorthandField } from '../../lib/mortgage';

export interface FieldApi {
  name: string;
  get(): number | null;
  set(v: number, opts?: { silent?: boolean }): void;
  /** Validate now (e.g. on submit) and show the hint. Returns validity. */
  validate(): boolean;
  el: HTMLElement;
}

export type FieldValidator = (value: number) => string | null;

export function enhanceField(el: HTMLElement, onChange: (value: number) => void, extraValidate?: FieldValidator): FieldApi {
  const name = el.dataset.field!;
  const min = Number(el.dataset.min);
  const max = Number(el.dataset.max);
  const sMin = Number(el.dataset.sliderMin);
  const sMax = Number(el.dataset.sliderMax);
  const suffix = el.dataset.suffix ?? '';
  const shorthand = el.dataset.shorthand as ShorthandField | undefined;
  const text = el.querySelector<HTMLInputElement>('[data-amount]');
  const range = el.querySelector<HTMLInputElement>('[data-range]')!;
  const bubble = el.querySelector<HTMLElement>('[data-bubble]');
  const hint = el.querySelector<HTMLElement>('[data-hint]')!;
  const valueOut = el.querySelector<HTMLElement>('[data-value] bdi');
  const box = el.querySelector<HTMLElement>('.amount');
  const defaultHint = hint.textContent ?? '';

  let value: number | null = Number(range.value);
  let touched = false;
  let pendingShorthand: number | null = null;

  const display = (v: number) => (suffix ? `${formatNumber(v)} ${suffix}` : formatILS(v));

  const syncRange = (v: number) => {
    const clamped = Math.min(sMax, Math.max(sMin, v));
    range.value = String(clamped);
    range.style.setProperty('--fill', `${(((clamped - sMin) / (sMax - sMin)) * 100).toFixed(2)}%`);
    range.setAttribute('aria-valuetext', display(v));
    if (valueOut) valueOut.textContent = formatNumber(v);
    if (bubble) {
      bubble.textContent = display(clamped);
      bubble.style.setProperty('--pos', `${(clamped - sMin) / (sMax - sMin)}`);
    }
  };

  const setHint = (msg: string, attention = false) => {
    hint.textContent = msg;
    hint.classList.toggle('field__hint--attention', attention);
    box?.toggleAttribute('data-invalid', attention);
    text?.setAttribute('aria-invalid', attention ? 'true' : 'false');
  };

  const problem = (v: number | null): string | null => {
    if (v === null) return 'חסר סכום.';
    if (v < min) return `הסכום נמוך מ־${display(min)}.`;
    if (v > max) return `הסכום גבוה מ־${display(max)}.`;
    return extraValidate?.(v) ?? null;
  };

  const validate = () => {
    const p = problem(value);
    if (p) setHint(p, true);
    else if (pendingShorthand === null) setHint(defaultHint);
    return !p;
  };

  text?.addEventListener('input', () => {
    const { text: t, caret } = formatWhileTyping(text.value, text.selectionStart ?? text.value.length);
    text.value = t;
    text.setSelectionRange(caret, caret);
    const v = parseAmount(t);
    value = v;
    pendingShorthand = shorthand && v !== null && v < min ? suggestShorthand(v, shorthand) : null;
    if (pendingShorthand !== null) setHint(`נשלים ל־${display(pendingShorthand)}`);
    else if (touched) {
      // Once blurred with a problem, clear the warning as soon as it is fixed; never add one while typing.
      if (!problem(v)) setHint(defaultHint);
    } else setHint(defaultHint);
    if (v !== null && v >= min && v <= max) {
      syncRange(v);
      onChange(v);
    }
  });

  text?.addEventListener('blur', () => {
    touched = true;
    if (pendingShorthand !== null) {
      api.set(pendingShorthand);
      pendingShorthand = null;
      setHint(defaultHint);
      return;
    }
    validate();
  });

  text?.addEventListener('focus', () => {
    // Select all on first focus so a new number replaces the default.
    requestAnimationFrame(() => text.select());
  });

  range.addEventListener('input', () => {
    const v = Number(range.value);
    value = v;
    if (text) text.value = formatNumber(v);
    syncRange(v);
    setHint(defaultHint);
    onChange(v);
  });

  const showBubble = (on: boolean) => el.classList.toggle('is-dragging', on);
  range.addEventListener('pointerdown', () => showBubble(true));
  range.addEventListener('pointerup', () => showBubble(false));
  range.addEventListener('pointercancel', () => showBubble(false));
  range.addEventListener('blur', () => showBubble(false));
  range.addEventListener('keydown', () => showBubble(true));
  range.addEventListener('keyup', () => setTimeout(() => showBubble(false), 600));

  const api: FieldApi = {
    name,
    el,
    get: () => value,
    set(v, opts) {
      value = v;
      if (text) text.value = formatNumber(v);
      syncRange(v);
      if (!opts?.silent) onChange(v);
    },
    validate,
  };
  syncRange(value);
  return api;
}
