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

**Closure: VIS2-04 COMPLETE** at exact-Production Chrome [run #37803485725](https://github.com/JezCH/atlas-person-db/actions/runs/37803485725), [artifact #11561269493](https://github.com/JezCH/atlas-person-db/actions/runs/37803485725/artifacts/11561269493), source/deployed SHA `2a1906977a71377f228692e7c491e851f1d6075c` — all six viewport/zoom tests and matched PNG comparisons passed. **VIS2-05 remains NOT STARTED** under the one-unit-per-user-turn gate.


## Exact Production verification and human A/B — 2026-10-09 KST

**Deployed evidence:** [run 37803485725](https://github.com/JezCH/atlas-person-db/actions/runs/37803485725) completed **SUCCESS**, attached [60-PNG + JSON artifact 11561269493](https://github.com/JezCH/atlas-person-db/actions/runs/37803485725/artifacts/11561269493). The source/deploy identity was verified as `2a1906977a71377f228692e7c491e851f1d6075c`. An earlier run `37803218817` at the initial feature squash SHA `11b15596808a117a8de48ea615e70324961898e3` was **cancelled**, not failed, by a concurrent unrelated `main` merge; its result is not counted as acceptance. The successful retry inherited VIS2-04 unchanged, while later unrelated Polity/data review commits did not modify the optical stylesheet or its verifier.

The standard Production Chrome sequence completed `ATLAS_SPACETIME_PRODUCTION_VISUAL_ACCEPTANCE_PASS`, Person V10, Polity, Phase-II 29 PNG baseline, M0–M3 roles, VIS2-02 engraving and VIS2-03 typography checks **PASS** at the same SHA.

### VIS2-04 measured time grid geometry

| Production viewport | Magnification | Tick count | Major count | A/B |
|---|---:|---:|---:|---|
| 390 × 844 | 500% | 105 | 20 | PASS |
| 768 × 1000 | 500% | 105 | 20 | PASS |
| 1440 × 1000 | 500% | 209 | 41 | PASS |
| 1600 × 1000 | 500% | 209 | 41 | PASS |
| 1600 × 1000 | 1000% | 522 | 104 | PASS |
| 1600 × 1000 | 1500% | 522 | 104 | PASS |

The new `vis2-04-production-ticks.json` says `status: PASS`, six cases. When disabling/enabling only the new CSS in the **same live Production DOM**, Chrome confirmed invariant tick/guide counts, identical `top` offsets, text content, major flags, rectangles and heights; unchanged major-notch width/height, world/axis/canvas rectangles and Person virtualized label sample positions; no horizontal page overflow. It also verified actual computed major/minor year colors, minor-guide opacity/gradient, major-guide paint, and existing notch highlight **do change**. Spacetime projection, camera and tick generator were not touched.

### Actual visual comparison

The artifact was downloaded and all four corresponding OFF/ON PNG pairs were pixel-compared, with representative **390px default**, **1600px default** and **1600px 1500%** images opened and visually reviewed:

| Matched pair | Pixels changed | Fraction of full screenshot | Bounding region |
|---|---:|---:|---|
| 390 × 844, 500% | 2,423 | 0.736% | x=39–383, y=230–581 |
| 1600 × 1000, 500% | 7,645 | 0.478% | x=322–1248, y=266–798 |
| 1600 × 1000, 1000% | 9,967 | 0.623% | x=322–1248, y=237–838 |
| 1600 × 1000, 1500% | 6,372 | 0.398% | x=322–1248, y=305–763 |

No out-of-scope layout redesign was visible. The small label contrast is more legible while the nonmajor one-pixel guides step back from major chronological anchors. The pixel counts are descriptive **aesthetic evidence**, not a surrogate for accessibility or verification of historical placement; geometry identity is separately asserted by the live DOM gate.

**VIS2-04 final verdict: COMPLETE.** Visually perceptible yet restrained existing-node time-axis refinement, full exact-Production six-case geometry pass and 60-image artifact. Subsequent **VIS2-05 watermark A/B** is an independent optional experiment requiring separate approval/rejection and must not start in this user turn.
