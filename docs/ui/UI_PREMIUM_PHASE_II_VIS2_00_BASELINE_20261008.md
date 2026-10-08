# ATLAS Premium Visual Phase II — VIS2-00 Source Baseline

**Date:** 2026-10-08
**State:** SOURCE BASELINE CAPTURED / EXACT-CURRENT VISUAL BASELINE PENDING
**Tracking:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158)
**Source snapshot:** `e6d4a940fb0dc22622612690baed633fee12947a` (UI inspected); preflight at `a0352752298053ecde2c4a4c437b2912cf2bd704` confirmed the intervening commit changes only France polity correction/notes/test, not the scoped UI files.
**Phase I visual reference:** `092743c3bb606da437871aafcb4e07061d75ef30` ([Production Chrome run 37730898739](https://github.com/JezCH/atlas-person-db/actions/runs/37730898739)); dashboard `4fd1cdb84b5d76cca37ee38d9bb0dbfc213bef25` ([run 37730044578](https://github.com/JezCH/atlas-person-db/actions/runs/37730044578)).
**Binding documents:** [visual guidelines](../../ATLAS_UI_VISUAL_GUIDELINES.md), [Phase I completion](UI_PREMIUM_VISUAL_EXECUTION_PLAN.md), [execution protocol](../../WORK_EXECUTION.md).

## 1. Scope, authority, and non-regression boundary

This is *presentation work only*. Do not touch Person/Activity/Polity canonical data, DB/API, search/sort/filter, Person main column/row geometry or information density, 8 semantic Person-domain colors, Spacetime X/Y/camera/zoom/time mapping/LOD/label allocator, or page routes/Admin flow. Main Person portraits and invented historical images are forbidden. #1896, polity identity review, and P14 territory are separate work.

**Observed live code, not proposal:** The Spacetime view currently declares `CAMERA_DEFAULT_ZOOM=5`, `CAMERA_MAX_ZOOM=15`, `GLOBAL_EXTENT_COMPRESSION=0.748`, `AXIS_WIDTH=140` in `atlas-person-spacetime-view.js`. These are protected source contracts. Do not alter them to implement a visual effect.

## 2. Existing implementation — duplication audit

| Proposed VIS2 concern | Implemented baseline (read-only evidence) | Phase II rule |
| --- | --- | --- |
| M0–M3 graphite/champagne | `atlas-ui-visual-foundation.css` already declares `--atlas-canvas`, `--atlas-surface-1..3`, `--atlas-honor-metal*` and shared `--atlas-material-hairline*`, `sheen*`, `wash*`, `rail*` | **Do not rebuild or rename the existing scale.** Map surface roles to existing tokens first; introduce role aliases only if a specific rendered difference warrants them. |
| Engraving | `atlas-ui-visual-foundation.css` GLOBAL-M1; `atlas-person-spacetime-monumental-canvas.css` SPACETIME-L1; `atlas-person-spacetime-instrument-tools.css` already engraves instrument edges | No duplicate lines or extra actual border width; any refinement stays inset/pseudo and must be visible in comparative captures. |
| Typography | `--atlas-font-inscription`, `--atlas-font-display` already use Korean serif fallback; Person register, time axis and Dashboard have display usage | Do not introduce fonts without mixed Hangul/Hanja/Latin/numeric geometry evidence; retain row sizing. |
| Precision ticks & years | `atlas-person-spacetime-monumental-canvas.css` major-year styling, century/era lines, selected label finish already exist (Phase I #2134) | Style only pre-existing time nodes. Watermark is experiment-only; no new chronology logic. |
| Minimap / inspector | `atlas-person-spacetime-instrument-tools.css` Phase I #2135 finish | Only evidenced deltas; do not rebuild tools or change control behavior. |
| Person register and selection | `atlas-person-monumental-register.css` dense rows with 0 radius, semantic `::before` rail and selected `::after` rail | Preserve existing register/field widths, focus/selection semantics, domain colors; no cards or row transforms. |
| Detail and portraits | `atlas-person-chronicle-detail.css` existing hero, source and portrait frame (Phase I #2137/#2139) | No fake portraits; scoped contrast/typography refinement only if Chrome comparison supports it. |
| Polity / Dashboard | `atlas-polity-review-workbench.css`, `atlas-dashboard-monumental-v11.css` already contain inscription/ledger designs (#2143/#2144) | Retain functionality and original dimensions; no SaaS-card resurrection. |
| Motion | `atlas-ui-motion-material-v9.css` defines **110/170/240ms** and `prefers-reduced-motion` fallback | Do not blindly insert the proposed 80/120/200ms values; compare responsiveness first. |

**Canonical domain codes today:** `governance`, `military`, `science`, `technology`, `commerce`, `culture`, `religion`, `exploration` in `atlas-person-domain-registry.js`. The older conceptual word “knowledge” must **not** be substituted for the existing `science` runtime code in a visual workstream.

## 3. Effective CSS loading order and ownership

1. `index.html` static CSS: `styles.css` / mobile / Person main + table + era + shell → **`atlas-ui-visual-foundation.css`** → **`atlas-person-monumental-register.css`** → **`atlas-person-chronicle-detail.css`** → `atlas-ui-mobile-v8.css` → **`atlas-ui-motion-material-v9.css`**.
2. `atlas-domain-surface-owner.js` dynamically adds the semantic Person palette and Spacetime domain palette.
3. `atlas-main-authority-nav.js` dynamically adds route CSS: Spacetime **view → monumental canvas → instrument tools → mobile**; Dashboard **base → monumental-v11**; Polity `atlas-polity-review-workbench.css`.
4. Consequence: a global override can be undone by late-loaded route styles; a late-loaded global override can break other surfaces. Phase II must explicitly own its late-route selectors and update CSS cache busting/version guards.

### Planned write boundaries (not authorizations to change logic)

| VIS2 unit | Intended CSS/code touch set | Forbidden neighboring scope |
| --- | --- | --- |
| 01 material role aliases | `atlas-ui-visual-foundation.css` only; scoped aliases on `:root`, no existing values changed blindly | `atlas-person-domain-palette.css`, app geometry |
| 02 engraving | existing shared material tokens **or** one tightly scoped new stylesheet, not both without need | global border-box dimensions, semantic colors |
| 03 numbers/type | scoped selectors in `atlas-person-monumental-register.css` / `atlas-person-spacetime-monumental-canvas.css` / `atlas-person-chronicle-detail.css` | time-projection JS, label width or row height |
| 04–06 Spacetime | `atlas-person-spacetime-monumental-canvas.css`, `atlas-person-spacetime-instrument-tools.css` | `atlas-person-spacetime-*-projection.js`, `*label-engine.js`, camera model |
| 07–08 register | `atlas-person-monumental-register.css` | `atlas-person-table-view.js`, sort/filter/data |
| 09–10 detail | `atlas-person-chronicle-detail.css` | portrait generation and Person read model |
| 11 auxiliary | `atlas-polity-review-workbench.css`, `atlas-dashboard-monumental-v11.css` | Dashboard model/Polity services |
| 12 interaction | `atlas-ui-motion-material-v9.css`, selector-specific owners | transforms that move labels or table geometry |

**Isolation decision for VIS2-01:** Prefer new `--atlas-vis2-m0..m3` *role aliases* to the existing canonical visual tokens, consumed only in narrowly targeted existing selectors. No global appearance toggle, new component tree, JS feature flag or CSS cascade layer before evidence demonstrates a need. New/experimental marks require an explicit scoped selector and default-OFF opt-in. The corresponding revision must be reversible by deleting that scoped rule block; do not duplicate the Phase I foundation.

## 4. Production screenshot baseline ledger

Phase I recorded actual Chrome evidence. The links below are **existing, known snapshots**; they are **not** exact-current Phase II Production before-images. The historical source SHA is shown explicitly to prevent accidental apples-to-oranges comparisons.

| Screen | Existing reference | Phase II exact-current before capture still required |
| --- | --- | --- |
| Spacetime (1600×1000) | [Phase I run 37730898739](https://github.com/JezCH/atlas-person-db/actions/runs/37730898739), expected `092743c3...`; existing verifier covers 500%/1500% and Meanwhile | 500%, **1000%**, 1500%; East Asia / Europe / era boundary; record person labels and viewport coordinates |
| Person main (1600×1000, 390×844) | Same run: `person-main-1600x1000.png`, `person-main-390x844.png` from `verify-ui-v10-production-visual.mjs` | first view, field filter, long mixed-script name, selected person, same loaded data |
| Detail (1600×1000, 390×844) | Same run: `person-detail-1600x1000.png`, `person-detail-390x844.png` | portrait available/absent, multi-period and source area |
| Polity | Same Phase I run; `verify-polity-production-visual.mjs` | list / selected / expanded dossier |
| Dashboard (1440×1100, 390×844) | [Run 37730044578](https://github.com/JezCH/atlas-person-db/actions/runs/37730044578), `dashboard-desktop.png` / `dashboard-mobile.png` | same fresh Production snapshot, initial view + scroll |
| Tablet 768px | **No verified Phase I artifact in this source audit** | capture all relevant surfaces at 768px |
| Full-width 1440px Person/Spacetime | **No verified Phase I artifact in this source audit** | capture at 1440px (Dashboard already has 1440px reference) |

Existing local capture/Chrome acceptance infrastructure to **reuse**:
- `scripts/verify-spacetime-production-visual.mjs` (1600×1000 / 390×844, zoom, layout/overlap assertions).
- `scripts/verify-ui-v10-production-visual.mjs` (1600×1000 / 390×844 Person/detail, zero-card and semantic-color checks).
- `scripts/verify-polity-production-visual.mjs` (Polity).
- `scripts/verify-dashboard-production-acceptance.mjs` (1440×1100 / 390×844).
- `.github/workflows/atlas-spacetime-production-visual.yml` and `.github/workflows/atlas-dashboard-production-acceptance.yml`; screenshots are uploaded as run artifacts.

**Known limitation for this checkpoint:** This audit was performed by reading exact GitHub source and run metadata. A current-commit, identical-data Chrome capture was **not** generated or visually inspected here. Do **not** mark VIS2-00 complete or VIS2-01 approved for visual expansion until a new screenshot capture ledger is attached to [#2158](https://github.com/JezCH/atlas-person-db/issues/2158). GitHub artifact links are not substitutes for actually comparing the rendered images.

## 5. Acceptance and comparison contract

For each candidate PR: record exact source SHA and deployed runtime SHA, viewport width/height, device pixel ratio, Production data signature or stable fixture, screen/tab/filter/selection, Spacetime location and zoom. Capture **same state** before and after, include full PNGs and machine-readable geometry/overlap results.

**Gate A (hard):** unchanged Person register field structure, row/column metrics, person set, sort/filter/search, Spacetime world anchors/X/Y/label collision results, zoom/camera, semantic 8 colors and functional interactions. A hard regression rejects the PR irrespective of subjective design score.

**Gate B:** actual rendered improvement in precision / monumental clarity / archive credibility and no loss of readability. Experimental watermarks and decorative ticks remain OFF by default until a side-by-side review.

**Gate C:** CI, exact-SHA Vercel/Production browser, responsive 390/768/1440/1600, mouse/keyboard/touch, focus and reduced-motion. No PR = accepted merely because merged.

## 6. Resume checkpoint

- **Completed this VIS2-00 substep:** authoritative current-main source inventory; deduplication; CSS loading order; scoped future ownership; existing screenshot/evidence provenance.
- **Not yet evidenced:** new exact-current Production before screenshots at required states/widths; human image-by-image inspection; no claim of Phase II visual improvement.
- **Next action inside VIS2-00 (do NOT jump to VIS2-01 yet):** capture and attach the exact-current full screenshot matrix using the existing Chrome production acceptance harness (extend tablet/1000% coverage only where needed), then mark VIS2-00 closed and move to VIS2-01 in the following work unit.
