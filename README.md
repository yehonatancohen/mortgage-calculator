# [BRAND]: Israeli mortgage refinance calculator

Hebrew RTL site built with Astro (static) on Cloudflare (Workers static assets + D1). The brand name and domain are set once, in `src/config/site.ts`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Static build to `dist/client` (plus the worker in `dist/server`) |
| `npm test` | Unit tests: math, formatting, data-file schema |
| `npm run todo-verify` | Lists every data value still marked `TODO_VERIFY` (`-- --md` prints a table) |
| `npm run contrast` | Checks WCAG contrast for every token pair in both themes |
| `npm run build:fonts` | Rebuilds the Heebo subsets in `public/fonts/` |
| `npm run font-audit` | Tabular-digit and ₪ coverage check for candidate fonts |

## Layout

```
lib/mortgage/     Pure math (no DOM/Node APIs): annuity, rate solver, savings range,
                  prepayment-fee estimate, schedules, affordability, purchase tax, formatting, phone
lib/data/         Loads data/*.json → typed inputs (percent → fraction happens here only)
data/*.json       Market numbers and methodology parameters. Every value: source + lastUpdated
src/styles/       tokens.css (design tokens), base.css, components.css
src/pages/dev/    /dev/tokens/: noindex token specimen, both themes
```

Rate convention: nominal annual rate, monthly compounding (monthly = annual / 12).

## Values to verify before launch

Run `npm run todo-verify -- --md` for the current list. At the end of phase 1 there are 22:

- **Bank of Israel:**
  - track rates and their period (`rates.json`)
  - fixed-rate ranges by origination period (`rates.json`)
  - prepayment-fee operational fee, time discounts and notice discount (`prepayment-fee.json`)
  - LTV limits, payment-to-income cap and max term (`regulation.json`)
  - switching costs (`assumptions.json`)
- **Israel Tax Authority:** purchase-tax brackets and their `validFrom` date (`purchase-tax.json`). The current brackets are round-number placeholders, not the real table.
