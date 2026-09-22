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
  /** Short description used in the footer, Organization schema and llms.txt. */
  tagline: 'מחשבוני משכנתא שקופים ובדיקה חינם מול יועץ משכנתאות עצמאי.',
  /** Contact for the accessibility statement and privacy requests. Replace before launch. */
  contactEmail: 'contact@example.com',
  /** Legal entity shown on legal pages. Replace before launch. */
  legalName: '[LEGAL ENTITY NAME]',
  /** Author / reviewer shown on articles (Article schema). Replace with real, qualified people. */
  editorial: {
    author: { name: '[AUTHOR NAME]', title: '[AUTHOR ROLE]' },
    reviewer: { name: '[REVIEWER NAME]', title: 'יועץ/ת משכנתאות מוסמך/ת' },
  },
} as const;

/** Third-party slots. Leave empty to disable. None of them may block rendering. */
export const INTEGRATIONS = {
  /** Microsoft Clarity project id (loaded after the page is idle). */
  clarityId: '',
  /** Google Search Console HTML-tag verification token. */
  googleSiteVerification: '',
  /** Cloudflare Turnstile site key (public). Server secret: TURNSTILE_SECRET. */
  turnstileSiteKey: '',
} as const;

export const NAV = [
  { href: '/calculators/', label: 'מחשבונים' },
  { href: '/ribit-mashkanta-hayom/', label: 'ריבית היום' },
  { href: '/guides/', label: 'מדריכים' },
] as const;
