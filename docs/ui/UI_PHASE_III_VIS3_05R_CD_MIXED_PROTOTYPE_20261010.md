# VIS3-05R-C/D — restrained B+C mixed selection, branch prototype (2026-10-10)

**Decision:** User explicitly chose **D / mixed**: “혼합으로 잘 해봐 이어서”. This is permission to develop the small mixed treatment, **not** final 390px+ Production aesthetic approval.

**Implementation acceptance update:** The user-selected D variant has now passed real Chrome same-DOM A/D tests at four viewports, as listed below. The earlier 5px mobile KPI shift was detected and eliminated by making the KPI outline purely absolutely positioned and leaving the original heading line box unchanged.

**Source of proposal:** [VIS3-05R-B four-image comparison](UI_PHASE_III_VIS3_05R_B_FOUR_CONCEPT_COMPARISON_20261010.md), based on the same 1889×833 real, user-provided screenshot. The original image is not verified as a current-SHA Chrome capture. The responsive use of these shapes must be implemented as fluid CSS, not screenshot-pixel coordinates.

## Implementation decisions (source only, subject to review)

- **B at 68%**: Existing Dashboard hero keeps the 54px subtle right-corner SVG. Replace V11's long decorative `::after` stroke with four partial 1px etched lines: short top-left double fragment plus short bottom-right double fragment. Content heading, eyebrow, description and refresh control are never the decoration surface. No large cartouche or compass restored.
- **C at 76%**: The existing semantic `<h3 id="dashboardKpiHeading">` gains a harmless `data-atlas-o-decor` opt-in and a visually ~132×28px 1px outline **positioned around the original h3 without changing its line box** with chamfered corners and a single 5px diamond terminator. `현재 원본 집계` remains an unchanged right-side text node. KPI values, actions and domains retain their original source code.
- **Mobile ≤600px**: no new hero etched lines; original small corner persists, reduced KPI title plate 116×26px, diamond hidden. Mid-width ≤900px: shorten line fragments. System forced colors: ornaments hidden.
- All ornament paint is pseudo-only and `pointer-events:none`, opt-out via `data-atlas-ornament="off"`, no new SVG or image/JS import, no additional duplicate stylesheet. Cache query bumped for CSS. The canonical VIS3-03 originals still exist.
- Tests are source-scoped to check exact new rules, CSS budget, breakpoints, unchanged six KPI calls, controls and no Person/Spacetime intrusion.

## Required before Production aesthetic closure

The four visual options in VIS3-05R-B were static screenshot composites. This implementation is not a proven pixel-perfect match until checked in Chrome. **Verified read-only Chrome comparison:** [GitHub Actions run #38011617853](https://github.com/JezCH/atlas-person-db/actions/runs/38011617853), **SUCCESS**, source branch SHA `adaee57c1582e3923167d671c9ec83daad0c19bb`, [eight A/D PNG screenshots + report, artifact #11654120295](https://github.com/JezCH/atlas-person-db/actions/runs/38011617853/artifacts/11654120295). Comparison used the live Production HTML/data within the same browser DOM; only the exact D CSS delta and selected `h3` attribute were injected locally. **This is not a separately deployed PR preview or an exact-SHA full Production branch build**. All four widths 390×844, 768×1000, 1440×1100, 1600×1100 passed: six live KPI cards unchanged, text values/buttons unchanged, no added document/body overflow, and original hero, title, refresh, KPI and first panel geometry unchanged. In mobile the extra hero etching was hidden as intended. User visual final approval and 125/150% effective zoom remain open.

The first Chrome run #38011288092 identified a **real 5px mobile KPI vertical displacement**. This failed gate was corrected before the successful final run. The browser-runner workflow and script are one-time diagnostic tools and are **retired from the PR after the evidence artifact was captured**; their deletion does not modify the successfully tested UI CSS/HTML/JS bytes.

Vercel default ignored-build step explicitly skips Preview deployments; do not override the project's preview policy. The UI change can be merged to Production on the strength of selected D + CI + browser overlay evidence, while still clearly marking **user's Production aesthetic sign-off as pending**.

**Boundary:** VIS3-05T sidebar/legibility and VIS3-06 Spacetime not included. 
