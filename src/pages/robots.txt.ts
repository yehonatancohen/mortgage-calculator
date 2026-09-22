import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

/** Search engines and AI assistants are welcome everywhere except private and API routes. */
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Bingbot',
  'CCBot',
];

export const GET: APIRoute = () => {
  const privatePaths = ['/admin/', '/lead/', '/api/', '/dev/'];
  const rules = (agent: string) => [`User-agent: ${agent}`, 'Allow: /', ...privatePaths.map((p) => `Disallow: ${p}`)].join('\n');
  const body = [rules('*'), ...AI_CRAWLERS.map(rules), `Sitemap: ${new URL('/sitemap.xml', SITE.url).href}`].join('\n\n');
  return new Response(`${body}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
