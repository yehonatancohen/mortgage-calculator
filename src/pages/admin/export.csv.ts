import type { APIRoute } from 'astro';
import { adminAuthorized, unauthorized } from '../../server/auth';
import { getEnv } from '../../server/env';

export const prerender = false;

const COLS = ['id', 'created_at', 'kind', 'first_name', 'phone', 'timing', 'tier', 'score', 'status', 'outcome', 'outcome_at', 'entry_page', 'utm_json', 'inputs_json', 'score_json', 'scoring_version'] as const;
const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Neutralize spreadsheet formulas and quote everything.
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

export const GET: APIRoute = async ({ request }) => {
  const env = getEnv();
  if (!(await adminAuthorized(env, request))) return unauthorized();
  const { results } = await env.DB.prepare(`SELECT ${COLS.join(', ')} FROM leads ORDER BY created_at DESC`).all<Record<string, unknown>>();
  const csv = '﻿' + [COLS.join(','), ...results.map((r) => COLS.map((c) => cell(r[c])).join(','))].join('\r\n');
  return new Response(csv, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="leads.csv"', 'cache-control': 'no-store' },
  });
};
