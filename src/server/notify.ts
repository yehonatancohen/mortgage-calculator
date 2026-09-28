/**
 * Lead notifications: email (Resend, or logged when not configured) and a signed webhook.
 * A WhatsApp channel can be added as another `Notifier` later.
 */
import { SITE } from '../config/site';
import { hmacHex } from './crypto';
import type { Env } from './env';

export interface LeadSummary {
  id: string;
  kind: 'refinance' | 'buyer';
  firstName: string;
  phone: string;
  timing: string | null;
  tier: 'A' | 'B' | 'C';
  score: number | null;
  statusUrl: string;
  lines: [string, string][];
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    // Not sent, so not a success: lead_events records notify_failed rather than a false "delivered".
    console.log(`[email:log] to=${to} subject=${JSON.stringify(subject)}`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function postWebhook(env: Env, url: string, payload: unknown): Promise<boolean> {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.WEBHOOK_SECRET) headers['x-signature'] = `sha256=${await hmacHex(env.WEBHOOK_SECRET, body)}`;
  try {
    const res = await fetch(url, { method: 'POST', headers, body });
    return res.ok;
  } catch {
    return false;
  }
}

function leadEmailHtml(l: LeadSummary, intro: string) {
  const rows = l.lines.map(([k, v]) => `<tr><td style="padding:4px 0 4px 16px;color:#4a545a">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('');
  return `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#171f25;line-height:1.5">
  <p>${esc(intro)}</p>
  <table style="border-collapse:collapse">${rows}</table>
  <p style="margin-top:20px"><a href="${esc(l.statusUrl)}" style="background:#005971;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">עדכון סטטוס הליד</a></p>
  <p style="color:#5f686d;font-size:13px">הליד בלעדי לך. ${esc(SITE.brand)}</p></div>`;
}

export async function notifyAdvisor(env: Env, advisor: { email: string | null; webhook_url: string | null }, l: LeadSummary) {
  const results = { email: true, webhook: true };
  if (advisor.email) {
    results.email = await sendEmail(env, advisor.email, `ליד חדש: ${l.firstName} (${l.kind === 'refinance' ? 'מחזור' : 'רכישה'})`, leadEmailHtml(l, 'ליד חדש ובלעדי. הטלפון אומת ב־SMS.'));
  }
  const hook = advisor.webhook_url ?? env.ADVISOR_WEBHOOK_URL;
  if (hook) {
    results.webhook = await postWebhook(env, hook, { type: 'lead.delivered', lead: { id: l.id, kind: l.kind, firstName: l.firstName, phone: l.phone, timing: l.timing, statusUrl: l.statusUrl, details: Object.fromEntries(l.lines) } });
  }
  return results;
}

export async function notifyAdminReview(env: Env, l: LeadSummary, adminUrl: string) {
  if (!env.ADMIN_EMAIL) return true;
  return sendEmail(env, env.ADMIN_EMAIL, `ליד לבדיקה ידנית (${l.tier}, ${l.score ?? '—'})`, leadEmailHtml({ ...l, statusUrl: adminUrl }, 'ליד ממתין לבדיקה ידנית.'));
}

/** Owner test mode: the same email the advisor would get, sent to ADMIN_EMAIL instead. No
 * webhook, so the advisor's CRM never sees a test lead. */
export async function notifyTestLead(env: Env, l: LeadSummary, status: string) {
  if (!env.ADMIN_EMAIL) return { email: false, reason: 'ADMIN_EMAIL not set' };
  const routed = status === 'delivered' ? 'היה נשלח ליועץ' : status === 'held' ? 'היה ממתין לבדיקה ידנית' : status === 'nurture' ? 'היה עובר לטיפוח' : 'היה מסומן ככפול';
  const email = await sendEmail(
    env,
    env.ADMIN_EMAIL,
    `[בדיקה] ליד חדש: ${l.firstName} (${l.tier}, ${l.score ?? '—'})`,
    leadEmailHtml(l, `ליד בדיקה — לא נשלח ליועץ ולא נספר בנתונים. ליד אמיתי כזה ${routed}.`),
  );
  return email ? { email } : { email, reason: env.RESEND_API_KEY && env.EMAIL_FROM ? 'Resend rejected the email' : 'RESEND_API_KEY or EMAIL_FROM not set' };
}
