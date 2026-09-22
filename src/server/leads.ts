/**
 * Lead intake: validate → recompute every number on the server → score → store → deliver.
 * The browser's own figures are never trusted or stored as results.
 */
import { scoring } from '../../config/scoring';
import { limits, refinanceAssumptions, benchmarkRate } from '../../lib/data';
import { affordability, formatILS, formatPercent, isValidILMobile, refinanceSavings, toE164IL } from '../../lib/mortgage';
import { scoreRefinanceLead, tierBuyerLead } from '../../lib/scoring/score';
import { CONSENT } from '../config/consent';
import { newId, randomToken } from './crypto';
import type { Env } from './env';
import { notifyAdminReview, notifyAdvisor, type LeadSummary } from './notify';

const TIMINGS = ['now', 'months', 'checking'] as const;
const TAKEN = ['before2015', '2015to2019', '2020to2022', 'since2023', 'unknown'] as const;
const YNU = ['yes', 'no', 'unknown'] as const;
const GOALS = ['lower', 'shorten', 'consolidate', 'cashout', 'unknown'] as const;
const BUYER_TYPES = ['firstHome', 'replacementHome', 'additionalHome'] as const;
const DUPLICATE_WINDOW_DAYS = 30;

export interface LeadPayload {
  kind: 'refinance' | 'buyer';
  firstName: string;
  phone: string;
  token: string;
  timing: (typeof TIMINGS)[number];
  consentContact: boolean;
  consentMarketing?: boolean;
  inputs: Record<string, unknown>;
  entryPage?: string;
  utm?: Record<string, string>;
  referrer?: string;
}

type Valid<T> = { ok: true; value: T } | { ok: false; error: string };

const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null);
const oneOf = <T extends readonly string[]>(v: unknown, list: T): T[number] | undefined => (typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T[number]) : undefined);
const cleanText = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max) : '');

export function validateLead(p: Partial<LeadPayload> | null): Valid<LeadPayload & { phoneE164: string }> {
  if (!p || (p.kind !== 'refinance' && p.kind !== 'buyer')) return { ok: false, error: 'invalid_kind' };
  const firstName = cleanText(p.firstName, 40);
  if (firstName.length < 2) return { ok: false, error: 'invalid_name' };
  if (typeof p.phone !== 'string' || !isValidILMobile(p.phone)) return { ok: false, error: 'invalid_phone' };
  const phoneE164 = toE164IL(p.phone)!;
  if (p.consentContact !== true) return { ok: false, error: 'consent_required' };
  const timing = oneOf(p.timing, TIMINGS);
  if (!timing) return { ok: false, error: 'invalid_timing' };
  if (!p.inputs || typeof p.inputs !== 'object') return { ok: false, error: 'invalid_inputs' };
  const utm = Object.fromEntries(
    Object.entries(p.utm ?? {})
      .filter(([k]) => /^utm_(source|medium|campaign|term|content)$/.test(k))
      .map(([k, v]) => [k, cleanText(v, 120)]),
  );
  return {
    ok: true,
    value: {
      kind: p.kind,
      firstName,
      phone: p.phone,
      phoneE164,
      token: typeof p.token === 'string' ? p.token : '',
      timing,
      consentContact: true,
      consentMarketing: p.consentMarketing === true,
      inputs: p.inputs,
      entryPage: cleanText(p.entryPage, 200) || '/',
      utm,
      referrer: cleanText(p.referrer, 300),
    },
  };
}

export interface Computed {
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
  score: number | null;
  scoreDetail: unknown;
  tier: 'A' | 'B' | 'C';
  lines: [string, string][];
}

export function computeRefinance(raw: Record<string, unknown>, phoneVerified: boolean, timing: string, entryPage: string): Computed | null {
  const balance = num(raw.balance, 10_000, 20_000_000);
  const monthly = num(raw.payment, 100, 200_000);
  const years = num(raw.years, 1, 40);
  if (balance === null || monthly === null || years === null) return null;
  const inputs = {
    balance: Math.round(balance),
    payment: Math.round(monthly),
    years: Math.round(years),
    taken: oneOf(raw.taken, TAKEN),
    hasFixed: oneOf(raw.hasFixed, YNU),
    goal: oneOf(raw.goal, GOALS),
  };
  const a = refinanceAssumptions();
  const r = refinanceSavings({ balance: inputs.balance, monthlyPayment: inputs.payment, months: inputs.years * 12, taken: inputs.taken, hasFixed: inputs.hasFixed, goal: inputs.goal }, a);
  const answered = [inputs.taken, inputs.hasFixed, inputs.goal].filter(Boolean).length;
  const s = scoreRefinanceLead(
    {
      balance: inputs.balance,
      months: inputs.years * 12,
      phoneVerified,
      currentRate: r.ok ? r.currentRate : null,
      benchmarkRate: a.benchmarkRate,
      netSavingsLow: r.ok ? r.netTotal.low : null,
      netSavingsHigh: r.ok ? r.netTotal.high : null,
      feeHigh: r.ok ? r.fee.high : null,
      timing,
      goal: inputs.goal ?? null,
      answered,
      entryPage,
    },
    scoring,
  );
  const lines: [string, string][] = [
    ['יתרה', formatILS(inputs.balance)],
    ['החזר חודשי', formatILS(inputs.payment)],
    ['שנים שנותרו', String(inputs.years)],
  ];
  if (r.ok) {
    lines.push(['ריבית אפקטיבית משוערת', formatPercent(r.currentRate)]);
    lines.push(['חיסכון נטו משוער', `${formatILS(Math.max(0, r.netTotal.low))}–${formatILS(r.netTotal.high)}`]);
    lines.push(['עמלת פירעון משוערת', `${formatILS(r.fee.low)}–${formatILS(r.fee.high)}`]);
  }
  if (inputs.taken) lines.push(['נלקחה', inputs.taken]);
  if (inputs.hasFixed) lines.push(['מסלול קבוע', inputs.hasFixed]);
  if (inputs.goal) lines.push(['מטרה', inputs.goal]);
  return { inputs, results: r as unknown as Record<string, unknown>, score: s.total, scoreDetail: s, tier: s.tier, lines };
}

export function computeBuyer(raw: Record<string, unknown>, phoneVerified: boolean, timing: string): Computed | null {
  const netIncome = num(raw.netIncome, 1_000, 1_000_000);
  const obligations = num(raw.obligations, 0, 1_000_000);
  const equity = num(raw.equity, 0, 50_000_000);
  const years = num(raw.years, 4, 30);
  const buyerType = oneOf(raw.buyerType, BUYER_TYPES);
  if (netIncome === null || obligations === null || equity === null || years === null || !buyerType) return null;
  const inputs = { netIncome, obligations, equity, years, buyerType };
  const rate = benchmarkRate();
  const res = affordability({
    netIncome,
    obligations,
    equity,
    annualRate: rate,
    months: years * 12,
    maxPaymentToIncome: limits.recommendedPaymentToIncome,
    maxLtv: limits.maxLtv[buyerType],
  });
  const t = tierBuyerLead({ loan: res.loanAtMaxPrice, phoneVerified, timing }, scoring);
  const lines: [string, string][] = [
    ['הכנסה נטו', formatILS(netIncome)],
    ['הון עצמי', formatILS(equity)],
    ['סוג רכישה', buyerType],
    ['מחיר דירה משוער (מקסימום)', formatILS(res.maxPrice)],
    ['משכנתא משוערת', formatILS(res.loanAtMaxPrice)],
  ];
  return { inputs, results: { ...res, rate }, score: null, scoreDetail: t, tier: t.tier, lines };
}

export async function storeAndDeliver(
  env: Env,
  origin: string,
  lead: LeadPayload & { phoneE164: string },
  computed: Computed,
  phoneVerified: boolean,
  meta: { userAgent: string; ipHash: string },
): Promise<{ id: string }> {
  const id = newId();
  const statusToken = randomToken();
  const dup = await env.DB.prepare(`SELECT id FROM leads WHERE phone = ?1 AND created_at > datetime('now', ?2) AND status != 'duplicate' ORDER BY created_at DESC LIMIT 1`)
    .bind(lead.phoneE164, `-${DUPLICATE_WINDOW_DAYS} days`)
    .first<{ id: string }>();

  const status = dup ? 'duplicate' : computed.tier === 'A' ? 'delivered' : computed.tier === 'B' ? 'held' : 'nurture';
  const advisor = status === 'delivered' ? await ensureAdvisor(env) : null;

  await env.DB.prepare(
    `INSERT INTO leads (id, kind, first_name, phone, phone_verified, timing, consent_contact, consent_marketing, consent_version,
       inputs_json, results_json, score, score_json, scoring_version, tier, status, advisor_id, delivered_at, status_token,
       duplicate_of, entry_page, utm_json, referrer, user_agent, ip_hash)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)`,
  )
    .bind(
      id,
      lead.kind,
      lead.firstName,
      lead.phoneE164,
      phoneVerified ? 1 : 0,
      lead.timing,
      lead.consentMarketing ? 1 : 0,
      CONSENT.version,
      JSON.stringify(computed.inputs),
      JSON.stringify(computed.results),
      computed.score,
      JSON.stringify(computed.scoreDetail),
      scoring.version,
      computed.tier,
      status,
      advisor?.id ?? null,
      advisor ? new Date().toISOString() : null,
      statusToken,
      dup?.id ?? null,
      lead.entryPage ?? '/',
      JSON.stringify(lead.utm ?? {}),
      lead.referrer ?? '',
      meta.userAgent.slice(0, 300),
      meta.ipHash,
    )
    .run();
  await logEvent(env, id, 'created', { tier: computed.tier, status });

  const summary: LeadSummary = {
    id,
    kind: lead.kind,
    firstName: lead.firstName,
    phone: lead.phoneE164.replace('+972', '0'),
    timing: lead.timing,
    tier: computed.tier,
    score: computed.score,
    statusUrl: `${origin}/lead/${statusToken}/`,
    lines: [['טלפון', lead.phoneE164.replace('+972', '0')], ['מתי לפעול', timingLabel(lead.timing)], ...computed.lines],
  };
  if (advisor) {
    const r = await notifyAdvisor(env, advisor, summary);
    await logEvent(env, id, r.email && r.webhook ? 'delivered' : 'notify_failed', r);
  } else if (status === 'held') {
    await notifyAdminReview(env, summary, `${origin}/admin/?lead=${id}`);
  }
  return { id };
}

export async function ensureAdvisor(env: Env) {
  const existing = await env.DB.prepare('SELECT id, email, webhook_url FROM advisors WHERE active = 1 ORDER BY created_at LIMIT 1').first<{ id: string; email: string | null; webhook_url: string | null }>();
  if (existing) return existing;
  const advisor = { id: 'default', email: env.ADVISOR_EMAIL ?? null, webhook_url: env.ADVISOR_WEBHOOK_URL ?? null };
  await env.DB.prepare('INSERT OR IGNORE INTO advisors (id, name, email, webhook_url) VALUES (?1, ?2, ?3, ?4)')
    .bind(advisor.id, env.ADVISOR_NAME ?? 'Advisor', advisor.email, advisor.webhook_url)
    .run();
  return advisor;
}

export async function deliverHeldLead(env: Env, origin: string, id: string): Promise<boolean> {
  const lead = await env.DB.prepare('SELECT * FROM leads WHERE id = ?1').bind(id).first<Record<string, string | number | null>>();
  if (!lead || lead.status === 'delivered' || !lead.phone_verified) return false;
  const advisor = await ensureAdvisor(env);
  await env.DB.prepare(`UPDATE leads SET status = 'delivered', tier = 'A', advisor_id = ?2, delivered_at = ?3 WHERE id = ?1`).bind(id, advisor.id, new Date().toISOString()).run();
  const inputs = JSON.parse(String(lead.inputs_json)) as Record<string, unknown>;
  const summary: LeadSummary = {
    id,
    kind: lead.kind as 'refinance' | 'buyer',
    firstName: String(lead.first_name),
    phone: String(lead.phone).replace('+972', '0'),
    timing: lead.timing as string | null,
    tier: 'A',
    score: lead.score as number | null,
    statusUrl: `${origin}/lead/${lead.status_token}/`,
    lines: [['טלפון', String(lead.phone).replace('+972', '0')], ['מתי לפעול', timingLabel(String(lead.timing))], ...Object.entries(inputs).map(([k, v]) => [k, String(v)] as [string, string])],
  };
  const r = await notifyAdvisor(env, advisor, summary);
  await logEvent(env, id, 'delivered', { manual: true, ...r });
  return true;
}

export async function logEvent(env: Env, leadId: string, type: string, data: unknown) {
  await env.DB.prepare('INSERT INTO lead_events (lead_id, type, data) VALUES (?1, ?2, ?3)').bind(leadId, type, JSON.stringify(data)).run();
}

export const timingLabel = (t: string) => ({ now: 'עכשיו', months: 'בחודשים הקרובים', checking: 'רק בודק/ת' })[t] ?? t;
