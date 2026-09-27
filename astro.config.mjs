// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { SITE } from './src/config/site.ts';

// Static by default; API routes opt into on-demand rendering with `export const prerender = false`.
export default defineConfig({
  site: SITE.url,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  // Images are optimized at build time; no Cloudflare Images binding needed.
  adapter: cloudflare({
    imageService: 'compile',
    prerenderEnvironment: 'node',
    // Shared with tachles-admin's local D1 state so its beacon (this project's /api/t) and the
    // admin's local dev server see the same local databases. See tachles-admin/README.md.
    persistState: { path: '../.wrangler-shared' },
  }),
  build: { inlineStylesheets: 'auto' },
});
