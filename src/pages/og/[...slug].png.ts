/**
 * Open Graph image per page, rendered at build time (1200×630 PNG) with resvg and Heebo.
 * /og/index.png is the home page; /og/calculators/monthly-payment.png, etc.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import fs from 'node:fs';
import { Resvg, type ResvgRenderOptions } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';
import { SITE } from '../../config/site';
import { allPages, type PageEntry } from '../../seo/pages';

export const getStaticPaths: GetStaticPaths = async () =>
  (await allPages()).map((p) => ({ params: { slug: p.path === '/' ? 'index' : p.path.replace(/^\/|\/$/g, '') }, props: { page: p } }));

let fonts: Buffer[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const base = 'node_modules/@fontsource/heebo/files/';
  const files = ['hebrew-700', 'latin-700', 'hebrew-400', 'latin-400'].map((f) => `${base}heebo-${f}-normal.woff2`);
  fonts = await Promise.all(files.map(async (f) => Buffer.from(await decompress(fs.readFileSync(f)))));
  return fonts;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Greedy word wrap by character budget (Hebrew glyphs are close to uniform width in Heebo). */
function wrap(text: string, max: number, lines: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if ((line + ' ' + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else line = (line + ' ' + word).trim();
  }
  if (line) out.push(line);
  if (out.length > lines) {
    const kept = out.slice(0, lines);
    kept[lines - 1] = `${kept[lines - 1]!.replace(/\s+\S*$/, '')}…`;
    return kept;
  }
  return out;
}

function svg(p: PageEntry) {
  const title = wrap(p.title, 20, 2);
  const desc = wrap(p.description, 46, 2);
  const x = 1100;
  const titleY = title.length === 1 ? 300 : 260;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f3f6f8"/>
  <rect x="0" y="0" width="1200" height="8" fill="#005971"/>
  <g transform="translate(1036 72)"><rect width="64" height="64" rx="16" fill="#005971"/><path d="M18 35l9 9 19-22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>
  <text x="1012" y="116" font-family="Heebo" font-weight="700" font-size="34" text-anchor="end" direction="rtl" fill="#171f25">${esc(SITE.brand)}</text>
  ${title.map((l, i) => `<text x="${x}" y="${titleY + i * 84}" font-family="Heebo" font-weight="700" font-size="72" text-anchor="end" direction="rtl" fill="#171f25">${esc(l)}</text>`).join('')}
  ${desc.map((l, i) => `<text x="${x}" y="${titleY + title.length * 84 + 24 + i * 46}" font-family="Heebo" font-size="34" text-anchor="end" direction="rtl" fill="#4a545a">${esc(l)}</text>`).join('')}
  <text x="100" y="560" font-family="Heebo" font-size="28" text-anchor="start" fill="#5f686d">${esc(SITE.domain)}</text>
</svg>`;
}

export const GET: APIRoute = async ({ props }) => {
  // fontBuffers is supported at runtime (resvg-js ≥ 2.5) but missing from the published types.
  const opts = { font: { fontBuffers: await loadFonts(), loadSystemFonts: false, defaultFontFamily: 'Heebo' }, fitTo: { mode: 'width', value: 1200 } } as unknown as ResvgRenderOptions;
  const r = new Resvg(svg(props.page as PageEntry), opts);
  return new Response(new Uint8Array(r.render().asPng()), { headers: { 'content-type': 'image/png' } });
};
