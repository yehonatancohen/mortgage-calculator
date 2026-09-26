# Owner to-do before launch

Things only you can supply or decide. Everything else (market data, guide text, calculator logic) is done and verified as of 2026-09-26.

## 1. Brand and identity

File: `src/config/site.ts`

- [x] `domain` and `url`: set to `tachles-mashkanta.co.il`.
- [x] Owner decided: no legal entity name, author, or reviewer identity is published anywhere on the site. `editorial.author`/`editorial.reviewer` were removed from `site.ts` and from the Article schema (`src/seo/schema.ts`) rather than left as placeholders.
- [x] The **only** place the owner's own contact info appears is the accessibility coordinator email on `/accessibility/`, by explicit request. No other page should carry personal info.

## 2. About page

File: `src/pages/about.astro`

- [x] Owner decided not to add company/team/reviewer details. Left as a general "what we do" page with no identifying info.

## 3. Accessibility statement

File: `src/pages/accessibility.astro`

- [x] Contact is the owner's email (`yoncohenyon@gmail.com`), by explicit request — the one exception to "no personal info on the site."
- [ ] Date of the last accessibility audit, if one is ever performed (required under the Equal Rights for Persons with Disabilities Regulations and IS 5568). Currently unaudited.

## 4. Privacy and legal

File: `src/pages/privacy.astro`, `src/pages/terms.astro`

- [x] Owner decided to index these now without a lawyer review; the legal-review TODOs (SMS provider name, retention period, Clarity consent wording) were removed as not required.
- [ ] If you change your mind, an Israeli privacy lawyer should still review both against the Privacy Protection Law (Amendment 13) at some point.

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
