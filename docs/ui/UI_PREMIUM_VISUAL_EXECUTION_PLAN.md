# ATLAS Premium Visual Execution Plan — 2026-10-08

> **Status: COMPLETED / VERIFIED 2026-10-08 · canonical preserved design direction.**
> **Project:** `JezCH/atlas-person-db`. Read this file and `ATLAS_UI_VISUAL_GUIDELINES.md` before any subsequent UI design change.
> **Purpose:** Raise the deployed ATLAS experience to a truly premium, refined, visually coherent historical interface. This is a visual-design workstream, **not** the Admin Information Coverage workstream (#1896), and not data/identity correction.
> **Design thesis:** Monumental Chronographic Modernism / **Chronographic Luxury**.

## 1. Non-negotiable user decisions

1. **DO NOT convert the Person main table/register into cards.** The dense table, column alignment, chronology, activity information, sorting, information density and existing format stay. No grid of standalone Person cards, portrait-card system, collectible layout or extra illustration on main.
2. Improve **premium sophistication**, not just correctness, tiny-font adjustments, additional data exposure, or more decorative gold. Judge the actual visual effect.
3. Preserve all existing Person/Activity/Polity data, identities, terminology, relationship meaning, search, filter, sorting, authoring, UI navigation and routes.
4. Preserve Spacetime X/Y world coordinates, camera/zoom, layout, spatial assignment, chronology, era classification, LOD, label packing and collision management. No changing layout to fake visual grandeur.
5. Do not start unrelated polity cleanup, Person registration, admin authoring, portrait generation, P14 Territory/Geometry or #1896 read-only audit under this visual track.
6. Existing 8 semantic Person-domain colors and their classification meaning remain untouched; governance semantic gold must not be conflated with neutral Champagne/aged-metal UI decoration.
7. Main: no Person portraits; detailed Person view: portrait only when actually available. No invented or fake historical assets/icons. Ten era pictograms are optional/not a binding deliverable unless confirmed real assets, provenance, usability and budget.
8. Maintain screen-wide responsive usability, readable typography, accessible focus, reduced-motion preference and strong selection semantics. No particles, flashy effects, pseudo-3D museum columns, thick bevel, marble/parchment, loud gradients, endlessly moving glow, or visual clutter.
9. Tests passing/CI/Vercel success are **necessary but not proof of actual elegance**. Review real before/after screenshots (same view, state and data) at meaningful desktop and mobile widths whenever a screenshot-capable workflow is available. Do not claim production visual acceptance without rendering/inspection.

## 2. Reference synthesis

| Reference / role | Adopt | Reject |
| --- | --- | --- |
| Grand Seiko / precision | Fine metal-edge reflection, quiet depth, microscopic surface transitions, exact visual alignment | Branded watch layouts, visual noise, metal everywhere |
| Bvlgari / heritage editorial | Monumental date/name typography, negative space, strong editorial hierarchy, archival restraint | Luxury-commerce grid, oversized splash marketing |
| The Met / history | Credible chronology, relationships, archival order, navigable dense information | Flat white documentary site and undifferentiated data |
| Destiny / premium instrument UI | Responsive hover/focus/selected contrast and precise dense navigation | Loot rarity, collectible Person cards, neon/glow spam |
| Age of Empires IV / chronology | Time itself as the historic composition and selected events as moments of emphasis | Copying game HUD, distracting ornament |

**Identity:** Dark graphite / charcoal field; Ivory typography; neutral Champagne/Aged Bronze in *hairlines and restrained focus*; historical domain colors restricted to semantic signals. Monumental identity font balanced against clean sans interface and numbers.

## 3. Screen-by-screen scope and order

- **Stage P0 — Shared design calibration:** Audit the already-implemented V3 foundation, GLOBAL-M1/M2/M3 materials, V9 motion, semantic domain palette and cascade order. Reuse canonical tokens; no redesign/reset. Consolidate only observed cross-screen mismatch. Keep UI chrome subordinate to historical information.
- **Stage P1 — Spacetime (FIRST visual priority):** Refine year/era chronograph axes, major-year etching, macroregion inscription, chronology field depth, period seams, and selection-as-spotlight. Improve the *visible* canvas and tool/instrument experience, without changing world geometry, label layout, interaction, or era data. Start with **P1a chronograph-axis/selection finish**, then independently address tool stack only if screenshots show a problem.
- **Stage P2 — Person Detail:** Refine biography/hero identity, portrait reveal, editorial sections, chronicle depth, source/evidence hierarchy and selective transitions. No portrait creation, no changes to main table.
- **Stage P3 — Polity:** Refine canonical browser/dossier plaque material, polity identity inscription and selected/hover distinction. Keep review workbench operational rather than theatrically decorative.
- **Stage P4 — Dashboard:** Refine the existing monumental V11 control-center / ledger; large numbers, quiet hierarchy and tool-material coherence; no familiar SaaS rainbow KPI cards.
- **Stage P5 — Final mobile & interaction acceptance:** Review desktop/mobile visual parity for each stage; remove late-loaded CSS regressions and inconsistent emphasis; preserve responsive information completeness, focus visibility, reduced motion, no overflow.

**Explicit exception:** Person table is a frozen structural constraint throughout all stages. Surface-only cosmetic tuning is possible only after comparing actual before/after and without reducing density or column fidelity.

## 4. Implementation protocol

1. Resume from current merged `main` and inspect affected source, CSS load order, tests and already-completed PRs first. Never replay old plans that current code already implements.
2. Select a **bounded, visually meaningful** checkpoint. Write the affected selectors and visually expected change before editing. Keep each change layer resource-scoped and avoid mixing unrelated work.
3. Use shared Graphite/Champagne tokens; protect semantic colors and avoid layout/typographic scale changes to Spacetime coordinates, Person table columns or data structures.
4. Amend cache-busting CSS references and all version-pinned UI acceptance tests for affected assets; run scoped regressions and repository CI.
5. Produce before/after visual evidence when possible at 390px, 768px and 1440px using matching state and realistic data; verify actual visible differences. A source-only audit must be identified as such, not represented as screenshot validation.
6. Merge passing PRs to `main`, confirm deployment, and record SHA + concrete next checkpoint in this document or linked tracking issue.
7. **Priority of instruction:** new explicit user direction > this document's remaining plan; never silently relax the Person-table no-cards constraint.

## 5. Current checkpoint log

- **2026-10-08 P0:** Current main already contains V3 Graphite/Champagne foundation, shared GLOBAL-M1 material scale, V9 motion, V11 Dashboard, Chronicle Detail, Polity plaque and V6/V7 Spacetime presentation. Do not rebuild completed layers.
- **2026-10-08 P1a — MERGED:** PR #2134, main commit `6c721cb30939a8d97cb20c799b732caeff1992aa`, implements existing Spacetime premium time-axis / year-seam / selected-label finish. Do not reproduce this work. CI and Vercel deployed; true rendered visual acceptance remains separate.
- **2026-10-08 P1b — VERIFIED:** PR #2135, main commit `23b1e49487afe9871efd820cc31c5c6beb4ffcde`. Instrument/minimap/inspector precision material. Exact-SHA Production Chrome visual run [37730898739](https://github.com/JezCH/atlas-person-db/actions/runs/37730898739) **PASS**, 1600px Spacetime 500%/1500%/Meanwhile and 390px mobile screenshots.
- **2026-10-08 P2a — VERIFIED:** PR #2137, main commit `6ba699f804abb71d80a40015bbdba557ff17b826`. Biography/real portrait frame/editorial name and period, CSS-only; desktop/mobile Person Detail Chrome captures and semantic/geometry contracts **PASS**.
- **2026-10-08 P2b — VERIFIED:** PR #2139, main `ba8feba25b964864532c27ef6c2da7060a4b3b94`, Chronicle activities and source archive paint only; desktop/mobile Person Detail Chrome **PASS**.
- **2026-10-08 P3 — VERIFIED:** PR #2143, main `d9c5bf1334eff74c8ec8c969ac6da273028b75c6`, canonical Polity plaque/dossier skin; desktop/mobile collapsed/expanded real browser screenshots, 390px width, **PASS**.
- **2026-10-08 P4 — VERIFIED:** PR #2144, main `ae57cfba5c115e76e7c1036db0904f1d87e804a5`, Dashboard precision ledger; [Production Chrome run 37730044578](https://github.com/JezCH/atlas-person-db/actions/runs/37730044578) **PASS** with 1440px desktop and 390px mobile screenshots.
- **2026-10-08 P5 — VERIFIED:** QA PRs #2142, #2145, #2146, #2147. Corrected stale exact RGB checks and a nested browser-evaluation shadow-parser regex false positive. Actual Person rows measured **0px border radius, inset-only hairline**, desktop/mobile 2,120 rows, **0 real cards**. All exact-SHA Production visual + domain colors + Polity + main Person Detail acceptance at commit `092743c3bb606da437871aafcb4e07061d75ef30` **PASS** [run 37730898739](https://github.com/JezCH/atlas-person-db/actions/runs/37730898739); ATLAS Integrity, CORE, Vercel **PASS**.
- **CLOSE:** Scope P1–P5 finished. Current visual QA includes real screenshots; not an automated pixel-perfect baseline comparison. No invented portraits, table cardification, history/DB/semantic/camera/LOD changes. Out-of-scope first-camera empty periods or other UX/data logic need separately approved work; do not start without direction.

**Resume anchor:** Read this file, `ATLAS_UI_VISUAL_GUIDELINES.md`, the latest `main` source and the linked P1a PR. **Do not branch back into #1896 or Person cards.**
