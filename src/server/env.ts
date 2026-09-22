/**
 * Server environment. Bindings come from wrangler.jsonc, secrets from `wrangler secret put`
 * (or .dev.vars locally). Everything optional falls back to a safe development behavior.
 */
import { env as cfEnv } from 'cloudflare:workers';

export interface Env {
  DB: D1Database;
  /** Signs OTP verification tokens and hashes codes. Required in production. */
  OTP_SECRET?: string;
  /** 'mock' (logs the code) | 'http' (generic JSON provider, see sms.ts). Default mock. */
  SMS_PROVIDER?: string;
  SMS_HTTP_URL?: string;
  SMS_HTTP_AUTH?: string;
  SMS_SENDER?: string;
  /** '1' returns the mock code to the browser. Never set in production. */
  EXPOSE_DEV_OTP?: string;
  /** Advisor who receives Tier A leads (the single advisor at launch). */
  ADVISOR_NAME?: string;
  ADVISOR_EMAIL?: string;
  ADVISOR_WEBHOOK_URL?: string;
  /** Signs webhook bodies (header X-Signature: sha256=<hex>). */
  WEBHOOK_SECRET?: string;
  /** Operator: receives Tier B review notices; password for /admin (user "admin"). */
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  /** Email via Resend (https://resend.com). Without a key, emails are logged. */
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  /** Cloudflare Turnstile secret. Without it, bot checks rely on honeypot + rate limits. */
  TURNSTILE_SECRET?: string;
  /** Public origin, used in links inside emails (e.g. https://example.co.il). */
  PUBLIC_ORIGIN?: string;
}

export const getEnv = (): Env => cfEnv as unknown as Env;

export const isProductionLike = (env: Env) => env.SMS_PROVIDER !== undefined && env.SMS_PROVIDER !== 'mock';
