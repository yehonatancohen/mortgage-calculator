/**
 * Phone verification by SMS one-time code.
 * Codes are stored hashed with a TTL and an attempt limit; a successful check returns a short-lived
 * signed token the lead endpoint accepts as proof that the phone was verified.
 */
import { SITE } from '../config/site';
import { hmacHex, randomCode, safeEqual, sha256Hex } from './crypto';
import type { Env } from './env';
import { smsProvider } from './sms';

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const TOKEN_TTL_SECONDS = 30 * 60;

const secret = (env: Env) => env.OTP_SECRET ?? 'dev-only-secret-change-me';
const now = () => Math.floor(Date.now() / 1000);

export async function sendOtp(env: Env, phoneE164: string): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const code = randomCode(6);
  const codeHash = await sha256Hex(`${secret(env)}:${phoneE164}:${code}`);
  await env.DB.prepare(
    `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, created_at) VALUES (?1, ?2, ?3, 0, ?4)
     ON CONFLICT(phone) DO UPDATE SET code_hash = ?2, expires_at = ?3, attempts = 0, created_at = ?4`,
  )
    .bind(phoneE164, codeHash, now() + OTP_TTL_SECONDS, now())
    .run();

  // "@domain #code" lets iOS/Android bind the code to the site (WebOTP / domain-bound codes).
  const host = new URL(SITE.url).host;
  const text = `קוד האימות שלך ב${SITE.brand}: ${code}\n\n@${host} #${code}`;
  const provider = smsProvider(env);
  const res = await provider.send(phoneE164, text);
  if (!res.ok) return { ok: false, error: 'sms_failed' };
  return provider.name === 'mock' && env.EXPOSE_DEV_OTP === '1' ? { ok: true, devCode: code } : { ok: true };
}

export type VerifyResult = { ok: true; token: string } | { ok: false; error: 'expired' | 'wrong_code' | 'too_many_attempts' };

export async function verifyOtp(env: Env, phoneE164: string, code: string): Promise<VerifyResult> {
  const row = await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM otp_codes WHERE phone = ?1')
    .bind(phoneE164)
    .first<{ code_hash: string; expires_at: number; attempts: number }>();
  if (!row || row.expires_at < now()) return { ok: false, error: 'expired' };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: 'too_many_attempts' };

  const hash = await sha256Hex(`${secret(env)}:${phoneE164}:${code}`);
  if (!safeEqual(hash, row.code_hash)) {
    await env.DB.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = ?1').bind(phoneE164).run();
    return { ok: false, error: row.attempts + 1 >= OTP_MAX_ATTEMPTS ? 'too_many_attempts' : 'wrong_code' };
  }
  await env.DB.prepare('DELETE FROM otp_codes WHERE phone = ?1').bind(phoneE164).run();
  return { ok: true, token: await issueToken(env, phoneE164) };
}

export async function issueToken(env: Env, phoneE164: string): Promise<string> {
  const exp = now() + TOKEN_TTL_SECONDS;
  return `${exp}.${await hmacHex(secret(env), `verified:${phoneE164}:${exp}`)}`;
}

export async function checkToken(env: Env, phoneE164: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < now()) return false;
  const expected = await hmacHex(secret(env), `verified:${phoneE164}:${exp}`);
  return safeEqual(expected, sig);
}
