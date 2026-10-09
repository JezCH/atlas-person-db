# VIS3-00 — Phase III Decoration-First Production Visual Baseline / Source-Parity Checkpoint

**Date:** 2026-10-09 (KST)  
**State:** **CLOSED — BASELINE EVIDENCE INDEXED AND REVIEWED / CURRENT PRODUCTION LIVE RECAPTURE NOT CLAIMED**  
**Scope:** Documentation + reviewed existing screenshot evidence only. NO CSS/HTML/JS product rendering change, no history/DB writes, no Phase III implementation, no canonical guidelines edit.  
**Next authorized unit:** `VIS3-01`, three visually distinct designs on **the same captured UI content/geometry** (Grand Atlas, Chronometer, Illuminated Codex). Does **not** auto-start.

## 1. Sources and immutable identifiers

1. Last actual fully instrumented **Chrome Production capture**: [ATLAS Spacetime Production Visual Acceptance run #37899108152](https://github.com/JezCH/atlas-person-db/actions/runs/37899108152), **SUCCESS**. **Source/deployed exact SHA:** `6b16b894e427fab6b15e3a3d0b6c000f6cb9e365`. Screenshot artifact [#11602595861](https://github.com/JezCH/atlas-person-db/actions/runs/37899108152/artifacts/11602595861), **221 ZIP entries = 200 real PNG + 21 machine-readable JSON**, zip CRC verified. `vis2-00-baseline.json` contains **29** original main baseline captures for Person/Polity/Dashboard/Spacetime and state variants, including 390/768/1440/1600 viewports. Supplementary VIS2-09/10/13 captures include real Person Detail portraits/Activity/Sources, keyboard states, physical1440 scale125/150, Europe/East Asia 500/1000/1500%.
2. **Current Production deployment observed at audit:** Vercel project `atlas-person-db` deployment **`dpl_4XvZ7DDszsojA7HiujkWM2xDZcpJ`**, **READY / production**, GitHub Source `9f20916756c7c6f638cc85d219eba4f3f2d2bb4d`. Main branch HEAD independently read back as the same SHA. GitHub `compare/6b16b894...9f209167` says **ahead by 12 commits / 21 changed files**. Those files are docs, tests, policy/source audits, GitHub workflows, a server-side Polity audit handler, three Maimonides Authoring requests, and `atlas-polity-review-registry.js`. **No common app HTML, CSS, Spacetime UI renderer, Person/Polity detail UI JS, or Dashboard UI source files changed.** The Polity review registry/server audit changes may affect current data; therefore this is **visual source/asset continuity, NOT a proof that every current data pixel matches old screenshots**.
3. **Limit**: This turn cannot independently run the authenticated GitHub `workflow_dispatch` from available connector actions, and the analysis runtime cannot network-resolve the live Vercel URL. We **did not** create a new live Chrome screenshot run at SHA `9f209167...`. Do **not** relabel inherited PNGs as a current-SHA live capture. Rerun the existing `.github/workflows/atlas-spacetime-production-visual.yml` with an exact Production SHA for new data-correct screenshots before a later implementation PR if content has materially drifted.
4. VIS2-13 automatic status = `AUTO_GATES_PASS_PENDING_MANUAL_REVIEW`, with independent human visual inspection/Phase II signoff in [VIS2-13 report](UI_PREMIUM_PHASE_II_VIS2_13_FINAL_PRODUCTION_ACCEPTANCE_20261009.md). **This does not equal decorative Phase III approval.** VIS2-05 watermark experiment remains **REJECTED / OFF**.

## 2. Evidence index — named real browser screenshots

All filenames below are entries within artifact #11602595861. No generated image or moodboard should be substituted for this capture set.

| Surface | Desktop source evidence | 390px / other states | Known real baseline |
| --- | --- | --- | --- |
| Dashboard | `vis2-dashboard-top-1440.png`, `vis2-dashboard-top-1600.png`, `vis2-dashboard-scrolled-1440.png` | `vis2-dashboard-top-390.png`, `vis2-dashboard-top-768.png` | **6** real KPI cards, long operational control/status panels |
| Person Main | `vis2-person-main-1440.png`, `vis2-person-main-1600.png` | `vis2-person-main-390.png`, `vis2-person-main-768.png` | **2,120** loaded Person rows, dense repeated register with narrow domain rails |
| Person Detail (hero) | `vis2-09-B-refined-1440-portrait.png`, `vis2-09-B-refined-1440-default.png`, `vis2-09-B-refined-1440-multi.png` | `vis2-09-B-refined-390-default.png`, `vis2-09-B-refined-390-multi.png` | Actual persisted available portrait example + no-portrait and multi-Activity cases, no fake placeholders |
| Activity/Source | `vis2-10-B-refined-1440-multi-sources.png`, `vis2-10-B-refined-1440-multi-evidence.png` | `vis2-10-B-refined-390-multi-sources.png` | Expanded, existing bibliographical data/evidence and detailed chronology |
| Polity | `vis2-polity-list-1440.png`, `vis2-polity-open-1440.png`, `vis2-polity-list-1600.png` | `vis2-polity-list-390.png`, `vis2-polity-open-768.png` | **12** initial Polity cards, opened dossier with title, dates, linked Person and Governance/Designation fields |
| Spacetime | `vis2-spacetime-default-1440.png`; `vis2-spacetime-east-asia-500-1600.png`, `vis2-spacetime-east-asia-1000-1600.png`, `vis2-spacetime-east-asia-1500-1600.png`; Europe equivalent three shots | `vis2-spacetime-default-390.png`, `vis2-spacetime-default-768.png`, `vis2-13-spacetime-physical1440-scale150-keyboard.png` | Real functional grid, multiple region strips, 500–1500% labels and tracks, mini-map/zoom, no decorative atlas frame |

The chat's separate **VIS3-00 baseline evidence ZIP** packages **10** original binary PNGs **unaltered** with two clearly labeled composite contact sheets and manifest of per-image SHA256. Contact sheets are supplemental convenience images; the true canonical screenshot provenance is the original linked GitHub workflow artifact.

## 3. Observed ornamental deficiencies, ranked by leverage

| Domain | Observed screenshot / current presentation | Decoration needed (VIS3 proposal only) | Avoid modifying |
| --- | --- | --- | --- |
| **Dashboard** | Title/card hierarchy is clean but still looks like an operations dashboard; six equal rectangular KPI tiles and conventional gray blocks with tiny gold rules | One conspicuous atlas **frontispiece**, engraved title cartouche, notched chapter border and archival numerical ledger. Make first-screen identity obvious. **P0 IDs #01 #09 #11** | Six real KPIs, live status labels, action controls, data provenance |
| **Spacetime** | Historical labels/lines occupy central space; outside toolbar/camera/mini-map frame resembles a precision chart, but no distinctive astrolabe form | Carefully authored brass calibration arcs **outside** grid, instrument nameplates per macroregion, engraved year tick terminals. **P0 #28 #29 #31** | Existing unified X/Y/camera and 9-region compression/label geometry, zoom, hit targets, domain signals |
| **Person Detail** | Name, portrait, year info and Activity chronology are readable but first-section framing is two-column text/photo instead of a ceremonial historical biography | One large biographical cartouche, true-asset-only filigree portrait frame, single decorated initial, source colophon. **P0 #21 #22 #23 #26** | Actual face provenance, unknown year/date granularity, Person roles, Source content |
| **Polity** | Expanded list looks like nested database cards; similar neutral boxes for canonical key, dates, names, and governing details | Formalized polity/dynasty cartouche, strong **temporal designation band** and sourced colophon. **P0 #36 #38 #40** | Typed Polity identity vs Governance Context, actual interval/provenance and historical continuity uncertainty |
| **Person register** | Highly compressed and functional: controls and era year bands appear in plain list/table visual language | Decorate **era break headers and century numerals** rather than each Person. **P0 #15 #16** | Row/column sizes, 8 semantic domain colors, sort/filter/keyboard/density |
| **Activity/Sources** | Source/Activity view relies on regular headings/lines and extended paragraphs; evidentiary framing has little archive-object identity | Bibliographic colophon, margin/fold decorations only at chapter transitions. **P0 #26** | Exact citation labels, expansion/keyboard behavior and uncertainty |

**General diagnosis:** Phase II materially increased consistency and readability, but did not create **a deliberate historical object/engraving layer at page entrances**. Another thin global metallic border is not an acceptable Phase III substitute.

## 4. Constraints, exact DOM/style owner preflight

- `index.html` loads the shared material foundation followed by many layered, versioned VIS2 stylesheets. Watch late-loaded rules on each route; patch the actual owner and cache-bust correctly rather than append an uncontrolled broad global override.
- `atlas-ui-visual-foundation.css` already has shared graphite/brass variables (`--atlas-canvas`, `--atlas-honor-metal`, etc.). Reuse/extend **material roles**, never collapse 8 domain semantic colors into decorative gold.
- Dashboard/Polity: `atlas-vis2-11-polity-dashboard-archive.css` and their actual renderer/css owners; six KPI boxes should be compared before changing layout.
- Spacetime: `atlas-person-spacetime-instrument-tools.css`, `atlas-person-spacetime-precision-ticks-v2.css` and region/renderer stylesheet; **no projection/scroll/hit-area edits**. Axis 140px, global 0.748 compression, 9 macroregion placements are locked.
- Person Main: `atlas-person-monumental-register.css` and `atlas-person-register-inscription-v2.css`; do not transform rows into cards or add per-Person portraits.
- Person Detail: `atlas-person-chronicle-detail.css`, `atlas-person-detail-hero-frame-v2.css` and `atlas-person-chronicle-source-archive-v2.css`; source semantics must remain visible.
- Responsive variants: `mobile-compact.css`, `atlas-ui-mobile-v8.css`, real 390/768 CSS widths and zoom-equivalent physical1440 @ effective1152/960 CSS.
- `ATLAS_UI_VISUAL_GUIDELINES.md` §§17,22 assign frame ornament **★** and strongly privilege chronology. **Need explicit user-selected VIS3-01 direction and VIS3-02 guideline amendment; not changed here.**
- P14 geography/geometry is user parked; no historical map backend restart or data mutation in Phase III.

## 5. Baseline acceptance and unresolved limitations

| Gate | State | Evidence |
| --- | --- | --- |
| Baseline source artifacts present/ZIP CRC valid | **PASS** | Run #37899108152, ZIP with 200 PNG/21 JSON |
| Exact Production source version of historical Chrome visual | **PASS (for old screenshots)** | SHA 6b16b894, verified through run report |
| Current Vercel deploy identity known | **PASS** | Production READY `9f209167...` at `dpl_4XvZ7DDszsojA7HiujkWM2xDZcpJ` |
| Current main↔prior visual code diff | **PASS SOURCE-LEVEL** | 12 commits/21 files, no core frontend visual source modified |
| Current Production fresh exact-SHA Chrome screenshots | **NOT RUN THIS TURN** | workflow dispatch unavailable, network not resolved by runtime |
| Actual ornamental visual deficiency audit | **REVIEWED SIX DOMAINS** | Screens listed §2, narrative §3 |
| Baseline original 390/768/1440/1600 and 500/1000/1500 evidence | **PRESENT AS HISTORICAL CAPTURES** | `vis2-00-baseline.json`, existing VIS2 artifacts |
| Phase III visual concept selection/user aesthetic acceptance | **NOT STARTED** | VIS3-01 separately after this unit |
| Actual UI/DB/geometry mutation | **NONE** | Documents only |

**Bounded closure:** This source-backed audit and screenshot index meet **VIS3-00's realistic evidence/reporting requirements**. If a later implementation requires *new* live screenshots at a newer SHA, generate them then and do not mistake this archived baseline for that capture. VIS3-01 begins with A/B/C art direction against exactly these same screenshots, not unverified re-capture claims. No code changes or authority migrations authorized in this turn.
