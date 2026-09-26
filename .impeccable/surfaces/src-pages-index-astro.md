---
version: 1
slug: "src-pages-index-astro"
primary_target: "src/pages/index.astro"
related_targets: []
---

# Surface: / (refinance calculator, money page)

- **Mode:** Operate. The visitor completes a task: can I save by refinancing, and how much?
- **Job:** three numbers from a bank statement lead to an honest savings range. Two optional questions sharpen it. The only cost to the user is the phone step, which comes last.
- **Proof:** the result itself, with its assumptions. No testimonials, counts or badges.
- **Constraints:**
  - One primary button per step, bottom of card, sticky on mobile.
  - Numbers never reflow.
  - Static HTML carries a worked example with real numbers.

## Direction contract

**THESIS:** The category standard executed at Wise / GOV.UK / Monzo craft: a single white calculator card that answers before it asks. It refuses the lead-gen arrangement of hero, stock photo, form above the fold and pop-up.

**OWN-WORLD:**
- Near-neutral cool grey ground and a white card with a hairline border and a single soft shadow.
- Near-black ink.
- One deep, sober accent reserved for primary actions, focus and the active slider. It is not bank blue.
- One savings green that appears only on money saved.
- One Hebrew workhorse sans at two to three weights, with tabular numerals throughout.
- Rounded-8 inputs, pill chips with a check, and a hairline progress rail.

**STORY:** I type what my statement says, see immediately whether refinancing saves me money (a range, honestly), sharpen it with two taps if I want, and only then decide whether an advisor should call.

**FIRST VIEWPORT (390×844):**
- H1 plus a one-line answer at the top, with no eyebrow.
- The card follows, holding the three labeled inputs with their sliders.
- A live preview line gives the savings range in savings green at display scale.
- The primary button is pinned to the bottom bar within thumb reach.
- Desktop at 1440 keeps the 34rem calculator column but pairs it with a second column: "how it works" sits beside the card instead of empty margin either side. Worked examples widen into a two-up row below; FAQ, sources and the next-link stay in the narrow column.

**FORM:** The canon (category standard), user-selected over roll 7f22a872 (assigned #5, Israeli wayfinding). The signature interaction is the live result: the figure counts in place, the range tightens as accuracy answers land, and the before/after bars morph.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- The real brand name, domain and advisor identity.
