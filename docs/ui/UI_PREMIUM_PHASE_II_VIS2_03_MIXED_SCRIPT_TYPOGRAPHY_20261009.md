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

**Closure:** not yet signed off; next unit VIS2-04 is explicitly NOT STARTED.
