# ATLAS Premium Phase II — VIS2-08 Person Register Selection / Focus

**Date:** 2026-10-09 KST · **Tracking:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158)  
**Unit:** VIS2-08 ONLY. Prior VIS2-07 [signed #2213](https://github.com/JezCH/atlas-person-db/pull/2213), Chrome [SUCCESS #37848318185](https://github.com/JezCH/atlas-person-db/actions/runs/37848318185) with 102 PNGs.  
**State:** implementation submitted, not yet Production visual accepted. **VIS2-09 NOT STARTED.**

## Existing visual language / nonduplication audit

The main Person Register is a **dense table** with 18px Spacetime markers only on Spacetime, separate 8-color Person semantic left rail and Person name ink. `atlas-person-monumental-register.css` already implements:
- semantic domain `::before` paint, never the selection indicator;
- existing neutral champagne `::after` selected 1px indicator; hover highlights are subordinate to selection;
- selected row neutral material wash and inline hairlines, responsive mobile/wide layouts;
- a 1px existing row `:focus-visible` outline;
- optional real `.person-main-name-link` links for externally verified reference entries, keyboard focusable independently.
`atlas-ui-motion-material-v9.css` already owns **110/170/240ms** interaction tokens and global focus ring. VIS2-07 adjusts only secondary text; this unit does not retouch inscription typography or selected data.

Avoid replacing this with cards, extra gold rails, 8 new focus colors or new pseudo-elements. Do not modify domain palette, external URL targets, Person history facts, rows/column sizes, filters/sort, routing, portrait or existing DOM behavior.

## Implementation — existing-state precision

Add one independently reversible static stylesheet `atlas-person-register-selection-focus-v2.css` *after VIS2-07*; selectors explicitly scoped under `.person-card-grid.person-table-grid.person-monumental-register`. All properties are **paint-only** (`box-shadow`, `outline`, `outline-color`, `outline-offset`); no newly added DOM nodes, no dimensions/overflow/font or new animation.

1. **Persistent selection:** measured neutral-gold inset highlights on the existing selected row, plus subtle shadow on **the already-existing** `.person-register-entry.is-selected::after` one-pixel gold marker. Domain-colored `::before` and Person name link foreground remain unmodified.
2. **Row keyboard focus:** the preexisting inline `:focus-visible` row outline gains contrast and a precisely inset single-pixel backing. Selection and focus remain separately testable, including when both states coexist.
3. **External Person name link keyboard focus:** use actual `.person-main-name-link:focus-visible` outline and owner `:has(...:focus-visible)` inset, with no on-hover or on-mouse-click new focus ring. No changing domain ink, hyperlink destination or name box metrics.
4. **Restraint:** maintain one active neutral selection rail, no second pseudo marker, no new semantic interpretation, no mobile-specific widths/spacing. VIS2-08 uses no `@media`, `!important` or `text-shadow`.

## Acceptance / exact Production A/B contract

Static `tests/vis2-08-person-register-selection-focus.test.mjs` prohibits any CSS property other than neutral focus/selection painting and checks scope and cascade.

`scripts/verify-vis2-08-production-register-interaction.mjs` toggles ONLY VIS2-08's stylesheet in the **same loaded Chrome DOM** and checks four independent interaction states at **390×844, 768×1000, 1440×1000, 1600×1000 = 16 A/B cases**:
- selected historical Person row with a real external reference link, neutral selected rail `opacity=1` and unchanged domain rail;
- keyboard `:focus-visible` on the focusable Person row;
- keyboard `:focus-visible` on an existing Person name link;
- concurrently selected and keyboard-focused row.

For keyboard cases, Chrome sends actual Tab key events before focusing the target and requires `:focus-visible` computed true in the page. The verifier snapshots **all 80 first Person rows**, domain colors, name/link colors, historical ranges, activity counts, row/text rectangles, scroll heights and widths, selection and focus flags, 2,120+ source Person cardinality, era groups, sort mode, viewport/page overflow, active focus and `::before` domain rail + `::after` selected indicator geometry and presence. Only row inset shadow/outline, link outline or existing `::after` shadow may change.

Capture paired **16 VIS2-08 screenshots** (4 states × OFF/ON × mobile 390 and desktop 1440), plus the pre-existing Production visual/Phase II images. Expected complete artifact **118 PNGs** (inherited VIS2-07: 102 PNGs + 16). Human A/B inspection required; code/CI success is not subjective acceptance.

**Regression gates:** source/deployed SHA must match precisely; existing Person main V10 selection/link domain acceptance, Polity, Spacetime, 29-common visual baseline and VIS2-01–07 must all pass in the same exact-SHA Chrome run. Pixel difference evidence + restored geometry prove improvement is confined to selected/focused interaction, not a default row re-layout.

**Closeout:** document exact Production run, screenshots, comparison verdict, then docs-only signoff PR and tracker [#2158](https://github.com/JezCH/atlas-person-db/issues/2158). Stop before VIS2-09 (Detail hero/portrait).
