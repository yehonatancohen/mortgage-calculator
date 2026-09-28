/**
 * Owner test mode. Turned on from /admin/test-mode/ (Basic auth), it sets two cookies:
 *
 * - `mc_test`: HttpOnly, HMAC-signed with OTP_SECRET. This is the one the server trusts. With it,
 *   /api/t drops the beacon and /api/lead stores the lead with is_test = 1 and emails it to
 *   ADMIN_EMAIL instead of the advisor. It can't be set or forged from page JS or a URL.
 * - `mc_test_ui=1`: readable by page JS, only a hint so the browser also skips GA4/Clarity and
 *   shows the test banner. Forging it only hides your own visits from the third-party tools.
 */
import { hmacHex, safeEqual } from './crypto';
import type { Env } from './env';

export const TEST_COOKIE = 'mc_test';
export const TEST_UI_COOKIE = 'mc_test_ui';
const MAX_AGE_S = 365 * 86_400;

const secret = (env: Env) => env.OTP_SECRET ?? 'dev';

export async function testToken(env: Env, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + MAX_AGE_S;
  return `${exp}.${await hmacHex(secret(env), `test-mode:${exp}`)}`;
}

export async function verifyTestToken(env: Env, token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expRaw, sig] = token.split('.');
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !sig || exp < Math.floor(now / 1000)) return false;
  return safeEqual(sig, await hmacHex(secret(env), `test-mode:${exp}`));
}

export function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return undefined;
}

export const isTestRequest = (env: Env, request: Request) => verifyTestToken(env, readCookie(request, TEST_COOKIE));

export async function testModeCookies(env: Env, on: boolean): Promise<string[]> {
  const attrs = (maxAge: number) => `Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure`;
  if (!on) return [`${TEST_COOKIE}=; ${attrs(0)}; HttpOnly`, `${TEST_UI_COOKIE}=; ${attrs(0)}`];
  return [`${TEST_COOKIE}=${await testToken(env)}; ${attrs(MAX_AGE_S)}; HttpOnly`, `${TEST_UI_COOKIE}=1; ${attrs(MAX_AGE_S)}`];
}
