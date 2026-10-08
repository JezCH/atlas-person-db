# ATLAS Phase II — VIS2-03 Mixed-Script Inscription / Tabular Year Width Gate

**Work unit:** VIS2-03 only; tracking [#2158](https://github.com/JezCH/atlas-person-db/issues/2158).  
**Pre-change verified baseline:** VIS2-02 [Production run #37795440953](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953), [artifact #11557839727](https://github.com/JezCH/atlas-person-db/actions/runs/37795440953/artifacts/11557839727).  
**State:** awaiting exact-Production Chrome and screenshot signoff.

## Existing ownership audit

- The global `--atlas-font-inscription` and `--atlas-font-display` fallback chain already supports Hangul/Latin with Noto Serif KR. Register identity, Chronicle titles and Polity headings already consume it. No replacement face, external font fetch, synthetic strong or tracking should be introduced.
- Person Register date, activity periods and era-band ranges; Chronicle date/sequence and Dashboard KPI counts; and Polity dossier counters **already** use `font-variant-numeric: tabular-nums`. Recreating their declarations in place has no value.
- Main Register column layout, row heights, name wrapping, all letter spacing and line heights are immutable. Spacetime camera/time mapping, 140px axis and 500% / 1000% / 1500% zoom remain immutable.
- UI Chrome already captures 29 Phase II snapshots at 390/768/1440/1600 plus Spacetime 500/1000/1500 and 15 prior acceptance states.

## VIS2-03 implementation

One reversible opt-in layer `atlas-ui-mixed-script-typography-v2.css`, loaded **after VIS2-02** in `index.html`. It has only two presentation declarations:
1. `font-kerning: normal` plus `font-variant-east-asian: normal` for historic identity inscriptions (Person name, Chronicle heading, Activity heading, Polity entity heading). This retains existing family, CJK fallback, glyph width modes, semantic text color, responsive wrapping and font size.
2. `font-variant-numeric: tabular-nums lining-nums` for numeric year axes and era/year bands, Person and Chronicle date displays, Dashboard/Polity counters. Adds the missing Spacetime year-axis numeric rhythm and consistent lining figures, reusing prior Person/KPI tabular behavior.

No `font-family`, `font-size`, `line-height`, `letter-spacing`, `word-break`, `white-space`, `width`, `padding`, `grid`, `color`, `border`, DOM or historical data edits. The CSS root `--atlas-vis2-03-type-active` is a harmless read-only test flag to ensure asynchronous CSS activation in Chrome.

## Gates

- `tests/vis2-03-mixed-script-width.test.mjs`: CSS opt-in, owner paths and forbidden layout/font/palette properties.
- `scripts/verify-vis2-03-production-typography.mjs`: same **actual Production DOM** with typography stylesheet disabled/enabled at **390×844, 768×1000, 1440×1000, 1600×1000**; compare 80 dense Person row bounding boxes, name/date container dimensions, row text scroll heights, document overflow, name/text values, and computed kerning/tabular-lining properties. Captures **4 OFF/ON PNGs** at 390 and 1440 in addition to existing 44+4 output.
- Existing Person, Polity, Dashboard, Spacetime and 8 semantic domain colors acceptance and 29 common baseline images must still pass. A matched screenshot comparison is mandatory before acceptance.
- If a real name/date line reflows or a Person row changes height, reject/reduce the font-kerning scope instead of enlarging fields or overriding layout to conceal the problem.

**Closure:** **VIS2-03 COMPLETE**: exact-Production [run #37798333229](https://github.com/JezCH/atlas-person-db/actions/runs/37798333229) **SUCCESS** at deployed SHA `b95785b28ed5f191e833686ac7cb4e68090fdc2f`, [52-PNG artifact #11559967328](https://github.com/JezCH/atlas-person-db/actions/runs/37798333229/artifacts/11559967328). Next work unit **VIS2-04 NOT STARTED**; stop under the per-conversation unit gate.


## Verified Production Chrome outcome — 2026-10-09 KST

### Automated actual-browser checks

- Exact SHA `b95785b28ed5f191e833686ac7cb4e68090fdc2f` was matched at Production. [Run #37798333229](https://github.com/JezCH/atlas-person-db/actions/runs/37798333229) **completed SUCCESS**.
- Spacetime Production visual / domain colors; Person V10 dense register; Polity Chrome; Phase II baseline **29 states**, previous M0–M3 and Precision Engraving were all **PASS**. Inherited Spacetime 500/1000/1500% visual states were captured by the normal acceptance workflow; no camera/time label code changed.
- `ATLAS_VIS2_03_TYPOGRAPHY_WIDTH_PASS` occurred for **390×844**, **768×1000**, **1440×1000**, **1600×1000**. Each used the **same loaded Production DOM**, toggling only the VIS2-03 link. The script compared **80 Person register rows + 80 name elements + 80 year/range elements per viewport**; all row boxes, name/year boxes, content text, scroll heights, document width and responsive geometry were unchanged within the specified 0.05px rect tolerance. Computed name `font-kerning: normal` / CJK `normal` and date `tabular-nums lining-nums` were present after enabling the stylesheet.
- Artifact contains exactly **52 PNGs**: 29 Phase II common captures, 15 existing acceptance images, 4 VIS2-02 engraving ON/OFF, and **4 matched VIS2-03 typography OFF/ON at 390 and 1440**; the new `vis2-03-production-typography.json` has `status: PASS` and four passing viewport cases.

### Matched actual PNG visual inspection

Before/after `vis2-03-before-390.png` versus `vis2-03-after-390.png`, and the corresponding 1440 PNGs, were extracted, opened and compared. **390×844** changed only **14 pixels of 329,160 (0.0043%)**, with maximum per-channel delta **2**; **1440×1000** had **zero changed pixels**. Therefore the existing Person register typography/density did **not** suffer a visible redesign or wrap shift. This unit's benefit is the explicit, consistent shaping contract and previously missing fixed-width figure treatment on numerical **Spacetime tick / Polity metadata surfaces**, rather than making the main Person table visibly larger or reflowing it. Pixel equality on the register does **not** establish aesthetic benefit on all other routes; only CSS coverage and their existing visual acceptance are claimed.

**Signoff:** All planned VIS2-03 source, four-viewport geometry and artifact gates passed. No Person/Activity/Polity data, domain color, font download/family, register row height/columns, Spacetime X/Y/time/camera/zoom/LOD, or core UI logic was edited. VIS2-04 tick presentation must be a **separate user-triggered** unit.
