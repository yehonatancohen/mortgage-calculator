/**
 * Lead gate (details → SMS code → done) and rate alert. The host calculator supplies its inputs
 * through setLeadContext(); the server recomputes everything from them.
 */
import { formatILMobile, isValidILMobile } from '../../lib/mortgage';
import { entryPage, referrer, track, utm } from './analytics';
import { chipGroup } from './chips';

type InputsFn = () => Record<string, unknown>;
const contexts = new WeakMap<HTMLElement, InputsFn>();
export const setLeadContext = (el: HTMLElement, fn: InputsFn) => contexts.set(el, fn);

const ERR: Record<string, string> = {
  invalid_phone: 'מספר הנייד לא תקין.',
  rate_limited: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.',
  bot_check_failed: 'לא הצלחנו לאמת שמדובר באדם. רעננו את הדף ונסו שוב.',
  sms_failed: 'לא הצלחנו לשלוח SMS. נסו שוב.',
  wrong_code: 'הקוד שגוי. נסו שוב.',
  expired: 'פג תוקף הקוד. שלחו קוד חדש.',
  too_many_attempts: 'יותר מדי ניסיונות. שלחו קוד חדש.',
  not_verified: 'פג תוקף האימות. שלחו קוד חדש.',
  network: 'אין חיבור. בדקו את האינטרנט ונסו שוב.',
  default: 'משהו השתבש. נסו שוב.',
};

async function post<T>(url: string, body: unknown): Promise<T & { ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return (await res.json()) as T & { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: 'network' } as T & { ok: boolean; error?: string };
  }
}

function showStage(root: HTMLElement, stage: string) {
  root.querySelectorAll<HTMLElement>('[data-stage]').forEach((s) => (s.hidden = s.dataset.stage !== stage));
  root.dispatchEvent(new CustomEvent('lead:stage', { bubbles: true, detail: stage }));
}

function busy(btn: HTMLButtonElement, on: boolean) {
  btn.disabled = on;
  btn.setAttribute('aria-busy', String(on));
}

function turnstileToken(root: HTMLElement): string | undefined {
  const input = root.querySelector<HTMLInputElement>('[name="cf-turnstile-response"]');
  return input?.value || undefined;
}

function loadTurnstile(root: HTMLElement) {
  const slot = root.querySelector<HTMLElement>('[data-turnstile]');
  if (!slot || document.querySelector('script[data-turnstile-script]')) return;
  const s = document.createElement('script');
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
  s.async = true;
  s.defer = true;
  s.dataset.turnstileScript = '';
  document.head.appendChild(s);
  slot.classList.add('cf-turnstile');
}

export function initLeadGate(root: HTMLElement) {
  const kind = root.dataset.kind as 'refinance' | 'buyer';
  const form = root.querySelector<HTMLFormElement>('[data-lead-form]')!;
  const otpForm = root.querySelector<HTMLFormElement>('[data-otp-form]')!;
  const name = form.elements.namedItem('firstName') as HTMLInputElement;
  const phone = form.elements.namedItem('phone') as HTMLInputElement;
  const consent = form.elements.namedItem('consentContact') as HTMLInputElement;
  const marketing = form.elements.namedItem('consentMarketing') as HTMLInputElement;
  const hp = form.elements.namedItem('company') as HTMLInputElement;
  const formError = form.querySelector<HTMLElement>('[data-form-error]')!;
  const otpError = otpForm.querySelector<HTMLElement>('[data-otp-error]')!;
  const digits = [...otpForm.querySelectorAll<HTMLInputElement>('[data-digit]')];
  const resend = otpForm.querySelector<HTMLButtonElement>('[data-resend]')!;
  const devCode = otpForm.querySelector<HTMLElement>('[data-dev-code]')!;
  const hintFor = (k: string) => form.querySelector<HTMLElement>(`[data-hint-for="${k}"]`)!;
  const phoneHintDefault = hintFor('phone').textContent ?? '';
  let timing: string | null = null;
  let token = '';
  let attempted = false;
  let resendTimer = 0;

  const timingGroup = chipGroup(form.querySelector<HTMLElement>('[data-timing]')!, (v) => {
    timing = v;
    if (attempted) check();
  });
  void timingGroup;

  root.addEventListener('lead:shown', () => loadTurnstile(root), { once: true });

  // Phone: format as 05X-XXX-XXXX while typing.
  phone.addEventListener('input', () => {
    const atEnd = phone.selectionStart === phone.value.length;
    phone.value = formatILMobile(phone.value);
    if (atEnd) phone.setSelectionRange(phone.value.length, phone.value.length);
    if (attempted) check();
  });
  phone.addEventListener('blur', () => {
    if (phone.value && !isValidILMobile(phone.value)) setHint('phone', 'מספר נייד ישראלי בן 10 ספרות, למשל 050-123-4567.', true);
  });
  name.addEventListener('input', () => attempted && check());
  consent.addEventListener('change', () => attempted && check());

  function setHint(k: string, msg: string, attention = false) {
    const h = hintFor(k);
    h.textContent = msg;
    h.classList.toggle('field__hint--attention', attention);
    const input = form.elements.namedItem(k);
    if (input instanceof HTMLInputElement) input.setAttribute('aria-invalid', String(attention));
  }

  function check(): HTMLElement | null {
    let first: HTMLElement | null = null;
    const flag = (k: string, ok: boolean, msg: string, el: HTMLElement, fallback = '') => {
      setHint(k, ok ? fallback : msg, !ok);
      if (!ok && !first) first = el;
    };
    flag('firstName', name.value.trim().length >= 2, 'נא להזין שם פרטי.', name);
    flag('phone', isValidILMobile(phone.value), 'מספר נייד ישראלי בן 10 ספרות, למשל 050-123-4567.', phone, phoneHintDefault);
    flag('timing', timing !== null, 'נא לבחור אחת מהאפשרויות.', form.querySelector<HTMLElement>('[data-timing] [data-answer]')!);
    flag('consentContact', consent.checked, 'כדי שיועץ יוכל לחזור אליך, צריך לאשר.', consent);
    return first;
  }

  async function sendCode(btn: HTMLButtonElement) {
    busy(btn, true);
    formError.textContent = '';
    const res = await post<{ devCode?: string }>('/api/otp/send/', { phone: phone.value, hp: hp.value, turnstileToken: turnstileToken(root) });
    busy(btn, false);
    if (!res.ok) {
      (btn === resend ? otpError : formError).textContent = ERR[res.error ?? 'default'] ?? ERR.default!;
      return false;
    }
    track('otp_sent', { kind });
    devCode.hidden = !res.devCode;
    devCode.textContent = res.devCode ? `סביבת פיתוח: הקוד הוא ${res.devCode}` : '';
    startResendTimer();
    return true;
  }

  function startResendTimer(seconds = 30) {
    clearInterval(resendTimer);
    let left = seconds;
    resend.disabled = true;
    resend.textContent = `שליחה חוזרת בעוד ${left} שניות`;
    resendTimer = window.setInterval(() => {
      left--;
      if (left <= 0) {
        clearInterval(resendTimer);
        resend.disabled = false;
        resend.textContent = 'שליחה חוזרת';
      } else resend.textContent = `שליחה חוזרת בעוד ${left} שניות`;
    }, 1000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    attempted = true;
    const invalid = check();
    if (invalid) {
      invalid.focus();
      return;
    }
    const btn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
    if (!(await sendCode(btn))) return;
    root.querySelector<HTMLElement>('[data-otp-phone]')!.textContent = formatILMobile(phone.value);
    digits.forEach((d) => (d.value = ''));
    otpError.textContent = '';
    showStage(root, 'otp');
    digits[0]!.focus();
  });

  // OTP boxes: auto-advance, backspace to previous. A pasted or autofilled code arrives as one
  // multi-digit input event (every box accepts 6 chars) and is spread across the boxes.
  const code = () => digits.map((d) => d.value).join('');
  const fill = (text: string, from = 0) => {
    const chars = text.replace(/\D/g, '').slice(0, 6 - from).split('');
    chars.forEach((c, i) => (digits[from + i]!.value = c));
    const next = Math.min(5, from + chars.length);
    digits[next]!.focus();
    if (code().length === 6) otpForm.requestSubmit();
  };
  digits.forEach((d, i) => {
    d.addEventListener('input', () => {
      const v = d.value.replace(/\D/g, '');
      if (v.length > 1) {
        d.value = '';
        fill(v, i);
        return;
      }
      d.value = v;
      otpError.textContent = '';
      if (v && i < 5) digits[i + 1]!.focus();
      if (code().length === 6) otpForm.requestSubmit();
    });
    d.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !d.value && i > 0) {
        digits[i - 1]!.value = '';
        digits[i - 1]!.focus();
        e.preventDefault();
      }
      if (e.key === 'ArrowLeft' && i < 5) digits[i + 1]!.focus();
      if (e.key === 'ArrowRight' && i > 0) digits[i - 1]!.focus();
    });
    d.addEventListener('focus', () => d.select());
  });

  let submitting = false;
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (code().length !== 6) {
      otpError.textContent = 'נא להזין את 6 הספרות.';
      digits.find((d) => !d.value)?.focus();
      return;
    }
    submitting = true;
    const btn = otpForm.querySelector<HTMLButtonElement>('[data-verify]')!;
    busy(btn, true);
    const v = await post<{ token?: string }>('/api/otp/verify/', { phone: phone.value, code: code() });
    if (!v.ok || !v.token) {
      busy(btn, false);
      submitting = false;
      otpError.textContent = ERR[v.error ?? 'default'] ?? ERR.default!;
      digits.forEach((d) => (d.value = ''));
      digits[0]!.focus();
      return;
    }
    token = v.token;
    track('otp_verified', { kind });
    const res = await post('/api/lead/', {
      kind,
      firstName: name.value.trim(),
      phone: phone.value,
      token,
      timing,
      consentContact: consent.checked,
      consentMarketing: marketing.checked,
      inputs: contexts.get(root)?.() ?? {},
      entryPage: entryPage(),
      utm: utm(),
      referrer: referrer(),
      hp: hp.value,
    });
    busy(btn, false);
    submitting = false;
    if (!res.ok) {
      otpError.textContent = ERR[res.error ?? 'default'] ?? ERR.default!;
      return;
    }
    track('lead_submitted', { kind, timing });
    root.querySelector<HTMLElement>('[data-done-title]')!.textContent = `תודה, ${name.value.trim()}. הבקשה התקבלה.`;
    showStage(root, 'done');
    root.querySelector<HTMLElement>('[data-done-title]')!.focus();
  });

  resend.addEventListener('click', () => void sendCode(resend));
  root.querySelector('[data-change-phone]')!.addEventListener('click', () => {
    clearInterval(resendTimer);
    showStage(root, 'form');
    phone.focus();
  });
}

export function initRateAlert(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-alert-form]')!;
  const contact = form.elements.namedItem('contact') as HTMLInputElement;
  const label = form.querySelector<HTMLElement>('[data-contact-label]')!;
  const hint = form.querySelector<HTMLElement>('[data-hint-for="contact"]')!;
  const error = form.querySelector<HTMLElement>('[data-form-error]')!;
  const hp = form.elements.namedItem('company') as HTMLInputElement;
  let channel = 'email';

  chipGroup(form.querySelector<HTMLElement>('[data-channel]')!, (v) => {
    channel = v;
    const wa = v === 'whatsapp';
    label.textContent = wa ? 'מספר וואטסאפ' : 'אימייל';
    contact.type = wa ? 'tel' : 'email';
    contact.inputMode = wa ? 'tel' : 'email';
    contact.autocomplete = wa ? 'tel-national' : 'email';
    contact.placeholder = wa ? '05X-XXX-XXXX' : '';
    contact.value = '';
    hint.textContent = '';
    contact.focus();
  });
  contact.addEventListener('input', () => {
    if (channel === 'whatsapp') contact.value = formatILMobile(contact.value);
  });

  const valid = () => (channel === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact.value.trim()) : isValidILMobile(contact.value));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid()) {
      hint.textContent = channel === 'email' ? 'כתובת האימייל לא תקינה.' : 'מספר נייד ישראלי בן 10 ספרות.';
      hint.classList.add('field__hint--attention');
      contact.setAttribute('aria-invalid', 'true');
      contact.focus();
      return;
    }
    hint.textContent = '';
    hint.classList.remove('field__hint--attention');
    const btn = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
    busy(btn, true);
    const res = await post('/api/alert/', { channel, contact: contact.value, inputs: contexts.get(root)?.() ?? {}, entryPage: entryPage(), utm: utm(), hp: hp.value });
    busy(btn, false);
    if (!res.ok) {
      error.textContent = ERR[res.error ?? 'default'] ?? ERR.default!;
      return;
    }
    track('rate_alert_submitted', { channel });
    showStage(root, 'done');
    root.querySelector<HTMLElement>('[data-stage="done"] .lead__title')!.focus();
  });
}
