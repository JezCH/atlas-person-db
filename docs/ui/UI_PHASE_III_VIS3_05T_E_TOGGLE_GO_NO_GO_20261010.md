# VIS3-05T-E — Desktop sidebar collapse toggle go/no-go (2026-10-10)

**Decision: NO-GO for a CSS/JS change in this unit; focused evaluation COMPLETE.** This is the optional T-05 unit after production-complete T-D, not a new design approval. Leave existing navigation, control geometry, cache keys, Person/Spacetime data and mixed-D ornament untouched.

## Source-checked baseline

- Canonical interaction: `atlas-responsive-shell.js` creates one native `button` in the sidebar brand, toggles `sidebar-collapsed`, updates `aria-expanded`, `aria-label`, tooltip, and persists an optional `atlas.sidebar.collapsed` preference. The media default uses 761–1239px compact mode. There is no additional data writer.
- Canonical geometry: `atlas-responsive-shell.css` desktop `.sidebar-collapse-toggle` is `right:-13px; top:72px; width:26px; height:36px`. The 208px desktop shell uses a 68px collapsed rail; 761–1239px uses a 230px overlay rail in expanded mode. At <=760px the desktop toggle is hidden and the separate mobile drawer is used.
- Canonical focus presentation: `atlas-ui-visual-foundation.css` has a `:focus-visible` ring. The 26 × 36 CSS px toggle exceeds the 24 × 24 CSS px WCAG 2.2 minimum target size (not a claim of full accessibility conformance).
- The prior T-A audit recorded a subjective mechanical/protruding appearance in the actual screenshot, **not a demonstrated functional blocker**. T-C verified broader sidebar states in a real Production-DOM Chrome comparison; it did not independently certify T-E visual variants.

## Bounded visual geometry experiment (NOT Production acceptance)

A locally reconstructed minimal sidebar DOM and the **relevant CSS geometry** were rendered in headless Chromium at 390, 768, 1000, 1440 and 1600 CSS px, expanded/collapsed where applicable. This is a controlled geometry prototype, **not** a byte-identical Production DOM/screenshot or a live deployed test.

| Candidate | CSS change from current | Collapsed-rail first-nav button overlap in this reconstruction | Decision |
| --- | --- | ---: | --- |
| **A — Current / split-line centered** | none; `right:-13px; top:72px` | 45 CSS px² (small corner of first route hit rectangle) | **Keep**: visible affordance, unchanged DOM/focus/behavior, no proven user-facing obstruction |
| B — Inset flush without vertical correction | `right:0; top:72px` | 162 CSS px² | **Reject**: substantially increases overlap of fold control and first navigation target in collapsed mode |
| C — Inset flush with earlier vertical position | `right:0; top:60px` | 0 CSS px² | **Not adopted**: improves synthetic rectangle separation, but crowds brand/divider/navigation boundary; actual focus-ring, hover and pixel hierarchy require a full Production-DOM comparison before replacing a working control |

Desktop A protrudes roughly 13px past the split line by design. All three candidates leave the declared 26 × 36 CSS px target unchanged. The minimal model reported no page-width overflow, and <=760px desktop-toggle hiding remained intact. No inference about real Production pointer obstruction or color contrast is made from the synthetic rectangles.

## Decision rationale and dependency gate

This optional P2 cosmetic change does **not** earn a new shared-shell CSS version, asset churn, entire browser acceptance cycle and Production release merely to remove the apparent protrusion. The closest viable alternative C still needs actual browser focus/hover and collapsed-state comparison before any safe adoption. The T-A audit explicitly prohibits treating protrusion itself as an accessibility failure. No new ornament is introduced and no issue is declared solved by CSS that has not been shipped.

**Completion conditions:** T-05 alternatives evaluated; no UI defect invented; go/no-go explicitly decided; code, CSS, JS, tests, DB, runtime and Production unchanged. This document is the durable outcome. **VIS3-05T-A through T-E are closed as bounded subunits** (T-E by no-change decision, not by claiming a new visual design is deployed).

**Next independent work unit:** `VIS3-06` — Spacetime external instrument/frame study, **only after the previously selected VIS3-05R mixed-D Dashboard has the user's final visual approval**. Start as non-deploy mockup / A/B comparison, not immediate Production CSS. Preserve X/Y camera, 9 macroregions, 500–1500% zoom, 0.748 compression, 140px axis, 8 Person semantic colors and user-parked P14 geometry.

If the user later explicitly prioritizes a less-protruding collapse toggle, reopen a new narrow unit for C with real live-DOM Chrome A/B at 390/768/1000/1440/1600, keyboard focus, pointer/hit rects, 125%/150% zoom and both collapsed/expanded states before merging. Never present this source-only comparison as a Production pass.
