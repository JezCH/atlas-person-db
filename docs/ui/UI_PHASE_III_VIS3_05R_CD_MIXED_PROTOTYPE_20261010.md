# VIS3-05R-C/D — restrained B+C mixed selection, branch prototype (2026-10-10)

**Decision:** User explicitly chose **D / mixed**: “혼합으로 잘 해봐 이어서”. This is permission to develop the small mixed treatment, **not** final 390px+ Production aesthetic approval.

**Source of proposal:** [VIS3-05R-B four-image comparison](UI_PHASE_III_VIS3_05R_B_FOUR_CONCEPT_COMPARISON_20261010.md), based on the same 1889×833 real, user-provided screenshot. The original image is not verified as a current-SHA Chrome capture. The responsive use of these shapes must be implemented as fluid CSS, not screenshot-pixel coordinates.

## Implementation decisions (source only, subject to review)

- **B at 68%**: Existing Dashboard hero keeps the 54px subtle right-corner SVG. Replace V11's long decorative `::after` stroke with four partial 1px etched lines: short top-left double fragment plus short bottom-right double fragment. Content heading, eyebrow, description and refresh control are never the decoration surface. No large cartouche or compass restored.
- **C at 76%**: The existing semantic `<h3 id="dashboardKpiHeading">` gains a harmless `data-atlas-o-decor` opt-in and a visually ~132×28px 1px outline **positioned around the original h3 without changing its line box** with chamfered corners and a single 5px diamond terminator. `현재 원본 집계` remains an unchanged right-side text node. KPI values, actions and domains retain their original source code.
- **Mobile ≤600px**: no new hero etched lines; original small corner persists, reduced KPI title plate 116×26px, diamond hidden. Mid-width ≤900px: shorten line fragments. System forced colors: ornaments hidden.
- All ornament paint is pseudo-only and `pointer-events:none`, opt-out via `data-atlas-ornament="off"`, no new SVG or image/JS import, no additional duplicate stylesheet. Cache query bumped for CSS. The canonical VIS3-03 originals still exist.
- Tests are source-scoped to check exact new rules, CSS budget, breakpoints, unchanged six KPI calls, controls and no Person/Spacetime intrusion.

## Required before Production aesthetic closure

The four visual options in VIS3-05R-B were static screenshot composites. This implementation is not a proven pixel-perfect match until checked in Chrome. **Do not claim same-DOM exact-SHA comparison, 390/768/1440/1600 render, 125/150% zoom acceptance, or user sign-off without actual evidence.** Sandbox Chrome remains blocked by HTTP 402 usage quota as previously recorded. If no authoritative Chrome path is available, keep PR open and share its Vercel preview for human review rather than merge blindly.

**Boundary:** VIS3-05T sidebar/legibility and VIS3-06 Spacetime not included. 
