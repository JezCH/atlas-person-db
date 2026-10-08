# ATLAS Premium Phase II — VIS2-08 Person Register Selection / Focus

**Date:** 2026-10-09 KST · **Tracking:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158)  
**Unit:** VIS2-08 ONLY. Prior VIS2-07 [signed #2213](https://github.com/JezCH/atlas-person-db/pull/2213), Chrome [SUCCESS #37848318185](https://github.com/JezCH/atlas-person-db/actions/runs/37848318185) with 102 PNGs.  
**State: VIS2-08 COMPLETE / PRODUCTION SIGNED OFF.** Source+runtime exact Chrome PASS after one explicitly recorded CSS specificity correction; **VIS2-09 NOT STARTED.**

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


## Verified 2026-10-09 KST — actual exact-SHA Production and visual acceptance

### Feature, failure and correction provenance

1. Initial VIS2-08 [PR #2214](https://github.com/JezCH/atlas-person-db/pull/2214), merged SHA `af2b03673bd366d9fb0249b8f957e81dac4a129d`, implemented selected/keyboard row/link paint and the 16-case read-only Production visual verifier. All GitHub static/whole-repo checks succeeded.
2. **Do not mark the initial attempt passed:** [Production run #37850578187](https://github.com/JezCH/atlas-person-db/actions/runs/37850578187) concluded **FAILURE** after passing existing prior gates and the 390px selected/row-focus cases. The focus-link A/B property was unchanged (`rgb(192,174,136) solid 1px` both OFF and ON). Read-before-fix audit traced this to dynamically loaded `atlas-person-domain-palette.css`: its domain-qualified `.person-main-name-link:focus-visible` selector had equal specificity and later CSS precedence than the early linked VIS2-08 selector.
3. Focus-specificity correction [PR #2217](https://github.com/JezCH/atlas-person-db/pull/2217), merged SHA **`84f7152f95916edcd36f0fceb432ab983a6192dd`**, added `.person-card[data-representative-domain]` qualification to the VIS2-08 **outline-only** focus selector, kept actual `--person-domain-on-dark` name/link ink and `::before` domain rail untouched, set a 2px neutral keyboard outline with 1px optical offset, incremented CSS query v2 and updated strict owner tests. No historical data, input handlers, URL, scroll, Person geometry or domain palette values changed.

### Final exact-Production gate

- [Production Chrome run #37851784735](https://github.com/JezCH/atlas-person-db/actions/runs/37851784735) **SUCCESS**, with deployed/source SHA exactly **`84f7152f95916edcd36f0fceb432ab983a6192dd`**.
- [Complete artifact #11582298204](https://github.com/JezCH/atlas-person-db/actions/runs/37851784735/artifacts/11582298204): downloaded and verified ZIP (**22,408,725 bytes**, **133 archive entries**, **118 PNGs**). `vis2-08-production-register-interaction.json` records `status: PASS` with **16/16 same-DOM A/B gates and 16 new VIS2-08 screenshots**. The other **102 PNGs** are inherited Phase II and existing screen acceptance captures. All legacy Person V10, Polity, Spacetime and VIS2-00–07 gates passed in the *same exact runtime*.
- Four states × four viewport widths (390×844, 768×1000, 1440×1000, 1600×1000): existing-row **selected**, real keyboard **row-focus**, real keyboard **external name-link focus**, **selected+keyboard-focus**. All **2,120 Production Person rows** remained, 80 scanned for geometry/domain/name/date/Activity/scroll dimension invariants per case, eight-domain semantic name/rail inks unchanged; neutral selected `::after` marker stays `opacity=1`. The selected CSS class is set deliberately on an existing genuine Person row to isolate same-DOM styling; the existing Product click/selection behavior is independently tested by Person V10 acceptance. CDP sends actual Tab key events and demands `:focus-visible` true for every keyboard scene; **12/12 focus-bearing cases passed**.

| Width | Selected | Keyboard row | Keyboard name link | Selected + keyboard |
|---|---|---|---|---|
| 390 px | PASS | PASS | PASS | PASS |
| 768 px | PASS | PASS | PASS | PASS |
| 1440 px | PASS | PASS | PASS | PASS |
| 1600 px | PASS | PASS | PASS | PASS |

### Matched screenshot A/B human review

Actual OFF/ON PNGs for all **eight mobile/desktop pairs** (390px and 1440px at four states) were pixel-compared using exactly corresponding RGB arrays; the four-state contact sheet plus full 390px focused link and full 1440px selected+focus screenshots were opened and visually reviewed. Changes were confined to existing neutral selection row optical inset, selected gold marker shadow, and link/row keyboard-focus outlines, without added title, card, portrait, new rail or semantic recoloring.

| Exact screenshot case | Changed RGB pixels | Share of full screenshot |
|---|---:|---:|
| 390×844 selected | 1,029 | 0.3126% |
| 390×844 keyboard row | 1,224 | 0.3719% |
| 390×844 keyboard name-link | 1,204 | 0.3658% |
| 390×844 selected + keyboard | 1,409 | 0.4281% |
| 1440×1000 selected | 33,113 | 2.2995% |
| 1440×1000 keyboard row | 3,343 | 0.2322% |
| 1440×1000 keyboard name-link | 2,643 | 0.1835% |
| 1440×1000 selected + keyboard | 34,415 | 2.3899% |

The larger desktop selected screenshot changes are primarily low-amplitude RGB luminance alterations in the existing first selected Person row (`mean absolute channel difference 1.72` among changed pixels) with only scattered edge/shadow changes below it; **this is not evidence of a changed row geometry**. The separate Chrome DOM measurements prove invariant row/name/link/Activity bounds and scroll dimensions. The selected Person is actual Production `governance` domain, preserving link/name `rgb(230,198,90)` and existing narrow semantic rail `rgb(176,139,0)`; selection marker is neutral champagne, not a second governance signal.

**Final visual verdict: ACCEPT VIS2-08.** The prior absence of a distinct external-link focus treatment was corrected and proven in production; the neutral selected state and keyboard-focus rings now distinguish interaction meanings at mobile and desktop widths without a new card, new Person field or changed semantic domain foreground. Preserve `VIS2-07` factual/table appearance and rejected/default-OFF `VIS2-05` watermark.

**Single-unit barrier:** VIS2-08 is closed only after this signed document merges and the Phase II tracker is checked. **VIS2-09 Person Detail hero / portrait frame is NOT STARTED.**
