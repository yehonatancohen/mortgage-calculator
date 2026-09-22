/** Request guards for the public lead endpoints: JSON parsing, rate limits, Turnstile, honeypot. */
import { sha256Hex } from './crypto';
import type { Env } from './env';

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const clientIp = (request: Request) => request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';

export async function ipHash(env: Env, request: Request) {
  return (await sha256Hex(`${env.OTP_SECRET ?? 'dev'}:ip:${clientIp(request)}`)).slice(0, 32);
}

export async function readJson<T>(request: Request, maxBytes = 16_384): Promise<T | null> {
  if (!request.headers.get('content-type')?.includes('application/json')) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** Same-origin check: browsers send Origin on POST. Rejects cross-site form posts. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // non-browser clients; still rate-limited
  return origin === new URL(request.url).origin;
}

/**
 * Fixed-window rate limit stored in D1. Returns true when the request is allowed.
 * Keys look like "otp:ip:<hash>" or "otp:phone:+9725…".
 */
export async function rateLimit(env: Env, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - (now % windowSeconds);
  const row = await env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END,
       window_start = ?2
     RETURNING count`,
  )
    .bind(key, windowStart)
    .first<{ count: number }>();
  return (row?.count ?? 1) <= limit;
}

/** Cloudflare Turnstile. Skipped (allowed) when no secret is configured. */
export async function turnstileOk(env: Env, token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  form.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/** Honeypot: a visually hidden field real people never fill. */
export const isBot = (honeypot: unknown) => typeof honeypot === 'string' && honeypot.trim() !== '';
