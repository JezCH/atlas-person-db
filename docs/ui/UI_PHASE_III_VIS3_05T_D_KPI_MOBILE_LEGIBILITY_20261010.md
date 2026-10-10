# VIS3-05T-D — KPI small print and mobile appbar supporting copy (2026-10-10)

**State: SOURCE PROTOTYPE; REAL-CHROME REVIEW AND PRODUCTION RELEASE REQUIRED.** Part of the existing [Phase III v2.0 plan](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md). VIS3-05T-C current Production READY `a180778c9bdf1492968ff113fa83e68cd166a223` was verified before the D change, including exact live `index.html` and `atlas-ui-visual-foundation.css` parity; no additional C CSS rewrite.

## Surgical scope

- `atlas-dashboard-monumental-v11.css` V11 canonical owner: make KPI caption `small` **10px** (was 9px desktop / 8px at <=600px), adjust tracking to `.075em`, line-height 1.3. Support text `span` **10px** (was 9px mobile) with 1.4 line-height, `overflow-wrap:anywhere`, preserving original full text, especially the NamuWiki audit breakdown. It may add natural wrapping to long descriptions; do **not** clip/collapse or replace facts.
- `atlas-ui-mobile-v8.css` canonical mobile owner: `.mobile-appbar-title small` from **7.5px / #666e73** to **10px / #aab1b7**, slightly reduced tracking to `.055em`; no change to the 15px primary title, 58px appbar height, menu icon, or touch targets.
- Update only the corresponding dynamic V11 CSS asset query in `atlas-main-authority-nav.js`, and mobile stylesheet query in `index.html`, plus legacy tests that pin these exact versions. Add a focused T-D test. No new SVGs, brand plaques, font files, route labels or application data changes.
- All six source-derived KPI values, hit actions, 8 semantic Person colors, the 9-region 500–1500% Spacetime unified camera and parked P14 geometry are **untouched**.

## Acceptance and continuation

Before any release: Chrome live Production **same-DOM baseline vs branch CSS delta** with separate fresh documents at CSS widths 390/768/1440/1600, compare KPI text and controls, six values, key position/overlap, card clipping/overflow; confirm 58px appbar geometry, title not obstructed and mobile menu click target; keyboard focus and 125/150% zoom remain separate acceptance. A normal source test cannot prove visual typography comfort.

After passing, merge only after GitHub Integrity; then separately verify Vercel Production READY, exact deployed source parity, and a postdeploy browser/read-back. User final mixed-D aesthetic signoff remains pending. **Next distinct unit: VIS3-05T-E sidebar collapse-toggle alignment**, then VIS3-06~17 per existing Phase III sequence.

## First Chrome attempt — layout consequence caught

[Run #38026942865](https://github.com/JezCH/atlas-person-db/actions/runs/38026942865) reached actual live Production 390px browser comparison and detected the first KPI value **moved downward 3.7px** when the 8px label became 10px, without value/text change. This is a normal line-box flow consequence, not a passing invariant. The targeted browser acceptance was refined to keep numeric dimensions/column widths unchanged, bound the natural vertical shift to 6px, and detect true KPI headline/detail overlap and total panel movement. Do not describe pixel positions as strictly unchanged; let the next Chrome run determine acceptance.

## Visual review of the first real 390px A/B PNGs

The mobile before/after screenshots from [Chrome run #38027059020](https://github.com/JezCH/atlas-person-db/actions/runs/38027059020), artifact #11660372093, show readable 10px auxiliary typography with all six factual KPIs. No overlap or detail truncation is visible. Because the 8px captions become 10px, the first KPI numeric row moves down ~3.7px and following grid rows reflow cumulatively; the first lower panel appears about 20px lower. The earlier 6px **absolute vertical invariance** requirement was unsuitable for intentional legibility reflow. QA now permits at most 28px cumulative vertical translation, while preserving the numbers' original **text, width, height, original card widths**, button hit-target, no factual truncation, and a strict bound on downstream panel movement. This is a bounded design trade-off, **not a claim of pixel-identical layout**.
