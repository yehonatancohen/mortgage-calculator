import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Guides. `draft: true` pages render (for review) but are noindex and left out of the
 * sitemap and llms.txt until the content is written and reviewed.
 */
const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** One or two sentences that answer the query directly (shown under the H1). */
    answer: z.string(),
    published: z.string(),
    updated: z.string(),
    draft: z.boolean().default(true),
    related: z.array(z.object({ href: z.string(), title: z.string(), text: z.string() })).default([]),
    order: z.number().default(100),
  }),
});

export const collections = { guides };
