# ATLAS Premium Visual Phase II — VIS2-07 Person Register Inscription

**Unit:** VIS2-07 only · [Phase II issue #2158](https://github.com/JezCH/atlas-person-db/issues/2158) · 2026-10-09 KST.  
**Prior gate:** VIS2-06 signed off at [PR #2207](https://github.com/JezCH/atlas-person-db/pull/2207) after exact-Production [run #37843633724](https://github.com/JezCH/atlas-person-db/actions/runs/37843633724).  
**State: VIS2-07 COMPLETE — exact-Production Chrome, matched A/B screenshot review and all eight register geometry gates PASS. VIS2-08 remains NOT STARTED.**

## Current source audit and deliberate exclusions

The existing `atlas-person-monumental-register.css` already implements the dense multi-column historical Register with ordered real Person rows, chronological era bands, prominent Person names, mixed-script fallback, tabular BC/AD periods, multi-Activity subrows, invariant eight semantic Person-domain foreground/left rails and an independent neutral-gold selection/focus rail. `UI REG-M1` already engraves the graphite header and faint row surfaces; the VIS2-02 precision layer already handles global passive borders, and VIS2-03 owns glyph metrics. Mobile V4/V8 intentionally hides some tertiary metadata and preserves a compact Person/Activity view. Phase-II VIS2-05 experimental monumental year watermark was **REJECTED**, must remain default OFF.

**VIS2-07 is not permission to change:** Person/Activity/Polity facts or data connections, Person main columns/row heights/padding/density, fields, search/filter, sorting, routing, line wrapping, eight domain colors, name foreground, hover/selected/focus states (reserved for VIS2-08), chronology projection, year formats, spelling or synthetic portraits. Do not turn the dense register into cards.

## Implementation — archival text paint only

One independently reversible late opt-in file, `atlas-person-register-inscription-v2.css`, after VIS2-06 in `index.html`, scoped under `.person-card-grid.person-table-grid.person-monumental-register`. It refines existing owners only:

1. Existing header gradient: a very subtle neutral graphite top-to-bottom sheen, without a new border, column, row or shadow.
2. Header labels and ordinary column titles: a little more neutral contrast; **active sorting visual state remains untouched**.
3. Existing left era-band secondary year ranges, person Latin/canonical fallback names and tertiary historicity metadata: more legible neutral inscription tones. Their font metrics, visible/hidden rules and placement are unchanged.
4. Existing Activity role, date-period and evidence-small text: slightly clearer color, without shifting semantic Person name inks, rich Activity content or chronology.
5. Existing Activity subrow line: adjust only `border-bottom-color`, **not width/position/height**. No additional horizontal lines, underline changes or pseudo-elements.

Allowlist: `color`, `background-image`, `border-bottom-color` and a read-only `--atlas-vis2-07-register-active` marker. No `font-*`, `letter-spacing`, `box-*`, `display`, `grid-*`, `height`, `width`, `margin`, `padding`, `content`, `text-shadow`, `opacity`, `transform`, `position` or domain color token writes. Delete the new stylesheet link to revert independently.

## Pre-release gates

- Static test `tests/vis2-07-person-register-inscription.test.mjs`: restricted scope, allowed paint props only, untouched sorting/selection/hover, domain semantics and metrics.
- Production CDP script `scripts/verify-vis2-07-production-register.mjs` loads the exact Production SHA via the established workflow; on the **same loaded DOM** disables/enables only VIS2-07 CSS and asserts source data, 80 sampled Person rows, Person identity/ranges, activity list counts and rectangles, **scrollWidth/scrollHeight**, header column count and grid widths, domain name ink, true sort/filter results, and no page overflow.
- Viewports `390×844`, `768×1000`, `1440×1000`, `1600×1000` with default chronology; real domain-filtered Register at 768 and 1440; 1440 name-sorted Register; real longest sampled `name.length >= 9` (not invented) at 1440. **Eight cases** total. Record scroll state; matched A/B screenshots for five representative scenarios at 390 default and 1440 default, filtered, sorted and long-name (**10 VIS2-07 PNGs**).
- Earlier Spacetime, Person, Polity, VIS2-00 29 PNG baseline, VIS2-01/02/03/04/06 acceptance, and VIS2-05 watermark trial **OFF by default**, all have to pass. With the inherited 92 existing PNGs, successful new artifact should have **102 PNGs**.
- For subjective acceptance, inspect actual PNGs, including desktop selected sort and mobile dense labels; check that it reads as an archival dense table and is measurably more legible with no new structural changes. **A green test alone is not design signoff.**

## One-unit closure

After exact-Production technical results and actual before/after image inspection, record run/artifact/per-state results in this document, merge a docs-only signoff and mark #2158 VIS2-07 complete. **VIS2-08 name selection/focus is NOT STARTED and must remain separate.**


## Final acceptance / signed 2026-10-09 KST

### Source, deployed runtime and testing provenance

- Implemented via [PR #2208](https://github.com/JezCH/atlas-person-db/pull/2208) at initial SHA `1c1796c7b56f2a876c11185e42c62f5febb5f46a`, then independent VIS2-07-only [Activity hairline color correction PR #2209](https://github.com/JezCH/atlas-person-db/pull/2209) to final implementation SHA **`21f8ae331c4bd32b024b3c4c9c8850bdf65db6c0`**. The second change did not alter border width, Activity content, row/column geometry or domain tint; it made a color change in the existing hairline actually measurable instead of repeating its old Material token.
- [Exact-deployed-SHA Production Chrome run #37848318185](https://github.com/JezCH/atlas-person-db/actions/runs/37848318185): **SUCCESS** with source/runtime SHA `21f8ae331c4bd32b024b3c4c9c8850bdf65db6c0`. All earlier Spacetime, Person, Polity and Phase II VIS2-00/01/02/03/04/05/06 gates **PASS**; VIS2-05 watermark experiment remains **rejected and default OFF**.
- [Production evidence artifact #11581895215](https://github.com/JezCH/atlas-person-db/actions/runs/37848318185/artifacts/11581895215) was downloaded, ZIP-validated, inspected: **116 archive entries / 102 PNGs**. `vis2-07-production-register.json` says `status: PASS`, **8 cases**, **10 new A/B screenshots**. Original baseline, earlier phase evidence and this unit's proof coexist in the artifact.

### Eight directly observed Production states

| Chrome viewport | Register state | Rendered rows | Person rows sampled | Result |
|---|---|---:|---:|---|
| 390×844 | Default time order | 2,120 | 80 | PASS |
| 768×1000 | Default time order | 2,120 | 80 | PASS |
| 768×1000 | Actual existing domain filter | 1,435 | 80 | PASS |
| 1440×1000 | Default time order | 2,120 | 80 | PASS |
| 1440×1000 | Actual existing domain filter | 1,435 | 80 | PASS |
| 1440×1000 | Name ascending sort | 2,120 | 80 | PASS |
| 1440×1000 | Actual long-name row, scrolled | 2,120 | 80 | PASS |
| 1600×1000 | Default time order | 2,120 | 80 | PASS |

Each state toggled ONLY the new stylesheet on the **same live DOM** with before/after CSS activation assertions. Chrome verified invariant row count, header columns/group counts, header text, primary historical person name ink (including all domain colors), first Activity count per row, Person name/BC-AD chronology text, all 80 sampled row/name/year/Activity bounding boxes and scrollWidth/scrollHeight, content visibility, name-sort order/filter results, viewport/document width and no horizontal overflow. Computed header/era/canonical/status/Activity neutral color or material painted differences were actually observed; focus/selection semantics remained out of scope.

### Visually reviewed screenshot A/B

**All five exact-image OFF/ON pairs** from the real Production artifact were opened or inspected in a five-state comparison contact sheet, plus the full 1440 long-name register and 390 mobile shots individually. The 390×844 mobile view keeps the same compact name/polity/BC-AD Activity-line hierarchy; desktop preserves flat register rows and separate columns. No new cards, blank fields, portraits, oversized headers, lost names, scrollbars beyond the prior content, chronology shifts or domain-rail recoloring observed.

| Exact A/B case | RGB pixels differing | Fraction of full screenshot |
|---|---:|---:|
| 390px default | 4,693 | 1.4258% |
| 1440px default | 20,084 | 1.3947% |
| 1440px filtered | 20,123 | 1.3974% |
| 1440px person-sorted | 28,139 | 1.9541% |
| 1440px actual long-name | 30,054 | 2.0871% |

The only image changes are modest contrast/sheen and the original 1px Activity rule tone. Pixel-difference percentages are descriptive, **not** alone a proof of improved readability; the image-level judgment is that neutral secondary facts are easier to read without changing the dominant semantic Person name hierarchy. The live Chrome geometry gate is the separate proof of layout invariance. Filter and name-sort scenarios were tested with actual Production data, not synthetic rows.

**Decision: ACCEPT VIS2-07 / COMPLETED.** Scope remains exclusively Person main register *surface and inscription*. [Phase II tracker #2158](https://github.com/JezCH/atlas-person-db/issues/2158) may mark VIS2-07 checked upon docs merge. Next **VIS2-08 (selection/focus) is NOT STARTED** and requires a separate user turn.
