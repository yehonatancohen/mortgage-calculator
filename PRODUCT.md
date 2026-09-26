# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- **Astro, static output.** Calculators are small interactive islands. Vanilla TypeScript is the island choice, because it keeps calculator JS far under the 30KB gzip budget.
- **Deploy:** Cloudflare (chosen as "Pages + D1"). The current `@astrojs/cloudflare` adapter targets Workers with static assets, which is Cloudflare's successor to Pages: static HTML is served as assets, and on-demand routes (`prerender = false`) handle lead intake, OTP, scoring and admin.
- **Store:** Cloudflare D1 (SQLite). It runs on the same vendor as the deploy target, has zero ops, a Tel Aviv edge, and is plenty for lead volume.
- **Bot protection:** Cloudflare Turnstile (phase 5).
- **Math:** a pure, framework-free module at `lib/mortgage/`, unit-tested with Vitest. The same module runs at build time (worked examples), in the browser (islands) and in Functions (server recomputes every number; client numbers are never trusted).
- **Placeholders:** `[BRAND]` and `[DOMAIN]` are defined once, in `src/config/site.ts`.

## Users

- **Primary:** Israeli homeowners aged 30–60 with an existing mortgage, many of them on mobile. They are anxious about money and suspicious of lead-gen sites. Their job is to find out, quickly and without giving anything away, whether refinancing (מחזור משכנתא) would save them money, and how much.
- **Secondary:** serious home buyers checking how much mortgage they can get, what they will pay monthly, and what purchase tax they will owe.
- **Internal:** one mortgage advisor at launch receives exclusive Tier A leads and marks each outcome through a private status link. The site operator reviews Tier B leads and recalibrates scoring in a private admin page.

## Product Purpose

- A free, honest refinance calculator shows real results before it asks for anything.
- At the end, it offers a free check by one independent mortgage advisor.
- Users who accept and verify their phone by OTP become exclusive, pre-qualified leads.
- Success means organic traffic from Google, citations by AI assistants (ChatGPT, Perplexity, Google AI Overviews), and high-quality leads whose outcomes feed back into scoring.

## Positioning

- **Value first, contact last.** Users see their full result, a savings range, with no contact details asked.
- **Honest about the numbers.**
  - Savings are shown as a range, because CPI linkage makes a single number dishonest.
  - When there is no saving, the page says so.
  - Every result shows its assumptions.
- **Exclusive:** a lead goes to exactly one advisor and is never sold to multiple parties.

## Operating Context

- Users arrive from search or AI answers, often on a phone, sometimes after visiting a bank's site.
- They already know their remaining balance, monthly payment and years left from their bank statement or app. Many do not know their tracks or their rate.
- The site operator swaps in the real brand, domain and SMS provider, and refreshes the rates monthly. Any unverified market value is flagged `TODO_VERIFY` in `data/*.json`.

## Capabilities and Constraints

- **Refinance flow on `/`:**
  1. Three inputs
  2. Instant result
  3. Optional accuracy questions
  4. Lead gate: first name, Israeli mobile, SMS OTP, timing chip, unchecked advisor-contact consent, separate optional marketing consent
- **Below threshold:** users are never rejected visibly; the lead gate becomes a rate alert (email or WhatsApp).
- **Server-side scoring and routing:**
  - All thresholds and weights live in `config/scoring.ts`.
  - Hard filters: balance ≥ ₪300,000 and OTP verified.
  - Tiers A/B/C. A goes to the single configured advisor; the schema supports more advisors later. B goes to manual review in `/admin`. C goes to nurture.
  - Scoring and tier are never exposed to users.
- **Other calculators:** prepayment fee, monthly payment, how much mortgage (buyer lead path), purchase tax, amortization (Spitzer vs equal principal). The site also has a monthly rates page, guides, informational bank pages (no bank logos or branding) and a methodology page.
- **Data rule:** market numbers are never hard-coded. Each value carries `source`, `lastUpdated` and, where unverified, `TODO_VERIFY: true`.
- **Disclaimer:** results are an estimate, not financial advice. The calculator shows it in one line; the methodology page has the full text.
- **Budgets:**
  - Calculator JS ≤ 30KB gzip
  - LCP < 1.5s on mid-range mobile over 4G
  - CLS ≈ 0
  - Lighthouse 95+
  - Self-hosted subset fonts
- **SEO/GEO:** every calculator's static HTML contains a rendered worked example with real numbers. Pages carry schema.org JSON-LD, sitemap, a robots.txt allowing AI crawlers, and `llms.txt`.
- **Undecided:**
  - The SMS provider (behind an interface)
  - The advisor email provider
  - The WhatsApp integration (later)
  - The real brand name and domain

## Brand Commitments

- **Personality:** official, clear, calm, precise, quietly modern. Three words: **trustworthy, effortless, exact**.
- **Voice:** short, plain, direct Hebrew. No unnecessary word. Gender-inclusive slash forms where addressing the user (תרצה/י, בודק/ת).
- **Visual standing preference (chosen 2026-09-22):** the category standard, executed at full craft, with no novelty world. The craft bar is **Wise** (live calculators, honest breakdowns), **GOV.UK** (one question per page, plain official clarity) and **Monzo / Revolut** (mobile money UI, big-number hero, thumb-reach actions).
- **Anti-references:** loud banking ads, stock photos of smiling families with keys, gradients everywhere, generic SaaS hero sections, "AI slop" card grids, pushy pop-ups.

## Evidence on Hand

- There are no testimonials, customer counts, press, advisor names or licences yet. Do not fabricate any of them.
- Market data (benchmark rates, purchase-tax brackets, LTV/PTI limits, prepayment-fee parameters) were verified against Bank of Israel and Tax Authority sources on 2026-09-26. Rates need a monthly refresh.

## Product Principles

1. **Value before contact.** Nothing is asked for until the user has seen a real result.
2. **Honesty over conversion.** Show ranges, show assumptions, say "no saving" when true, and never show fake savings.
3. **One obvious next step.** One primary action per screen, always in the same place.
4. **Exact and calm.** Correct, tested numbers; nothing jumps, and motion only explains change.
5. **Readable by machines too.** Answer-first content with dated figures, rendered statically.

## Accessibility & Inclusion

- WCAG 2.x AA in both light and dark themes, and an accessibility statement page (Israeli regulation, IS 5568).
- Hebrew RTL first and mobile first.
- Full keyboard support, visible focus, labeled inputs, and `aria-live` on results.
- `prefers-reduced-motion` is respected everywhere.
