import type { APIRoute } from 'astro';
import { SITE } from '../../config/site';
import { newId } from '../../server/crypto';
import { getEnv } from '../../server/env';
import { ipHash, isBot, json, rateLimit, readJson, sameOrigin } from '../../server/guard';
import { sendEmail } from '../../server/notify';

export const prerender = false;

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

interface ContactPayload {
  name?: string;
  email?: string;
  message?: string;
  entryPage?: string;
  hp?: string;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const POST: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!sameOrigin(request)) return json({ ok: false, error: 'forbidden' }, 403);
  const body = await readJson<ContactPayload>(request);
  if (!body) return json({ ok: false, error: 'invalid_input' }, 400);
  if (isBot(body.hp)) return json({ ok: true });

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 4000) : '';
  if (!name || !EMAIL.test(email) || message.length < 5) return json({ ok: false, error: 'invalid_input' }, 400);

  const ip = await ipHash(env, request);
  if (!(await rateLimit(env, `contact:ip:${ip}`, 5, 3600))) return json({ ok: false, error: 'rate_limited' }, 429);

  const id = newId();
  await env.DB.prepare('INSERT INTO contact_messages (id, name, email, message, entry_page, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(id, name, email, message, String(body.entryPage ?? '/').slice(0, 200), ip)
    .run();

  const inbox = env.CONTACT_EMAIL ?? env.ADMIN_EMAIL;
  if (inbox) {
    await sendEmail(
      env,
      inbox,
      `פנייה חדשה מהאתר: ${name}`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#171f25;line-height:1.5">
        <p>פנייה חדשה דרך טופס יצירת הקשר ב${esc(SITE.brand)}.</p>
        <p><strong>שם:</strong> ${esc(name)}<br /><strong>אימייל:</strong> ${esc(email)}</p>
        <p><strong>הודעה:</strong><br />${esc(message).replace(/\n/g, '<br />')}</p>
      </div>`,
    );
  }

  return json({ ok: true });
};
