/**
 * Brand and domain: the ONE place to swap the placeholders.
 * Everything else (titles, schema.org, llms.txt, OG images, emails) reads from here.
 */
export const SITE = {
  brand: "תכל'ס משכנתא",
  domain: 'tachles-mashkanta.co.il',
  /** Canonical origin. Replace with https://<your domain>. Must be a valid URL for the build. */
  url: 'https://tachles-mashkanta.co.il',
  locale: 'he-IL',
  lang: 'he',
  dir: 'rtl',
  /** Short description used in the footer, Organization schema and llms.txt. */
  tagline: 'מחשבוני משכנתא שקופים ובדיקה חינם מול יועץ משכנתאות עצמאי.',
  /** Public contact path. The actual inbox is a server secret (CONTACT_EMAIL / ADMIN_EMAIL), never checked in. */
  contactPath: '/contact/',
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
