# ATLAS Premium Visual Phase II — VIS2-00 Source Baseline

**Date:** 2026-10-08
**State:** VIS2-00 CORE BASELINE CAPTURED AND VERIFIED / SCREEN-SPECIFIC EDGE CASES REQUIRED BEFORE THEIR PRs
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


## 7. VIS2-00 Chrome capture checkpoint — VERIFIED 2026-10-08

**Exact Production run:** [37778331138](https://github.com/JezCH/atlas-person-db/actions/runs/37778331138) — **SUCCESS**, source and deployed runtime SHA `2c97830d2964ecc74143820a589e6255d6ca4bbf`. [Complete PNG+JSON artifact](https://github.com/JezCH/atlas-person-db/actions/runs/37778331138/artifacts/11550393601). Existing Chrome checks executed first; the Phase II read-only recorder then captured **29 distinct screenshots**, each with expected SHA, viewport dimensions, current route, image SHA256, semantic counts, selected state and label geometry in `vis2-00-baseline.json`. The combined artifact contains **44 PNGs** including existing production acceptance shots.

- **Person register:** default 390/768/1440/1600px; representative-domain filtered 768/1440px. Rows preserved; 2,120 source-read rows in observed default snapshots; all captures avoided document-level horizontal overflow.
- **Person Detail:** 768/1440px, full first-Person Chronicle hero + dates + activity sections; read-only recorder explicitly waits until `.person-chronicle-hero` exists and contains the actual identity. Initial placeholder captures in failed runs **are invalid** and must not be used as baseline. The existing acceptance suite separately captures 390/1600px detail and confirms semantic/geometry constraints.
- **Polity:** list 390/768/1440/1600px and expanded dossier 768/1440px.
- **Dashboard:** top 390/768/1440/1600px, scrolled 768/1440px.
- **Spacetime:** default 500% 390/768/1440px, plus **East Asia and Europe each at 500%, exactly 1000% and 1500%** at 1600px. The exact 1000% is reached by the existing pointer pinch handler without touching application camera/zoom code. Captures include visible Person names/rails and precise screen geometry. The canonical 500%/1500% label-overlap and layout gate also succeeded in the unchanged existing verifier.
- **Human screenshot inspection:** representative Person main 768, Detail 768, Polity open 768, Dashboard 1440, East Asia 1000%, Europe 1500% were actually opened and reviewed. This is visual baseline inspection, **not** a full subjective Phase II before/after comparison or a claim that every image was individually inspected.

**Why four capture PRs were required:** #2167 added baseline recorder + workflow; #2170 reused canonical Spacetime selection/clear order; #2171 made loaded Detail content a hard screenshot precondition; #2172 switched name-link click to the existing verified Person-row click. These PRs changed only read-only test/capture tooling, not historical data, UI appearance, semantic colors, world coordinates or navigation logic.

**Current-base direct dependency delta:** between runtime SHA `2c97830d...` and follow-up source check `c74c02ea...`, changed paths were Polity review workstream metadata/research and a YouTube audit document only, not the visual/CSS/renderer paths. Do not refresh all captures merely because unrelated main moved.

### Known scenario additions before each affected visual PR

The 29-image common baseline is **sufficient as the core material/token baseline for VIS2-01**. Some specialized Phase II scenarios from the design plan are **not** falsely counted as covered:

- VIS2-07/08: long mixed-script Person names, sortable column focused state, a selected row in the register, and filtering at relevant widths must receive matched before/after evidence before merge.
- VIS2-05: era-boundary-centered Spacetime and a data-dense frame at the same coordinates must be added before testing the monumental watermark treatment. No watermark is accepted from the current screenshots.
- VIS2-09/10: detail with actual sourced portrait vs no portrait, multi-Activity vs one Activity, sources present vs missing must be captured before the hero/source edits. Do not invent a portrait simply to fill the state matrix.
- VIS2-12/13: 125/150% CSS pixel density where feasible, keyboard/touch focus, reduced-motion and final Production rendering remain mandatory.

**VIS2-00 core baseline decision: COMPLETE for start of VIS2-01.** The named variant captures are deferred **only to the corresponding screen-specific work unit** and remain explicit prerequisites to their acceptance, not silently waived. VIS2-01 may proceed with its own before/after comparisons over the core state matrix. Phase II overall is NOT visually signed off.
