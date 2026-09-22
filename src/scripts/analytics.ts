/**
 * Funnel analytics. Events go to window.dataLayer (any tag manager can pick them up) and to
 * Microsoft Clarity when it is loaded. No third-party script is required for the site to work.
 *
 * Events: step1_complete, result_view, question_taken, question_fixed, question_goal,
 * lead_gate_view, otp_sent, otp_verified, lead_submitted, rate_alert_view, rate_alert_submitted,
 * calculator_used. Every event carries entry_page and page.
 */

type Props = Record<string, string | number | boolean | null | undefined>;
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    clarity?: (...args: unknown[]) => void;
  }
}

const ENTRY = 'mc_entry';
const UTM = 'mc_utm';
const REF = 'mc_ref';
const fired = new Set<string>();

const store = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* private mode: attribution falls back to the current page */
    }
  },
};

export function initAnalytics() {
  if (!store.get(ENTRY)) {
    store.set(ENTRY, location.pathname);
    const params = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    store.set(UTM, JSON.stringify(utm));
    store.set(REF, document.referrer.slice(0, 300));
  }
}

export const entryPage = () => store.get(ENTRY) ?? location.pathname;
export const utm = (): Record<string, string> => {
  try {
    return JSON.parse(store.get(UTM) ?? '{}');
  } catch {
    return {};
  }
};
export const referrer = () => store.get(REF) ?? '';

export function track(event: string, props: Props = {}) {
  const payload = { event, entry_page: entryPage(), page: location.pathname, ...props };
  (window.dataLayer ??= []).push(payload);
  window.clarity?.('event', event);
}

/** Fire an event only once per page view (e.g. result_view when a step is re-entered). */
export function trackOnce(event: string, props: Props = {}) {
  if (fired.has(event)) return;
  fired.add(event);
  track(event, props);
}
