/**
 * First-party analytics beacon. Receives batched pageview/event data from
 * src/scripts/analytics.ts (sendBeacon, falling back to fetch keepalive) and writes it to the
 * ANALYTICS D1 binding (tachles-analytics, owned by the sibling tachles-admin project — this
 * endpoint is the only thing in this repo that writes to it).
 *
 * No-ops (200, does nothing) when ANALYTICS isn't bound, so local dev/preview without that
 * binding still works, and when the request looks like a bot.
 */
import type { APIRoute } from 'astro';
import { getEnv, type Env } from '../../server/env';
import { clientIp, rateLimit } from '../../server/guard';
import { sha256Hex } from '../../server/crypto';

export const prerender = false;

interface BeaconEvent {
  name?: unknown;
  path?: unknown;
  at?: unknown;
  props?: unknown;
}
interface BeaconPayload {
  sessionId?: unknown;
  visitorId?: unknown;
  entryPage?: unknown;
  referrer?: unknown;
  utm?: unknown;
  pvId?: unknown;
  path?: unknown;
  title?: unknown;
  engagedMsDelta?: unknown;
  maxScrollPct?: unknown;
  exit?: unknown;
  screen?: unknown;
  lang?: unknown;
  events?: unknown;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const int = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : 0);
const isUuidish = (v: string) => v.length > 0 && v.length <= 64;

// Deliberately simple: this only needs to bucket into a handful of dashboard rows, not power
// a real analytics product. A misclassified UA just lands in "unknown".
function parseDevice(ua: string): { device: string; browser: string; os: string } {
  const device = /ipad|tablet/i.test(ua) ? 'tablet' : /mobi|iphone|android/i.test(ua) ? 'mobile' : 'desktop';
  const browser = /edg\//i.test(ua) ? 'Edge' : /chrome\//i.test(ua) ? 'Chrome' : /safari\//i.test(ua) ? 'Safari' : /firefox\//i.test(ua) ? 'Firefox' : 'Other';
  const os = /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'macOS' : /android/i.test(ua) ? 'Android' : /iphone|ipad/i.test(ua) ? 'iOS' : /linux/i.test(ua) ? 'Linux' : 'Other';
  return { device, browser, os };
}
const isBotUa = (ua: string) => /bot|crawl|spider|slurp|headless|monitor|pingdom|uptime/i.test(ua);

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  const analytics = env.ANALYTICS;
  if (!analytics) return new Response(null, { status: 204 });

  const ua = request.headers.get('user-agent') ?? '';
  if (isBotUa(ua)) return new Response(null, { status: 204 });

  // Loose rate limit per IP: this is a high-frequency endpoint (periodic + unload flushes), so
  // the ceiling is generous compared to lead/otp endpoints — it only needs to stop abuse, not
  // normal browsing.
  const ip = clientIp(request);
  if (!(await rateLimit(env, `beacon:ip:${await hashIp(env, ip)}`, 120, 60))) return new Response(null, { status: 204 });

  let body: BeaconPayload | null = null;
  try {
    const text = await request.text();
    if (text.length > 32_768) return new Response(null, { status: 204 });
    body = JSON.parse(text) as BeaconPayload;
  } catch {
    return new Response(null, { status: 204 });
  }
  if (!body) return new Response(null, { status: 204 });

  const sessionId = str(body.sessionId, 64);
  if (!isUuidish(sessionId)) return new Response(null, { status: 204 });
  const visitorId = str(body.visitorId, 64);
  const pvId = str(body.pvId, 64);
  const path = str(body.path, 300) || '/';
  const { device, browser, os } = parseDevice(ua);

  let utm: Record<string, string> = {};
  try {
    utm = typeof body.utm === 'object' && body.utm ? (body.utm as Record<string, string>) : {};
  } catch {
    utm = {};
  }
  const referrer = str(body.referrer, 300);
  let referrerHost = '';
  try {
    referrerHost = referrer ? new URL(referrer).host : '';
  } catch {
    referrerHost = '';
  }
  const clickIdType = utm['gclid'] ? 'gclid' : utm['fbclid'] ? 'fbclid' : utm['msclkid'] ? 'msclkid' : null;
  const country = (request as unknown as { cf?: { country?: string } }).cf?.country ?? null;

  const engagedMsDelta = int(body.engagedMsDelta, 30 * 60 * 1000); // clamp: nothing legitimate exceeds a 30-minute flush window
  const maxScrollPct = int(body.maxScrollPct, 100);
  const exit = body.exit === true ? 1 : 0;

  // 1) Session: created on first sight, otherwise just touched (last_seen/engaged_ms accumulate;
  //    attribution fields are set once and never overwritten by a later page in the same session).
  await analytics.prepare(
    `INSERT INTO sessions (id, visitor_id, entry_page, referrer_host, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, click_id_type, device, browser, os, country, lang, screen, engaged_ms)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
     ON CONFLICT (id) DO UPDATE SET last_seen = datetime('now'), engaged_ms = engaged_ms + ?18`,
  )
    .bind(
      sessionId,
      visitorId,
      str(body.entryPage, 300) || path,
      referrerHost,
      referrer,
      utm['utm_source'] ?? null,
      utm['utm_medium'] ?? null,
      utm['utm_campaign'] ?? null,
      utm['utm_term'] ?? null,
      utm['utm_content'] ?? null,
      clickIdType,
      device,
      browser,
      os,
      country,
      str(body.lang, 16),
      str(body.screen, 24),
      engagedMsDelta,
    )
    .run();

  // 2) Pageview: upserted by pvId (one per document load) so periodic/unload flushes from the
  //    same page update one row instead of creating duplicates. Bumps sessions.pageviews only
  //    the first time this pvId is seen.
  if (pvId) {
    const existing = await analytics.prepare(`SELECT 1 FROM pageviews WHERE id = ?1`).bind(pvId).first();
    if (existing) {
      await analytics.prepare(`UPDATE pageviews SET engaged_ms = engaged_ms + ?2, max_scroll_pct = MAX(max_scroll_pct, ?3), exit = MAX(exit, ?4) WHERE id = ?1`)
        .bind(pvId, engagedMsDelta, maxScrollPct, exit)
        .run();
    } else {
      await analytics.batch([
        analytics.prepare(`INSERT INTO pageviews (id, session_id, path, title, engaged_ms, max_scroll_pct, exit) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`).bind(
          pvId,
          sessionId,
          path,
          str(body.title, 200),
          engagedMsDelta,
          maxScrollPct,
          exit,
        ),
        analytics.prepare(`UPDATE sessions SET pageviews = pageviews + 1 WHERE id = ?1`).bind(sessionId),
      ]);
    }
  }

  // 3) Events: append-only, drained client-side after each flush so nothing repeats.
  const events = Array.isArray(body.events) ? (body.events as BeaconEvent[]).slice(0, 50) : [];
  if (events.length > 0) {
    const statements = events
      .filter((e) => typeof e.name === 'string')
      .map((e) =>
        analytics.prepare(`INSERT INTO events (session_id, path, name, props_json) VALUES (?1, ?2, ?3, ?4)`).bind(
          sessionId,
          str(e.path, 300),
          str(e.name, 80),
          e.props ? JSON.stringify(e.props).slice(0, 2000) : null,
        ),
      );
    if (statements.length > 0) await analytics.batch(statements);
  }

  return new Response(null, { status: 204 });
};

async function hashIp(env: Env, ip: string) {
  return (await sha256Hex(`${env.OTP_SECRET ?? 'dev'}:beacon:${ip}`)).slice(0, 32);
}
