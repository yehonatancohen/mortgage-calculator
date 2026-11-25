#!/usr/bin/env node
/**
 * IndexNow: tell Bing (and Yandex, Naver, Seznam...) that pages changed, so they recrawl
 * within minutes instead of waiting to rediscover the sitemap. Google does not take part.
 *
 * The key is public by design and is served from public/<KEY>.txt. Only ping AFTER the
 * deploy that changed the pages is live — the engines fetch the page right away.
 *
 * Usage:
 *   node scripts/indexnow.mjs /guides/foo/ /calculators/bar/   # specific pages (paths or full URLs)
 *   node scripts/indexnow.mjs --days=7                         # sitemap URLs with lastmod in the last 7 days
 *   node scripts/indexnow.mjs --all                            # every URL in the live sitemap
 *   add --dry-run to print the payload without sending it
 */

const SITE = 'https://tachles-mashkanta.co.il';
const KEY = '37258c742ccd41c4764665584bf86dc1';
const SITEMAP = `${SITE}/sitemap.xml`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const flagValue = (name) => flag(name)?.split('=')[1];
const dryRun = Boolean(flag('dry-run'));
const explicit = args.filter((a) => !a.startsWith('--'));

/** Pull <loc>/<lastmod> pairs out of a sitemap or sitemap index (recursively). */
export async function readSitemap(url, seen = new Set()) {
  if (seen.has(url)) return [];
  seen.add(url);
  const res = await fetch(url, { headers: { 'user-agent': 'indexnow-script' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const xml = await res.text();
  const blocks = [...xml.matchAll(/<(url|sitemap)>([\s\S]*?)<\/\1>/g)];
  const out = [];
  for (const [, kind, body] of blocks) {
    const loc = body.match(/<loc>\s*([^<]+?)\s*<\/loc>/)?.[1]?.replace(/&amp;/g, '&');
    const lastmod = body.match(/<lastmod>\s*([^<]+?)\s*<\/lastmod>/)?.[1];
    if (!loc) continue;
    if (kind === 'sitemap') out.push(...(await readSitemap(loc, seen)));
    else out.push({ loc, lastmod });
  }
  return out;
}

/** Absolute URLs on SITE's host only (IndexNow rejects a batch with foreign hosts). */
export function toSiteUrls(list) {
  const host = new URL(SITE).host;
  const urls = new Set();
  for (const item of list) {
    const u = new URL(item, SITE);
    u.hash = '';
    if (u.host === host) urls.add(u.href);
    else console.warn(`skipping ${item}: not on ${host}`);
  }
  return [...urls];
}

async function main() {
  let urls;
  if (explicit.length) {
    urls = toSiteUrls(explicit);
  } else if (flag('all') || flag('days')) {
    const entries = await readSitemap(SITEMAP);
    const days = Number(flagValue('days'));
    const cutoff = flag('days') ? Date.now() - days * 86_400_000 : null;
    urls = toSiteUrls(
      entries
        .filter((e) => cutoff === null || (e.lastmod && Date.parse(e.lastmod) >= cutoff))
        .map((e) => e.loc),
    );
  } else {
    console.error('Give page paths/URLs, --days=N or --all. See the header of this file.');
    process.exit(2);
  }

  if (!urls.length) {
    console.log('Nothing to submit.');
    return;
  }

  const payload = {
    host: new URL(SITE).host,
    key: KEY,
    keyLocation: `${SITE}/${KEY}.txt`,
    urlList: urls.slice(0, 10_000),
  };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });
  // 200 = accepted, 202 = accepted while the key is still being verified (normal on first use).
  const body = await res.text();
  console.log(`IndexNow: HTTP ${res.status} for ${payload.urlList.length} URL(s)${body ? ` — ${body.slice(0, 300)}` : ''}`);
  if (res.status >= 300) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
