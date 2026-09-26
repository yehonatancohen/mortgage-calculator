# תכל'ס משכנתא: Israeli mortgage refinance calculator

A Hebrew RTL site with free mortgage calculators. The money page (`/`) is a refinance calculator that shows a result first and asks for contact details last. Visitors who opt in become exclusive leads for one mortgage advisor. (Phone verification by SMS is built but currently disabled — see "Phone verification" below.)

Stack:
- **Site:** Astro, with static pages and small vanilla-TS islands.
- **Hosting:** Cloudflare Workers with static assets.
- **Database:** Cloudflare D1.

## Quick start

```sh
npm install
cp .dev.vars.example .dev.vars                            # local secrets (mock SMS, admin password)
npx wrangler d1 migrations apply mortgage-leads --local   # create the local DB
npm run dev                                               # http://localhost:4321
```

In development, the SMS provider is a mock. The code is logged in the terminal and shown under the code boxes.

| Command | What it does |
|---|---|
| `npm run dev` / `npm run build` / `npm run preview` | Dev server / static build + worker / preview on workerd |
| `npm test` | Unit tests: maths, formatting, data-file schema, scoring, lead validation, OTP tokens |
| `npm run check` | Type check (Astro + TypeScript) |
| `npm run todo-verify` | Lists every data value still marked `TODO_VERIFY` (`-- --md` prints a table) |
| `npm run contrast` | WCAG contrast of every colour token pair, both themes |
| `npm run build:fonts` | Rebuilds the self-hosted Heebo subsets |
| `npm run cf-typegen` | Regenerates Worker binding types after editing `wrangler.jsonc` |

## Where things live

```
src/config/site.ts        [BRAND], [DOMAIN], origin, contact, editorial names, Clarity/GSC/Turnstile slots
src/config/calculator.ts  Refinance defaults and input ranges
src/config/consent.ts     Consent wording (versioned) and "what happens next" copy
config/scoring.ts         Lead scoring thresholds, weights, tiers (server-only)
lib/mortgage/             Pure maths: annuity, rate solver, savings range, prepayment fee,
                          schedules, affordability, purchase tax, formatting, phone
lib/scoring/              Pure lead scoring
lib/data/                 Loads data/*.json into typed inputs
data/*.json               Market numbers and methodology parameters (each with source + lastUpdated)
src/ui/                   View models shared by the static HTML and the browser (no hydration drift)
src/scripts/              Client islands: refinance flow, fields, chips, lead gate, analytics, motion
src/server/               Worker code: OTP, SMS providers, lead intake, notifications, guards, admin auth
src/pages/api/            POST /api/otp/send/, /api/otp/verify/, /api/lead/, /api/alert/
src/pages/lead/[token]    Advisor's private status link (contacted / meeting / closed / not relevant)
src/pages/admin/          Operator review of Tier B leads, outcomes per tier, CSV export (Basic auth)
src/content/guides/       Guide outlines (draft, noindex until written)
src/seo/                  JSON-LD builders and the page registry (sitemap, llms.txt, OG images)
migrations/               D1 schema
```

## How a lead flows

1. The visitor sees a result without giving any details. Opting in asks for first name, mobile, timing and an unchecked contact consent (plus a separate optional marketing consent), then submits directly.
2. `POST /api/lead/`:
   - Validates the payload.
   - Recomputes every number on the server, so client figures are never trusted, and scores the lead.
   - Stores it with inputs, results, score breakdown, UTM and entry page.
3. Routing:
   - **Tier A:** delivered to the single advisor, with email plus a signed webhook and a private status link.
   - **Tier B:** held for `/admin`, and the operator is emailed.
   - **Tier C:** nurture list.
   - A repeat phone within 30 days is marked as a duplicate and not redelivered.
4. The visitor never sees the score or tier.

Rate alerts (`/api/alert/`) collect only an email or WhatsApp number, from visitors below the threshold.

### Phone verification (currently disabled)

The lead form used to gate submission behind an SMS one-time code (`/api/otp/send/` → `/api/otp/verify/` → a signed 30-minute token that `/api/lead/` required). That's disabled for now since no SMS provider is configured — leads are stored with `phone_verified = 0` and delivered/held the same as before. All the OTP code and endpoints are still in place; to turn it back on:
1. Configure an SMS provider (`SMS_PROVIDER=http`, `SMS_HTTP_URL`, `SMS_HTTP_AUTH`, `SMS_SENDER` — see `src/server/sms.ts`).
2. In `src/scripts/leadgate.ts`, restore the `sendCode()` + `showStage(root, 'otp')` call in the main form's submit handler (in place of `submitLead()`), so the form goes through the OTP stage before submitting.
3. In `src/pages/api/lead.ts`, restore the hard `if (!verified) return json({ ok: false, error: 'not_verified' }, 401)` check.
4. Set `requireVerifiedPhone: true` back in `config/scoring.ts`.

## Going live checklist

1. **Brand:** set `SITE` in `src/config/site.ts` (brand, domain, `url`, contact, legal name, editorial names).
2. **D1:**
   - Run `npx wrangler d1 create mortgage-leads` and put the id in `wrangler.jsonc`.
   - Run `npx wrangler d1 migrations apply mortgage-leads --remote`.
3. **Secrets:** add each with `npx wrangler secret put <NAME>`:
   - `OTP_SECRET`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`
   - `ADVISOR_NAME`, `ADVISOR_EMAIL`, `ADVISOR_WEBHOOK_URL`, `WEBHOOK_SECRET`
   - `RESEND_API_KEY`, `EMAIL_FROM`
   - `TURNSTILE_SECRET`, `PUBLIC_ORIGIN`
4. **SMS:**
   - Set `SMS_PROVIDER=http` with `SMS_HTTP_URL`, `SMS_HTTP_AUTH` and `SMS_SENDER`.
   - Or implement `SmsProvider` in `src/server/sms.ts` for your Israeli provider.
   - Never set `EXPOSE_DEV_OTP` in production.
5. **Turnstile:** put the public site key in `INTEGRATIONS.turnstileSiteKey`.
6. **Analytics:** put the Clarity id and the Search Console token in `INTEGRATIONS`. Funnel events are pushed to `window.dataLayer`:
   - `step1_complete`, `result_view`
   - `question_taken`, `question_fixed`, `question_goal`, `question_skipped`
   - `lead_gate_view`, `otp_sent`, `otp_verified`, `lead_submitted`
   - `rate_alert_view`, `rate_alert_submitted`, `calculator_used`
   - Every event carries `entry_page`.
7. **Data:** market values are verified (see [Market data and sources](#market-data-and-sources)). Refresh `rates.json` monthly.
8. **Legal:** have a lawyer review `/privacy/` and `/terms/`, then remove `draft` and `noindex`. Fill in the accessibility coordinator in `/accessibility/`.
9. **Content:** the guides (`src/content/guides/*.md`) and bank pages are written. Have them reviewed, fill in the reviewer in `SITE.editorial`, then set `draft: false`. Drafts are noindex and kept out of the sitemap and `llms.txt`.
10. **Deploy:** `npm run build && npx wrangler deploy`.

## Market data and sources

All 22 market values in `data/*.json` were verified on 2026-09-26; `npm run todo-verify` prints 0. Each value carries its exact source URL and a note on how it was derived.

| File | What | Source | Refresh |
|---|---|---|---|
| `rates.json` | Average rates on new loans by track | Bank of Israel monthly report on housing loans (`boi_files/Pikuah/dyYYMMDD.xlsx`, tables 877-1 and 877-2) | Monthly, about two weeks after month end. The guides (`src/content/guides/`) quote these rates with the month; update them too. |
| `rates.json` | `fixedRateByOriginBucket` | BOI series `BNK_99034_LR_BIR_MRTG_467` (edge.boi.gov.il SDMX API) and `mashfix.xls` for loans before 2013 | Only `since2023` moves |
| `purchase-tax.json` | Brackets | Tax Authority real-estate instruction 1/2026 | Single home frozen to 15.1.2028; additional home valid to 31.12.2026, so recheck in January 2027 |
| `prepayment-fee.json` | Operational fee, time discounts, no-notice fee | Banking Order (Early Repayment of Housing Loans), 2002 | When the order is amended |
| `regulation.json` | LTV, payment-to-income, term | Directive 329, version 13 (circular 2852, 30/06/2026) | When the directive is amended |

`assumptions.json` → `switchingCosts` is our own estimate (`internal:methodology`), because no official source publishes a total for appraisal, file opening and lien registration.

When you refresh a value, update `value`, `source`, `lastUpdated` and `note`. If you can't confirm it, set `TODO_VERIFY: true` so the tests flag it.

## Modelling notes

- **Rates:** nominal annual, monthly compounding.
- **Savings range:**
  - The low end uses a higher new rate and the highest fee and switching costs; the high end the reverse. The rate band narrows as the optional questions are answered.
  - Both ends are rounded down to ₪1,000.
  - When the low end is not a meaningful saving, the page shows "עד ₪Y" ("up to ₪Y").
- **Prepayment fee:** estimated for fixed tracks only. The contract rate is capped by the loan's own solved rate.
- **CPI:** linkage is not modelled, and the site says so.
- Full details are on `/methodology/`, which renders live from the data files.
