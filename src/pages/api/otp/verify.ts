import type { APIRoute } from 'astro';
import { isValidILMobile, toE164IL } from '../../../../lib/mortgage';
import { getEnv } from '../../../server/env';
import { ipHash, json, rateLimit, readJson, sameOrigin } from '../../../server/guard';
import { verifyOtp } from '../../../server/otp';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  const body = await readJson<{ phone?: string; code?: string }>(request);
  if (!body || typeof body.phone !== 'string' || !isValidILMobile(body.phone) || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) {
    return json({ ok: false, error: 'invalid_input' }, 400);
  }
  const ip = await ipHash(env, request);
  if (!(await rateLimit(env, `verify:ip:${ip}`, 30, 3600))) return json({ ok: false, error: 'rate_limited' }, 429);
  const res = await verifyOtp(env, toE164IL(body.phone)!, body.code);
  return json(res, res.ok ? 200 : 400);
};
