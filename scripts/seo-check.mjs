/**
 * Post-build guard for URL hygiene (run after `npm run build`).
 * Calculator variants such as /?b=…&p=…&y=… are created in the browser only (history.replaceState),
 * so crawlers must never be given a reason to index them. This checks that:
 *  - every built page declares a canonical URL without a query string,
 *  - the sitemap lists no URL with a query string,
 *  - no built page links internally to a parameterised calculator URL,
 *  - titles are <= 70 chars, descriptions are 70-170 chars, and every indexable page is in the sitemap.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = fs.existsSync('dist/client') ? 'dist/client' : 'dist';
const pages = [];
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) pages.push(p);
  }
};
walk(root);

const errors = [];
const sitemapXml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const decode = (t) => t.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (!canonical) errors.push(`${f}: no canonical`);
  else if (/[?#]/.test(canonical)) errors.push(`${f}: canonical has a query/fragment: ${canonical}`);
  const title = html.match(/<title>([^<]*)/)?.[1];
  const desc = html.match(/<meta name="description" content="([^"]*)/)?.[1];
  if (!/<meta name="robots"[^>]*noindex/.test(html)) {
    if (title && decode(title).length > 70) errors.push(`${f}: title ${decode(title).length} chars`);
    const dl = desc ? decode(desc).length : 0;
    if (dl < 70 || dl > 170) errors.push(`${f}: description ${dl} chars`);
    if (canonical && !sitemapXml.includes(`<loc>${canonical}</loc>`)) errors.push(`${f}: indexable but not in sitemap`);
  }
  for (const m of html.matchAll(/href="(\/[^"]*\?[^"]*)"/g)) errors.push(`${f}: internal link with query string: ${m[1]}`);
}
const sitemap = sitemapXml;
for (const m of sitemap.matchAll(/<loc>([^<]*\?[^<]*)<\/loc>/g)) errors.push(`sitemap.xml: ${m[1]}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`seo-check: ${pages.length} pages OK (canonical, clean sitemap, title/description length, indexable pages in sitemap)`);
