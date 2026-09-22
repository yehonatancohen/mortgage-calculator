import type { APIRoute } from 'astro';
import { isValidILMobile, toE164IL } from '../../../lib/mortgage';
import { newId } from '../../server/crypto';
import { getEnv } from '../../server/env';
import { ipHash, isBot, json, rateLimit, readJson, sameOrigin } from '../../server/guard';

export const prerender = false;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  const body = await readJson<{ channel?: string; contact?: string; inputs?: unknown; entryPage?: string; utm?: unknown; hp?: string }>(request);
  if (!body) return json({ ok: false, error: 'invalid_input' }, 400);
  if (isBot(body.hp)) return json({ ok: true });

  let contact: string | null = null;
  if (body.channel === 'email' && typeof body.contact === 'string' && EMAIL.test(body.contact.trim())) contact = body.contact.trim().toLowerCase();
  if (body.channel === 'whatsapp' && typeof body.contact === 'string' && isValidILMobile(body.contact)) contact = toE164IL(body.contact);
  if (!contact) return json({ ok: false, error: 'invalid_contact' }, 400);

  const ip = await ipHash(env, request);
  if (!(await rateLimit(env, `alert:ip:${ip}`, 10, 3600))) return json({ ok: false, error: 'rate_limited' }, 429);

  await env.DB.prepare('INSERT INTO rate_alerts (id, channel, contact, inputs_json, consent, entry_page, utm_json) VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)')
    .bind(newId(), body.channel, contact, JSON.stringify(body.inputs ?? {}).slice(0, 2000), String(body.entryPage ?? '/').slice(0, 200), JSON.stringify(body.utm ?? {}).slice(0, 1000))
    .run();
  return json({ ok: true });
};
