import type { APIRoute } from 'astro';
import { getEnv } from '../../server/env';
import { ipHash, isBot, json, rateLimit, readJson, sameOrigin } from '../../server/guard';
import { computeBuyer, computeRefinance, storeAndDeliver, validateLead, type LeadPayload } from '../../server/leads';
import { checkToken } from '../../server/otp';
import { isTestRequest } from '../../server/testmode';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  const body = await readJson<Partial<LeadPayload> & { hp?: string }>(request);
  if (body && isBot(body.hp)) return json({ ok: true });
  const v = validateLead(body);
  if (!v.ok) return json({ ok: false, error: v.error }, 400);

  const ip = await ipHash(env, request);
  if (!(await rateLimit(env, `lead:ip:${ip}`, 10, 3600))) return json({ ok: false, error: 'rate_limited' }, 429);

  // Phone verification (SMS OTP) is disabled for now — no SMS provider is configured, so leads
  // pass through unverified. `checkToken` still marks a lead verified if a valid token is ever
  // supplied (e.g. once OTP is re-enabled client-side), but an unverified lead is no longer blocked.
  const verified = await checkToken(env, v.value.phoneE164, v.value.token);

  const computed =
    v.value.kind === 'refinance'
      ? computeRefinance(v.value.inputs, verified, v.value.timing, v.value.entryPage ?? '/')
      : computeBuyer(v.value.inputs, verified, v.value.timing);
  if (!computed) return json({ ok: false, error: 'invalid_inputs' }, 400);

  const origin = env.PUBLIC_ORIGIN ?? new URL(request.url).origin;
  // Owner test mode: the lead goes through the same pipeline but is stored as is_test = 1 and
  // emailed to ADMIN_EMAIL instead of the advisor.
  const isTest = await isTestRequest(env, request);
  await storeAndDeliver(env, origin, v.value, computed, verified, { userAgent: request.headers.get('user-agent') ?? '', ipHash: ip, isTest });
  // The visitor never sees the score or tier.
  return json({ ok: true });
};
