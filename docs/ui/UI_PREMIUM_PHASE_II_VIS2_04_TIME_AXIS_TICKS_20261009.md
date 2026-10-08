# ATLAS Phase II — VIS2-04 Chronograph Tick Presentation

**Unit:** VIS2-04 only, [Phase II tracking #2158](https://github.com/JezCH/atlas-person-db/issues/2158).  
**Source state:** VIS2-03 complete; Production exact-SHA [run #37798333229](https://github.com/JezCH/atlas-person-db/actions/runs/37798333229), [52-PNG artifact](https://github.com/JezCH/atlas-person-db/actions/runs/37798333229/artifacts/11559967328).  
**Status:** pending production acceptance and matched screenshots.

## Phase-I duplication and scope audit

The dynamically loaded `atlas-person-spacetime-monumental-canvas.css` already defines:
- graphite year-axis and era-axis, distinct existing `span.is-major` and minor year labels;
- a **pre-existing 5px × 1px major-notch pseudo-element**;
- pre-existing **1px major and minor century lines**, and separate era boundary/monumental labels;
- precision Material Hairline + Champagne sheen `SPACETIME-L1` styling, and the VIS2-03 numeric lining/tabular rule.

The semantic tick builder, historical BC/AD year labels, year zero exclusion, major/minor interval, skip density, CSS absolute `top`, camera scroll, zoom/LOD, world columns, macroregion and Person label collision/packing logic already exist and **must not change**. The major-year/era watermark is expressly reserved for **VIS2-05** and not added here.

## Implementation — five paint-only declarations

One independently reversible `atlas-person-spacetime-precision-ticks-v2.css`, opt-in after VIS2-03 from `index.html`. The sheet uses selectors anchored on `data-spacetime-visual=chronology-v6` and existing `data-spacetime-zoom` to win over the dynamically loaded prior layer without `!important`.

1. Subordinate numeric labels use a modestly clearer neutral `#98a0a3` against the graphite gutter.
2. Major numeric labels use a restrained pale inscription `#e6ded0` without touching semantic label colors, font weight/size or coordinates.
3. The existing major notch receives the pre-existing metal gradient and a dark cut, **not** a new pseudo-element or larger notch.
4. Existing minor-century `i` guides remain exactly 1px, with reduced `opacity: .52` and a subtle fade to keep dense centuries from overpowering major lines.
5. Existing major-century `i` guides remain exactly 1px, using the shared neutral metal start and graphite line tone.

All rules affect only `color`, `opacity`, `background-image`, `box-shadow`. No font family/size/line-height, layout, pixels for `top`/dimensions, pointer events, SVG asset, DOM node, data, domain rail, camera logic or opacity on era boundary is changed. Deleting one stylesheet link fully reverts this work unit.

## Required validation

- `tests/vis2-04-spacetime-tick-presentation.test.mjs` allows only pre-existing year-label/notch/century-line selectors and paint-only declarations; checks asset order and no neighboring owners.
- `scripts/verify-vis2-04-production-ticks.mjs` performs controlled **same-live-DOM CSS disabled/enabled A/B**, verifies actual CSS activation, color/line hierarchy changes and asserts **identical** numeric tick texts, positions and rectangles, major/minor counts, existing notch dimensions, world/axis canvas geometry, virtualized label sample positions and document overflow. Production viewports: **390×844, 768×1000, 1440×1000, 1600×1000** at 500%, plus **1600px at 1000% and 1500%**; 4 screenshot pairs at mobile/default and desktop three zoom stages.
- Existing exact-deploy-SHA gate and Spacetime, Person, Polity, 29 core visual captures, VIS2-01/02/03 production verifiers must all pass. Inspect the actual matched screens: the minor-century guides should recede while the major year labels remain perceptible at dark/crowded regions.
- Compare actual images before/after and record failure evidence; never approve visually from green GitHub CI alone. If any year/track position changes, revert the offending cosmetic rule instead of touching geometry.

**Closure:** Do not mark VIS2-04 complete until exact-production Chrome and screenshot comparison. VIS2-05 watermark experiment remains **NOT STARTED**.
