/**
 * Brand and domain: the ONE place to swap the placeholders.
 * Everything else (titles, schema.org, llms.txt, OG images, emails) reads from here.
 */
export const SITE = {
  brand: '[BRAND]',
  domain: '[DOMAIN]',
  /** Canonical origin. Replace with https://<your domain>. Must be a valid URL for the build. */
  url: 'https://example.com',
  locale: 'he-IL',
  lang: 'he',
  dir: 'rtl',
} as const;
