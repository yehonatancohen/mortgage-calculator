// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { SITE } from './src/config/site.ts';

// Static by default; API routes opt into on-demand rendering with `export const prerender = false`.
export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  // Images are optimized at build time; no Cloudflare Images binding needed.
  adapter: cloudflare({ imageService: 'compile' }),
  build: { inlineStylesheets: 'auto' },
});
