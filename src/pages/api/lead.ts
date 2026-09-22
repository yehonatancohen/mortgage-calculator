import type { APIRoute } from 'astro';
import { getEnv } from '../../server/env';
import { ipHash, isBot, json, rateLimit, readJson, sameOrigin } from '../../server/guard';
import { computeBuyer, computeRefinance, storeAndDeliver, validateLead, type LeadPayload } from '../../server/leads';
import { checkToken } from '../../server/otp';

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

  // Hard filter: an unverified phone never becomes a lead.
  const verified = await checkToken(env, v.value.phoneE164, v.value.token);
  if (!verified) return json({ ok: false, error: 'not_verified' }, 401);

  const computed =
    v.value.kind === 'refinance'
      ? computeRefinance(v.value.inputs, verified, v.value.timing, v.value.entryPage ?? '/')
      : computeBuyer(v.value.inputs, verified, v.value.timing);
  if (!computed) return json({ ok: false, error: 'invalid_inputs' }, 400);

  const origin = env.PUBLIC_ORIGIN ?? new URL(request.url).origin;
  await storeAndDeliver(env, origin, v.value, computed, verified, { userAgent: request.headers.get('user-agent') ?? '', ipHash: ip });
  // The visitor never sees the score or tier.
  return json({ ok: true });
};
