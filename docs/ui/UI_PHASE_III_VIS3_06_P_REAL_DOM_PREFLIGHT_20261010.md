# VIS3-06-P — 실제 Production DOM 기반 관측기구 비배포 검증 (2026-10-10)

> Work unit: **design feasibility / browser-only comparison**. This is a pre-approval diagnostic and is **not** VIS3-06 runtime implementation or the gated full VIS3-06-R production acceptance.
>
> **Validation:** pending GitHub Actions execution at initial authoring. Replace this line with exact workflow run and result after CI.

## Purpose / project-wide objective

Phase III improves the historical atlas as **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**, balancing (a) readable real Person/Polity/Spacetime records and precise search, (b) a distinct historical publication/instrument character and (c) restrained materials, responsive operation and accessibility. It is *not* a quota to roll out all 42 candidate ornaments.

The prior [VIS3-06 concept unit](UI_PHASE_III_VIS3_06_CHRONOMETER_CONCEPT_REVIEW_20261010.md) selected a **44×25px brass-inspired double arc (B)** for *evaluation*, and a smaller arc (C) as backup against current Production (A). The prior comparison was a synthetic DOM, so it cannot establish that B is physically in a free gap or remains legible in actual Spacetime.

**Gate status is unchanged:** Dashboard VIS3-05R mixed-D is deployed and technically accepted but lacks final subjective user signoff. Do not treat continued planning/testing as user signoff or make actual UI/CSS/DB changes. VIS3-06-P is therefore an evidence-gathering step only.

## Exact touched resources

- **Added** `scripts/verify-vis3-06-production-dom-preview.mjs`: a read-only Chrome DevTools Protocol runner accessing **https://atlas-person-db.vercel.app/#atlas-spacetime** with real Production HTML/CSS/JS and *the same loaded DOM* for A/B/C. Adds an in-memory `<style>` element **only inside headless Chrome**, alongside `data-vis3-06-preview`; neither is committed into app runtime. No API writes or external account mutations.
- **Added** `.github/workflows/atlas-vis3-06-production-dom-preview.yml`: PR-scoped/manual, read-only, Node 22 + Chromium, fonts-noto-cjk; uploads PNG/JSON evidence as 30-day GitHub Actions artifact. **No Vercel deploy step**.
- Documentation updates limited to this report and the existing Phase III plan. Actual Person/Polity/Spacetime data, runtime CSS/JS, asset-loader, and database are untouched.

## Comparison contract

| Variant | In-browser-only visual | Gate |
| --- | --- | --- |
| A — current | No injected pseudo ornament | Baseline |
| B — 2-ring 44×25px arc with 3 tiny instrument-engraving marks | In **actual measured gap** between `.spacetime-controls` and `.spacetime-precision-legend`; no fake numeric/time/geographic markings | Candidate only |
| C — 1-ring 32×19px arc, lower opacity | Same measured gap | Fallback candidate |

No false geographic bearing, era label, chronology ticks, Person activity coordinates, hypothetical portrait, flag or heraldry.

Each actual Production viewport is independently loaded at **390, 768, 1000, 1440, 1600 CSS px**. At width 1440, the script additionally seeks **1500% camera zoom** using actual Zoom+ buttons, then repeats A/B/C on the same zoomed chart. An ornament is omitted, *not moved over controls*, if the actual free horizontal gap is insufficient. Below 901px, both ornaments are forcibly hidden.

The script asserts, for A vs B/C on the same loaded DOM:

1. Identical actual search field, zoom buttons/output, legend button and toolbar bounds/text/value/visibility.
2. Identical document scroll width, real year tick labels/bounds and count, real macroregion codes (source-provided 9 stable regions), Person virtual label samples and DOM count, chart/frame rectangles, scroll/camera state, focusable-element count.
3. Noninteractive/pointer-events-none pseudo decoration and no newly introduced document-level overflow.
4. Computes **actual candidate-vs-control overlap in CSS px²**, records it as **REJECT_OVERLAP** (rather than silently declaring a style approved); stores actual results per width and state.
5. Real Production DOM screenshot for each A/B/C combination plus JSON, with clear artifact provenance.

The CI assertion reports whether applying *the ephemeral CSS on real Production DOM* preserved those invariants. Passing does not by itself imply that B/C has satisfactory historical aesthetic quality, contrast, genuine native browser 125%/150% zoom, all focus states or final user approval.

## Safe completion and next resume

A valid completed unit must include: a GitHub Actions **success or truthful failure diagnosis**, concrete browser evidence or an explicit capability blocker, repository-required Integrity CI, and merged durable report/checkpoint. A visible candidate without controls overlap is eligible for user review, not an authorization for deployment.

**Pending unit after VIS3-06-P:** VIS3-06-R full actual-DOM accessibility, 125/150% native browser zoom, hover/focus/open legend, selected Person, varied data states and qualitative review **after the separate VIS3-05R user aesthetic acceptance gate**. If a real overlap appears, revise only the concept preview and do not release the offending candidate. Only after a per-screen style choice may a narrow Spacetime-scoped implementation/Production acceptance unit be opened. VIS3-07–VIS3-17 remain on the Phase III v2 roadmap and must not be marked done prematurely.
