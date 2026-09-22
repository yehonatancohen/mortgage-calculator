import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { allPages } from '../seo/pages';

export const GET: APIRoute = async () => {
  const pages = (await allPages()).filter((p) => p.index);
  const urls = pages
    .map((p) => `  <url>\n    <loc>${new URL(p.path, SITE.url).href}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n  </url>`)
    .join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
