/**
 * Post-build guard for URL hygiene (run after `npm run build`).
 * Calculator variants such as /?b=…&p=…&y=… are created in the browser only (history.replaceState),
 * so crawlers must never be given a reason to index them. This checks that:
 *  - every built page declares a canonical URL without a query string,
 *  - the sitemap lists no URL with a query string,
 *  - no built page links internally to a parameterised calculator URL.
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
for (const f of pages) {
  const html = fs.readFileSync(f, 'utf8');
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (!canonical) errors.push(`${f}: no canonical`);
  else if (/[?#]/.test(canonical)) errors.push(`${f}: canonical has a query/fragment: ${canonical}`);
  for (const m of html.matchAll(/href="(\/[^"]*\?[^"]*)"/g)) errors.push(`${f}: internal link with query string: ${m[1]}`);
}
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const m of sitemap.matchAll(/<loc>([^<]*\?[^<]*)<\/loc>/g)) errors.push(`sitemap.xml: ${m[1]}`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`seo-check: ${pages.length} pages OK (canonical without query, clean sitemap, no parameterised internal links)`);
