# VIS3-05R-E — exact deployed Dashboard mixed-D Production evidence (2026-10-10)

**Status: TECHNICAL CHROME CHECK PASS / USER AESTHETIC SIGNOFF PENDING**

## 1. What was actually deployed

- [Selected D implementation PR #2357](https://github.com/JezCH/atlas-person-db/pull/2357) merged at `2a08831d737e1e23c2617904e0d15db586d6af77`.
- Vercel Production deployment **READY**: `dpl_GB559RZXM2XkjxsyPpw1fXLe2MDr`, **exact deployed source SHA** `0c9746028efa307d69580df08a18dfcf040af8b8`, a *direct descendant* of that merge. The later commit adjusted only the separate polity audit registry/docs/test and did not change the selected dashboard UI source.
- Actual Production `index.html` references `atlas-ui-phase3-ornaments.css?v=20261010-vis3-05r-mixed-v1`. HTTP 200 Production `index.html` and CSS were byte-identical to matching files at the exact deployed commit in the first release read-back.
- The initial post-merge ATLAS Dashboard Production Acceptance run [#38012000376](https://github.com/JezCH/atlas-person-db/actions/runs/38012000376) failed **`PRODUCTION_SHA_DID_NOT_CONVERGE`** because it waited for intermediate merge SHA `2a088...` while the app deployed descendant `0c974...`. This is not treated as an aesthetic or DOM failure.

## 2. Real Chrome technical acceptance

[GitHub Actions #38013170081](https://github.com/JezCH/atlas-person-db/actions/runs/38013170081) — **SUCCESS**, [original 12 ON/OFF PNG images + machine JSON evidence (artifact #11655751239)](https://github.com/JezCH/atlas-person-db/actions/runs/38013170081/artifacts/11655751239).

The on-demand PR diagnostic ran a real headless Chrome session against the *actual Production alias* using current live Dashboard data. **Before taking any screenshot**, it compared exact HTTPS response bytes with `raw.githubusercontent.com` at deployed SHA for these five assets and verified all equal:

1. `index.html`
2. `atlas-ui-phase3-ornaments.css`
3. `atlas-dashboard.js`
4. `assets/ui-ornaments/atlas-compass-rosette.svg`
5. `assets/ui-ornaments/atlas-corner-filigree.svg`

The browser captured the normal **ornament ON** page, changed only the existing Dashboard root's `data-atlas-ornament="off"` attribute locally in the **same DOM**, and captured **ornament OFF**. No application data, UI source file, API, database, or service deployment was edited during the comparison.

| Screen condition | Result | Notes |
| --- | --- | --- |
| 390×844 CSS px | PASS | new edge engravings hidden on mobile; existing corner and title plate opt out correctly |
| 768×1000 CSS px | PASS | responsive shell and Dashboard invariants |
| 1440×1100 CSS px | PASS | desktop source, ornament ON/OFF |
| 1600×1100 CSS px | PASS | wide desktop source, ornament ON/OFF |
| 1152×880 CSS px, DPR 1.25 | PASS | effective desktop **layout-width proxy** for 1440px at 125%; **not browser-native zoom** |
| 960×734 CSS px, DPR 1.5 | PASS | effective desktop **layout-width proxy** for 1440px at 150%; **not browser-native zoom** |

Each case checked all 6 actual KPI text values, same Dashboard text and button count, no new horizontal overflow, unchanged rectangles of hero/title/description/refresh/KPI heading/first KPI/first panel, and working refresh center hit target. The real decorative pseudo-element opacity became 0 when toggled OFF. The ON/OFF PNG bytes differed in every case, showing real paint, not inert placeholders. Automated check recorded PASS for all six conditions.

Earlier QA comparison [#38011288092](https://github.com/JezCH/atlas-person-db/actions/runs/38011288092) had detected a **5px mobile KPI shift**; a narrow CSS fix removed the h3 line-box change, and subsequent PR QA [#38011617853](https://github.com/JezCH/atlas-person-db/actions/runs/38011617853) passed on the exact selected D code. These are preserved as correction evidence.

## 3. Visual review and remaining acceptance scope

Manual reading of the new 1440px and 390px Chrome screenshots: no reappearance of giant title cartouches, hero-covering medallion or repeated footer plaques; the header remains clear and the small ledger plate and partial border lines are visible. This is a qualitative review, **not user approval**.

**Still pending**: explicit user approval of final deployed aesthetics; real browser-native 125/150% zoom (beyond viewport proxy); keyboard-only focus sequence and focus-visible inspection of all Dashboard controls, and subjective legibility/contrast confirmation. The current screenshots still show small muted sidebar and KPI helper typography and a `연결 확인 중` status string alongside populated KPIs. Investigate those in **VIS3-05T**, not by stacking more decoration or assuming the connection state is wrong without checking its lifecycle.

The user's prior complaint about excessive gold layers remains a permanent negative design constraint. No new VIS3-06+ ornaments are automatically authorized by this proof.

## 4. Workstream and cleanup boundary

- VIS3-05R-E: **technical visual verification delivered**; final art-direction acceptance **pending**.
- Production release: **already completed** as a descendant SHA, with exact source parity. No extra Vercel build requested or needed.
- Existing one-off PR Chrome validation script/workflow were removed after the validated artifact was published. Keep this documentation and immutable GitHub Action artifact as evidence; do not create a permanent competing validator.
- **Next independent work unit** is VIS3-05T read-only legibility/sidebar/connection-status baseline, before further CSS/data edits. Its audit must preserve six KPI source semantics, 8 domain colors, 9-region Spacetime layout and all navigation.
