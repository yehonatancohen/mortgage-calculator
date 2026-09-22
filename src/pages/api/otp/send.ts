import type { APIRoute } from 'astro';
import { isValidILMobile, toE164IL } from '../../../../lib/mortgage';
import { getEnv } from '../../../server/env';
import { clientIp, ipHash, isBot, json, rateLimit, readJson, sameOrigin, turnstileOk } from '../../../server/guard';
import { sendOtp } from '../../../server/otp';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  const body = await readJson<{ phone?: string; hp?: string; turnstileToken?: string }>(request);
  if (!body || typeof body.phone !== 'string' || !isValidILMobile(body.phone)) return json({ ok: false, error: 'invalid_phone' }, 400);
  // Bots get a normal-looking success and no SMS.
  if (isBot(body.hp)) return json({ ok: true });

  const phone = toE164IL(body.phone)!;
  const ip = await ipHash(env, request);
  if (!(await rateLimit(env, `otp:ip:${ip}`, 10, 3600))) return json({ ok: false, error: 'rate_limited' }, 429);
  if (!(await rateLimit(env, `otp:phone:${phone}`, 3, 600))) return json({ ok: false, error: 'rate_limited' }, 429);
  if (!(await turnstileOk(env, body.turnstileToken, clientIp(request)))) return json({ ok: false, error: 'bot_check_failed' }, 403);

  const res = await sendOtp(env, phone);
  return res.ok ? json(res) : json(res, 502);
};
