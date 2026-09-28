/**
 * Funnel analytics. Events go to window.dataLayer (any tag manager can pick them up), to
 * Microsoft Clarity when it is loaded, and — new — to tachles-admin's first-party beacon
 * (`POST /api/t`) so visitor behavior can be joined to lead outcomes there. No third-party
 * script is required for the site to work.
 *
 * Events: step1_complete, result_view, question_taken, question_fixed, question_goal,
 * lead_gate_view, otp_sent, otp_verified, lead_submitted, rate_alert_view, rate_alert_submitted,
 * calculator_used. Every event carries entry_page and page.
 *
 * First-party tracking: a session id (sessionStorage, per tab session) and a visitor id
 * (localStorage, persists across visits) are generated client-side and sent with every beacon.
 * Both are pseudonymous, not anonymous — see mortgage-website/OWNER-TODO.md and
 * tachles-admin/README.md's Privacy section. Engaged time (only while the tab is visible) and
 * max scroll depth are tracked per page and flushed on visibilitychange/pagehide via
 * navigator.sendBeacon, so nothing is lost when the visitor leaves.
 */

type Props = Record<string, string | number | boolean | null | undefined>;
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    clarity?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const ENTRY = 'mc_entry';
const UTM = 'mc_utm';
const REF = 'mc_ref';
const SESSION = 'mc_session';
const VISITOR = 'mc_visitor';
const fired = new Set<string>();

const store = {
  get: (k: string, storage: Storage = sessionStorage) => {
    try {
      return storage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string, storage: Storage = sessionStorage) => {
    try {
      storage.setItem(k, v);
    } catch {
      /* private mode: attribution/tracking falls back to a fresh id every load */
    }
  },
};

const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Owner opt-out flag, set by Base.astro when the site is opened with ?internal=1. */
const isInternal = () => store.get('mc_internal', localStorage) === '1';

export function initAnalytics() {
  if (isInternal()) return;
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
  if (!store.get(SESSION)) store.set(SESSION, randomId());
  if (!store.get(VISITOR, localStorage)) store.set(VISITOR, randomId(), localStorage);

  initBeacon();
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
export const sessionId = () => store.get(SESSION) ?? '';
export const visitorId = () => store.get(VISITOR, localStorage) ?? '';

export function track(event: string, props: Props = {}) {
  if (isInternal()) return;
  const payload = { event, entry_page: entryPage(), page: location.pathname, ...props };
  (window.dataLayer ??= []).push(payload);
  window.clarity?.('event', event);
  window.gtag?.('event', event, props);
  queueEvent(event, props);
}

/** Fire an event only once per page view (e.g. result_view when a step is re-entered). */
export function trackOnce(event: string, props: Props = {}) {
  if (fired.has(event)) return;
  fired.add(event);
  track(event, props);
}

// ---------------------------------------------------------------------------
// First-party beacon: batches pageview/event/session data and flushes to
// POST /api/t via sendBeacon (falls back to fetch keepalive) on visibility loss.
// ---------------------------------------------------------------------------

interface QueuedEvent {
  name: string;
  path: string;
  at: number;
  props?: Props;
}

let queuedEvents: QueuedEvent[] = [];
let visibleMs = 0; // engaged time accumulated SINCE THE LAST FLUSH (a delta, reset after each send)
let lastVisibleAt = document.visibilityState === 'visible' ? performance.now() : null;
let maxScrollPct = 0;
let beaconInitDone = false;
// One id per document load (this is a multi-page app: a full navigation re-runs this module),
// so the server can upsert the same pageview row across this page's periodic flushes.
const pageviewId = randomId();

function queueEvent(name: string, props?: Props) {
  queuedEvents.push({ name, path: location.pathname, at: Date.now(), props });
}

function accumulateVisible() {
  if (lastVisibleAt !== null) {
    visibleMs += performance.now() - lastVisibleAt;
    // Restart the clock immediately when still visible — otherwise a page that never fires
    // visibilitychange (the common case: the tab stays in the foreground the whole visit) would
    // only ever get credit for the time up to the FIRST flush, capping engaged_ms at ~30s.
    lastVisibleAt = document.visibilityState === 'visible' ? performance.now() : null;
  }
}

function trackScroll() {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - doc.clientHeight;
  if (scrollable <= 0) return;
  const pct = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
  if (pct > maxScrollPct) maxScrollPct = pct;
}

function buildPayload(exit: boolean) {
  accumulateVisible();
  // engagedMsDelta is consumed and reset here so a failed/dropped beacon just loses that one
  // slice of time rather than double-counting it on the next flush.
  const engagedMsDelta = Math.round(visibleMs);
  visibleMs = 0;
  return {
    sessionId: sessionId(),
    visitorId: visitorId(),
    entryPage: entryPage(),
    referrer: referrer(),
    utm: utm(),
    pvId: pageviewId,
    path: location.pathname,
    title: document.title,
    engagedMsDelta,
    maxScrollPct,
    exit,
    screen: `${screen.width}x${screen.height}`,
    lang: navigator.language,
    events: queuedEvents.splice(0, queuedEvents.length),
  };
}

function flush(exit: boolean) {
  const payload = buildPayload(exit);
  if (payload.events.length === 0 && !exit && payload.engagedMsDelta < 1000) return;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon('/api/t/', blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch('/api/t/', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => {});
}

function initBeacon() {
  if (beaconInitDone) return;
  beaconInitDone = true;

  queueEvent('page_view');
  // Clarity itself is tagged with the session id from Base.astro's loader, once Clarity's own
  // script has actually loaded (window.clarity isn't callable yet at this point in page load).

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush(false);
    } else {
      lastVisibleAt = performance.now();
    }
  });
  addEventListener('scroll', trackScroll, { passive: true });
  addEventListener('pagehide', () => flush(true));

  // Belt-and-suspenders periodic flush for long-lived tabs that never fire visibilitychange.
  setInterval(() => flush(false), 30_000);
}
