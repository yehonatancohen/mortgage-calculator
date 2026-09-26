---
name: "תכל'ס משכנתא mortgage calculators"
description: "Honest Hebrew mortgage calculators: one white card that answers before it asks."
colors:
  bg: "oklch(0.972 0.004 222)"
  surface: "oklch(1 0 0)"
  surface-2: "oklch(0.955 0.006 222)"
  border: "oklch(0.885 0.008 222)"
  border-strong: "oklch(0.6 0.012 222)"
  text: "oklch(0.235 0.016 235)"
  text-2: "oklch(0.44 0.016 235)"
  text-3: "oklch(0.51 0.014 235)"
  accent: "oklch(0.43 0.085 222)"
  accent-hover: "oklch(0.37 0.08 222)"
  accent-ink: "oklch(0.41 0.085 222)"
  accent-soft: "oklch(0.95 0.018 222)"
  on-accent: "oklch(1 0 0)"
  focus: "oklch(0.52 0.12 222)"
  savings: "oklch(0.47 0.12 155)"
  savings-soft: "oklch(0.955 0.03 155)"
  attention: "oklch(0.49 0.11 65)"
  attention-soft: "oklch(0.96 0.03 80)"
  hero: "oklch(0.36 0.07 222)"
  on-hero: "oklch(0.99 0.003 222)"
  on-hero-2: "oklch(0.88 0.028 222)"
typography:
  display:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 1.95rem + 2.6vw, 3.75rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "'tnum', 'lnum'"
  headline:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.45rem + 1.3vw, 2.25rem)"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
    fontFeature: "'tnum', 'lnum'"
  title:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
    fontFeature: "'tnum', 'lnum'"
  title-small:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    fontFeature: "'tnum', 'lnum'"
  body:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "'tnum', 'lnum'"
  label:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.6
    fontFeature: "'tnum', 'lnum'"
  meta:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum', 'lnum'"
  legal:
    fontFamily: "Heebo, 'Heebo Fallback', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum', 'lnum'"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "1rem"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
  "12": "3rem"
  "16": "4rem"
  "20": "5rem"
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "1.5rem 1.25rem"
    width: "34rem"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.25rem"
    height: "3.25rem"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1.25rem"
    height: "2.75rem"
  button-secondary-hover:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    typography: "{typography.label}"
    padding: "0.5rem"
    height: "2.75rem"
  input-amount:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.title-small}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "3.25rem"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.5rem 1rem"
    height: "2.75rem"
  chip-selected:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
  chip-stacked:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "3.25rem"
    width: "100%"
  result-figure:
    textColor: "{colors.savings}"
    typography: "{typography.display}"
  result-figure-neutral:
    textColor: "{colors.text}"
    typography: "{typography.display}"
  recap:
    backgroundColor: "{colors.savings-soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  live-result-panel:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "1rem"
  notice:
    backgroundColor: "{colors.attention-soft}"
    textColor: "{colors.text}"
    typography: "{typography.meta}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
---

# Design System: תכל'ס משכנתא mortgage calculators

## Overview

**Creative North Star: "The Honest Statement"**

The system reads like a well-set bank statement written for the account holder rather than the bank. A cool, near-neutral grey ground holds one white card with a hairline border and a single soft shadow. Near-black ink carries the text, and the only colours are the ones that mean something: a deep petrol for what you can press, and a savings green that appears only on money you would keep. It is the category standard executed at Wise / GOV.UK / Monzo craft, in right-to-left Hebrew. It answers before it asks.

Density is calm and single-minded. Every surface is one 34rem column with one shared start edge. Within it, each step has one primary action pinned to the card's footer. Figures are the heroes: tabular, isolated left-to-right inside Hebrew, rounded down honestly, and they count in place instead of jumping. Motion is short and settles quickly (150/220/350ms on an expo-like ease-out), and all of it collapses to instant under reduced motion. Light and dark themes share every role; dark follows the system preference unless the visitor forces a theme.

The system rejects the lead-gen arrangement: no hero image, no form above the answer, no pop-up, no badges or testimonial counts standing in for proof. The result and its assumptions are the proof.

**Key Characteristics:**
- One deep petrol hero band (header, crumbs, title) that the white card rises out of, overlapping its lower edge; below it, a cool grey ground.
- One white card with a hairline border and one soft shadow.
- Petrol accent on interactive affordances only; savings green on money saved only; data graphics in ink.
- One Heebo variable family at three weights (400/500/700), tabular numerals everywhere.
- One 34rem calculator column with a shared start edge; one primary action per step. On desktop (≥64rem) it gains a real second column: "how it works" sits beside the card instead of empty margin.
- Short, calm motion that tells state (count-up, step transitions, bar morphs) and disappears under reduced motion.

## Colors

A cool, low-chroma neutral set tinted toward petrol (hue ≈222), with exactly two voices of colour, each bound to one meaning. All values are OKLCH in `src/styles/tokens.css`; `scripts/contrast.mjs` checks every text/background pair in both themes.

### Primary
- **Deep Petrol** (accent): fills the primary button, the active part of every slider, and the slider thumb ring. **Petrol Ink** (accent-ink) is the text variant for links, secondary buttons, the disclosure toggle, the next-step arrow and selected chip labels. **Petrol Mist** (accent-soft) is the selected-chip fill, secondary-button hover and text selection. **Deep Petrol Pressed** (accent-hover) is the primary button's hover. **Clear Petrol** (focus) draws every focus ring and the 3px input focus halo.

### Secondary
- **Kept-Money Green** (savings): the result figure, the live preview range in the card footer, the per-question live figure and the recap figure on the lead step. **Kept-Money Wash** (savings-soft) sits behind the recap line only.

### Tertiary
- **Amber Caution** (attention): invalid-field borders and hints, form errors, and a result sentence that cannot be computed. It appears after blur, never while typing. **Amber Wash** (attention-soft) is the inline notice background.

### Neutral
- **Cool Paper** (bg): the page ground, header background, and the track colour of the page scrollbar.
- **Card White** (surface): cards, inputs, chips, table wraps and the sticky card footer.
- **Pale Slate** (surface-2): the live-result panel inside question steps, table header rows, example captions, the meter track and the footer band.
- **Hairline** (border): card, table, FAQ and footer rules; the sticky footer's top edge.
- **Steel Edge** (border-strong): input, chip and secondary-button strokes (3.9:1 on white).
- **Statement Ink** (text): body text, headings, the after-refinance bar's solid segment, the slider value bubble.
- **Slate Ink** (text-2): labels on the result, hints, meta lines, the meter fill.
- **Faint Slate** (text-3): legal lines, slider scale, question counter and the "today" bar in the before/after comparison (still 5.7:1 on white).

### Named Rules
**The Petrol Means Press Rule.** Petrol marks interactive affordances only: primary buttons, focus rings, the active slider fill and thumb, links, the secondary button, selected chips, hover borders on chips and the next-step card, the current-page underline in the navigation, the disclosure toggle, caret and text selection. It never colours a figure, a data graphic, a surface or a decoration, with one exception: the hero band.

**The One Band Rule.** On calculator pages, the header, breadcrumbs, h1 and answer line sit on one continuous Deep Harbour band (`--c-hero`, a deeper, calmer petrol than the button). White ink (`on-hero`) carries the h1 and the brand, and Mist Ink (`on-hero-2`) carries the answer line, the nav and the crumbs; focus rings and the current-nav underline turn white on it. The card overlaps the band's bottom by 48px (80px from 40rem), so the band frames the calculator instead of competing with it. The band is flat, with no gradient, photo or pattern, and it appears once per page. Its one image is the **skyline** (`HeroArt.astro`): a line drawing in the icon grammar (2px round strokes) of a Bauhaus block with a rooftop solar water heater, a tower and a gabled house, in Mist Ink at 55% with a 6% fill. It stands on the band's lower edge in the empty space beside the column, from 64rem up only; phones skip it. Never replace it with a stock photo. Prose pages keep the quiet paper header. In dark mode the band drops to a deep, low-chroma petrol, so it reads as a tone rather than a light.

**The Green Is Money Rule.** Savings green appears only on money saved: the result range, the live preview, the per-question figure and the recap. When there is no saving, the figure turns to ink (or Slate Ink in the preview), never green.

**The Ink Graphics Rule.** Data graphics are ink. The before/after bars and the accuracy meter use the text greys, never petrol or green. Colour stays reserved for the two meanings above.

## Typography

**Display Font:** Heebo variable (with a metric-matched Arial / Noto Sans Hebrew fallback, then system-ui)
**Body Font:** Heebo variable, the same family
**Label/Mono Font:** none distinct; labels are Heebo 500

**Character:** One Hebrew workhorse sans at three weights (400, 500, 700), self-hosted as a Hebrew subset and a Latin/digits subset. Hierarchy comes from size and weight alone, never from case, tracking or a second family.

### Hierarchy
- **Display** (700, fits the card up to the hero clamp, 1.15, -0.02em): the result figure only. Its size is computed from the card width and the string length so that any range fits on one line and never wraps or reflows.
- **Headline** (700, fluid 28–36px, 1.3, -0.01em): the page h1, one per page.
- **Title** (700, 24px, 1.3): h2, the result sentence, question titles, the lead-step title, the live preview figure.
- **Title Small** (700, 20px, 1.3): h3, next-link and link-list titles, the slider value beside its label. Amount inputs and the page's one-line answer use this size at 500 and 400 respectively.
- **Body** (400, 17px, 1.6): running text and inputs. Prose pages hold a 68ch measure.
- **Label** (500, 17px): field labels, buttons (primary at 700), chips, FAQ questions.
- **Meta** (400, 15px, 1.5): hints, table text, captions, the navigation, breadcrumbs, the question counter.
- **Legal** (400, 13px, 1.5): the one-line disclaimer, consent notes, slider scale, footer legal line.

### Named Rules
**The Tabular Everywhere Rule.** Every figure uses tabular lining numerals (set on the body and restated on every figure), so digits never shift as values count or change.

**The Low-to-High Rule.** Every figure or range inside Hebrew text is isolated as left-to-right (LRI/PDI in generated strings, or `<bdi class="num">` / `.num` in markup), so ₪ and the en dash land correctly and a range always reads low to high.

**The Round Down Rule.** Result totals are rounded down to ₪1,000; monthly payments and fees go to ₪10, with fee ranges widening outward. Never display false precision, and never round a saving up.

## Layout

One column, up to a point. The intro, the calculator card, and every section below it share one 34rem column (`--card-max`) and one start edge; on mobile and tablet (below 64rem) the column is simply centred in the viewport with generous air. Intros and headings start at that edge and are never centred. Header and footer chrome run to a 72rem page width. On calculator pages the hero band runs full bleed behind the header and intro, with its content held to the same 34rem column. Prose pages cap running text at 68ch.

At 64rem and up, the calculator gains a real second column instead of empty margin: "how it works" (`.side`) sits beside the card (`.calc-slot`) in a `.primary` grid, card first (page-start side, right in RTL) at 34rem, aside second at 16–22rem (`--aside-max`), the pair centred as a unit. Below that, the worked-example section alone is allowed to widen to `--content-wide` (card + gap + aside) and lay its examples out two-up; FAQ, sources and the next-link stay pinned to the 34rem column, since prose and link rows read worse stretched wide.

Spacing is a 4px grid (steps 1–20). Page gutters are 16px, rising to 24px at 40rem. Card padding is 24px by 20px, rising to 32px at 40rem. The intro sits 24px above the card on mobile and 48px on desktop. Content begins 64px below the card, and sections are 48px apart. Fields inside a step are 12px apart and steps use 20px internal gaps.

40rem is the system breakpoint. Below it, the card footer sticks to the viewport bottom with safe-area padding, and data tables stack: `.data-table--stack` turns each row into a labelled block from `data-label`, or a page renders one two-column label/value table per example. Tables never force horizontal page scroll; the wide ones scroll inside their own bordered wrapper. Hints reserve their line height, so validation text never pushes the layout.

### Named Rules
**The Shared Edge Rule.** Everything in the reading column (the h1, its answer line, the card, section headings, tables, FAQ) aligns to one start edge at 34rem. Centring is reserved for small in-card details: the footer disclaimer, the quiet secondary link under the primary button, and OTP digits.

**The One Action Rule.** Each step has exactly one primary action, full width in the card footer, sticky below 40rem and static above it.

## Elevation & Depth

Mostly flat, with tonal layering. The card is the only lifted object: a hairline border plus one soft, diffuse shadow (`--shadow-card`, which the skip link reuses). Inside the card, depth comes from tone (Pale Slate panels, Kept-Money Wash for the recap) and hairline rules, not shadows. The sticky mobile footer separates itself with a top hairline on Card White. Slider thumbs carry a tiny contact shadow. Focus is a ring or halo, never a lift.

### Shadow Vocabulary
- **Card rest** (`box-shadow: 0 1px 2px var(--c-shadow), 0 12px 32px -16px var(--c-shadow)`): the calculator card and the skip link.
- **Thumb contact** (`box-shadow: 0 1px 3px var(--c-shadow)`): slider thumbs.
- **Focus halo** (`box-shadow: 0 0 0 3px color-mix(in oklch, var(--c-focus) 25%, transparent)`): inputs and OTP digits on focus; sliders use a 4px halo at 35%.

### Named Rules
**The One Lift Rule.** Only the card casts a shadow. Everything inside it is flat and separated by tone or hairline.

## Shapes

Softly rounded rectangles with pills reserved for things you tap or read as a track. The card is 16px (`lg`). Inputs, buttons, stacked answer chips, panels, notices and table wraps are 10px (`md`). The direction contract specified 8px inputs; the build settled on 10px, and the build is canonical. Small details (value bubble, focus outlines, nav hit areas) are 6px (`sm`). Inline chips, slider tracks, comparison bars and the meter are fully round pills. Borders are always 1px hairlines; the 2px meter and the 2px slider-thumb ring are the only heavier strokes. The accuracy meter is a 2px hairline, not a bar.

## Components

### Buttons
Sober and full-weight; one per step does the work.
- **Shape:** gently rounded (10px), minimum 44px target.
- **Primary:** Deep Petrol fill, white label at 700, full width, 52px tall. Lives only in the card footer.
- **Hover / Focus:** hover darkens to Deep Petrol Pressed over 150ms; press nudges down 1px; focus is a 2px Clear Petrol outline offset 2px. Disabled drops to 50% opacity.
- **Secondary:** transparent with a Steel Edge stroke and Petrol Ink label; hover fills with Petrol Mist.
- **Quiet:** Slate Ink underlined text on no fill, used for the single "skip ahead" path under a primary button; it darkens to ink on hover.

### Chips
- **Style:** pill (999px), Card White, Steel Edge stroke, ink label at 500, 44px tall. The stacked variant for answer lists is a full-width 52px row at 10px radius.
- **State:** selected chips fill with Petrol Mist, take a petrol stroke and Petrol Ink label, and reveal a 16px check before the label. Tapping scales them to 0.97. After the check registers, a picked answer advances the step after 250ms (150ms under reduced motion).

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Card White on Cool Paper.
- **Shadow Strategy:** the single Card rest shadow (see Elevation & Depth).
- **Border:** 1px Hairline.
- **Internal Padding:** 24px by 20px, 32px from 40rem. Secondary calculators split fields and output with a hairline and 24px of air.

### Inputs / Fields
- **Style:** 52px tall, 10px radius, Card White, 1px Steel Edge stroke. Amount inputs carry the ₪ unit inside the box and type left-to-right at 20px/500, aligned to the label's edge. Each amount pairs with a slider directly below it. The reserved hint line tucks into the air below the slider's 44px target, so it costs no extra height.
- **Focus:** the stroke turns petrol and a 3px Clear Petrol halo at 25% appears (150ms).
- **Error / Disabled:** Amber Caution stroke and hint, applied only after blur. Hints reserve one line so nothing shifts.

### Sliders
- **Direction:** sliders follow Hebrew reading order, as native RTL ranges do: min on the right, fill growing leftward. This is the convention on Israeli bank and calculator sites; the scale reads max-left, min-right to match.
- **Track:** a 4px pill. The filled part (from the right) is Deep Petrol; the rest is Hairline.
- **Thumb:** 24px Card White circle with a 2px petrol ring and contact shadow; it scales to 1.12 while pressed and shows a 4px focus halo. A value bubble in ink appears above the thumb while dragging, except on slider-only fields, where the value already sits beside the label.

### Icons
One authored set in `Icon.astro`: a 24px grid, 2px stroke, round caps and joins, drawn in `currentColor`. Icons are always ink (Slate Ink on labels and step tiles), never petrol or green, and they sit at the start edge beside a word; they never replace one.
- **Field labels:** a 20px icon before the label names the number's kind (home = balance, calendar = monthly payment, clock = years). The worked-example summaries reuse the same three at 16px, so an example's inputs map visibly onto the calculator's fields.
- **Step lists:** "how it works" is a single-column list. Each step pairs a 40px Pale Slate tile holding a 20px icon with a bold title and one short line. It is never a card grid.
- **Quiet notice:** a caveat that is not a warning (for example, no CPI linkage) sits on Pale Slate in Slate Ink, led by the info icon. The Amber notice stays reserved for problems.

### Navigation
- **Style:** on calculator pages the header joins the hero band (brand and current page in white, links in Mist Ink, no base rule). Elsewhere it is a quiet header on Cool Paper with a hairline base. Links are 15px Slate Ink with 44px targets and darken to ink on hover. The current page is ink with a 2px petrol underline. Breadcrumbs are 15px with a Faint Slate "/" separator.

### Result, Comparison and Meter (signature)
The live result is the product. On the inputs step, the card footer's live preview is the page's hero number: Kept-Money Green at up to 36px, sized from the footer width and string length (`--chars`) so even a long range stays on one line beside its label, and counting in place as sliders move. The label sits in Slate Ink, then the range in Kept-Money Green at display scale on one line, then the monthly difference at 20px, then a sentence and costs line in meta.
- **Count-up:** figures animate between old and new values in place, with no reflow.
- **Before/after bars:** one shared, zero-based grid, so both bars are drawn on the same track length, with values in their own column. "Today" is a Faint Slate pill. "After" is a light ink band (text at 22%) spanning the range, with a solid ink segment up to the low value; an open range always shows at least 3px of band. Widths morph over 350ms.
- **Accuracy meter:** a 2px hairline in Pale Slate filled with Slate Ink, headed by a meta line ("0 of 3"). It fills as optional questions are answered and the range tightens.
- **Recap:** on the lead step, the saving recaps in a Kept-Money Wash strip.

### Disclosure, FAQ and Tables
- **Disclosure / FAQ:** summary rows with a chevron that rotates 180° over 220ms, separated by hairlines. The in-card disclosure uses Petrol Ink, and FAQ questions use ink at 500.
- **Data tables:** 15px, a Pale Slate header row, hairline rows, and a bold total row inside a 10px bordered wrapper. Numeric cells are left-to-right. Worked examples render one captioned label/value table per example.

### Step transitions
Steps swap through the View Transitions API over 220ms. Forward moves content toward the left (16px plus fade, following RTL reading order), and back reverses it. Headings receive programmatic focus without a visible ring.

## Do's and Don'ts

### Do:
- **Do** keep every surface to one 34rem column with a shared start edge below 64rem; intros and headings start at that edge. At 64rem+, the calculator card keeps its 34rem width but gains a real second column (`.side`) rather than sitting alone in empty margin.
- **Do** give each step exactly one primary button, full width in the card footer, sticky below 40rem.
- **Do** set every figure in tabular numerals and isolate figures and ranges as LTR (LRI/PDI or `<bdi class="num">`) so ranges read low to high.
- **Do** round result totals down to ₪1,000, and payments and fees to ₪10.
- **Do** draw the before/after bars on one shared zero-based grid, with the after range as a light ink band of at least 3px.
- **Do** stack tables below 40rem with `.data-table--stack` and `data-label`, or render one label/value table per example.
- **Do** use the motion tokens (150/220/350ms, `cubic-bezier(0.22, 1, 0.36, 1)`) for count-ups, step View Transitions and bar/meter width changes, and make every one instant under `prefers-reduced-motion` (CSS tokens and the JS `reducedMotion()` guard).
- **Do** reserve hint space so validation never shifts the layout, and show Amber Caution only after blur.

### Don't:
- **Don't** use petrol on figures, bars, meters, surfaces or decoration; it marks what can be pressed or focused.
- **Don't** use savings green on anything but money saved; a zero or negative result is ink.
- **Don't** colour data graphics; bars and the meter are ink greys.
- **Don't** centre intros, headings or section text; centring is limited to the footer disclaimer, the quiet link under the primary button and OTP digits.
- **Don't** add a second lifted surface or a shadow inside the card.
- **Don't** put a form, hero image, pop-up, badge row or testimonial ahead of the result.
- **Don't** let a figure wrap or reflow; the display figure sizes itself to fit one line.
