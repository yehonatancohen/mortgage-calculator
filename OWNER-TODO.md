# Owner to-do before launch

Things only you can supply or decide. Everything else (market data, guide text, calculator logic) is done and verified as of 2026-09-26.

## 1. Brand and identity

File: `src/config/site.ts`

- [ ] `domain` and `url`: the real domain (the build uses `url` for canonical links, sitemap and OG images).
- [ ] `contactEmail`: a real inbox you read. It appears on the about, privacy and accessibility pages.
- [ ] `legalName`: the legal entity that runs the site (company or licensed business). Shown on the privacy and terms pages.
- [ ] `editorial.author`: name and role of whoever writes the content.
- [ ] `editorial.reviewer`: name of a real, qualified mortgage advisor who reviews the guides. This drives the Article schema and E-E-A-T signals. Don't use a made-up name.

## 2. About page

File: `src/pages/about.astro` (look for `TODO(content)`)

- [ ] Company details: who you are, where you're registered.
- [ ] Team: real people only.
- [ ] Reviewer credentials: what qualification or certification the advisor holds.

## 3. Accessibility statement

File: `src/pages/accessibility.astro`

- [ ] Name of the accessibility coordinator (currently `[שם רכז/ת הנגישות]`).
- [ ] Coordinator phone (currently `[טלפון]`).
- [ ] Date of the last accessibility audit. This is required under the Equal Rights for Persons with Disabilities Regulations and IS 5568. If no audit has been done yet, arrange one.

## 4. Privacy and legal (needs a lawyer)

File: `src/pages/privacy.astro` (look for `TODO(legal)`). The page is `draft` and `noindex` until a lawyer approves it.

- [ ] **Retention period:** how long you keep leads and rate-alert signups, and when you delete them.
- [ ] **Data location:** where Cloudflare stores the D1 database (region).
- [ ] **SMS provider:** choose one, then name it on the page (see section 5).
- [ ] **Clarity consent:** if you turn on Microsoft Clarity (`INTEGRATIONS.clarityId`), decide how you ask for consent. The page text switches automatically when Clarity is on.
- [ ] **Lawyer review:** have an Israeli privacy lawyer review `/privacy/` and `/terms/` (Privacy Protection Law, Amendment 13). Then remove `draft` and `noindex` from both pages.
- [ ] **Consent wording:** review `src/config/consent.ts` with the lawyer too. Bump `version` if the wording changes.

## 5. Providers and integrations

- [ ] **SMS provider** for OTP codes: pick an Israeli gateway and set `SMS_PROVIDER`, `SMS_HTTP_URL`, `SMS_HTTP_AUTH` and `SMS_SENDER` (see `src/server/sms.ts`).
- [ ] **Resend:** set `RESEND_API_KEY` and `EMAIL_FROM` for the advisor emails.
- [ ] **Cloudflare D1:** create the database and put its id in `wrangler.jsonc` (`REPLACE_WITH_D1_DATABASE_ID`).
- [ ] **Turnstile:** add the site key to `INTEGRATIONS.turnstileSiteKey` and the secret to `TURNSTILE_SECRET`.
- [ ] **Search Console:** add the verification token to `INTEGRATIONS.googleSiteVerification`.
- [ ] **Advisor:** configure the advisor who receives Tier A leads (email and webhook).
- [ ] **Call-back promise:** check `NEXT_STEPS` in `src/config/consent.ts` ("תוך יום עסקים אחד"). It must match what the advisor actually does.

## 6. Guides

Files: `src/content/guides/*.md`. All four are written but still `draft: true`, so they're hidden from search, the sitemap and `llms.txt`.

- [ ] Have the reviewer (section 1) read all four for accuracy.
- [ ] Set `draft: false` on each one after it's approved.
- [ ] Decide whether the advisor-fee guide (`kama-ole-yoetz-mashkantaot.md`) should include real price ranges. Only add them with a dated, citable source.

## 7. Bank pages

File: `src/config/banks.ts`

- [ ] The bank pages carry only general, verified rules. Review them, then set `draft: false` per bank.

## 8. Recurring upkeep

- [ ] **Monthly (about the 15th):** refresh `data/rates.json` from the Bank of Israel monthly report on housing loans. Update the August 2026 figures quoted in the guides at the same time. See the "Market data and sources" section in `README.md`.
- [ ] **January 2027:** the additional-home purchase-tax brackets expire on 31.12.2026. Check the Tax Authority's new instruction and update `data/purchase-tax.json`.
- [ ] **When the Bank of Israel amends Directive 329 or the early-repayment order:** update `data/regulation.json` or `data/prepayment-fee.json`.
- [ ] **Switching costs** (`data/assumptions.json`, ₪2,000–6,000) are our own estimate. Refine them if the advisor has real figures for appraisal, file opening and lien registration.

## 9. Deploy

- [ ] `npm run build && npx wrangler deploy`
