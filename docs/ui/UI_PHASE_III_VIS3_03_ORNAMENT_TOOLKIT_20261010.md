# VIS3-03 — Opt-in Original Ornament Toolkit (2026-10-10)

**Status: CANONICAL / implementation complete as isolated reusable assets. NOT mounted in the Production UI.**

**Single-authority decision (2026-10-10):** PR #2320 is the sole active VIS3-03 toolkit. The earlier merged parallel kit from PR #2310 (`atlas-ui-ornament-kit-v3.css`, `assets/ornaments/atlas-v3-*.svg`, its demo and tests) was retired because maintaining two interchangeable opt-in CSS APIs would fragment VIS3-04+ integration. Its historical completion report is retained as audit evidence. This is not a Production mounting or aesthetic approval.

The user requested *visible historical ornament* rather than another micro-border exercise. These are original vector abstractions, not screenshots of, nor copied pixels from, historical objects. This bounded unit implements reusable design primitives for the screen-specific A Grand Atlas / B Chronometer / C Illuminated Codex direction established in canonical visual guidelines v2.0.

## Files
- `atlas-ui-phase3-ornaments.css` — one fully opt-in CSS stylesheet; **not referenced in production `index.html`**.
- `assets/ui-ornaments/*.svg` — eight original transparent SVG components: cartouche, compass rosette, corner filigree, chapter divider, folio plaque, astrolabe, codex panel and illuminated initial.
- `experiments/vis3-03-ornament-gallery.html` — standalone browser gallery demonstrating visible shapes, desktop/mobile breakpoints and a decoration-only toggle.
- `tests/atlas-vis3-03-ornament-toolkit.test.mjs` — zero-dependency Node tests checking SVG/resource safety, CSS isolation, accessibility and no active Production mounting.

## How to preview
Open `experiments/vis3-03-ornament-gallery.html` under the repository static web server. The gallery is **not a live Person/Polity/Spacetime screen** and uses demonstration labels, never fabricated historic subjects or actual runtime metrics.

## Integration contract for VIS3-04+

1. Load `atlas-ui-phase3-ornaments.css` with deliberate cache-busting near the actual route owner; do not casually append another global override. Mount only the applicable shell/region under `.atlas-ornament-v3`.
2. Put `data-atlas-o-decor` on one of the real semantic containers: `.atlas-o-cartouche`, `.atlas-o-corners`, `.atlas-o-folio`, `.atlas-o-divider`, `.atlas-o-instrument`, `.atlas-o-codex`, `.atlas-o-initial`, `.atlas-o-rosette`. The actual heading/text/identity remains ordinary DOM, and the pseudo ornaments are unclickable.
3. Use `data-atlas-ornament="off"` on the parent to **reversibly disable** ornament rendering without removing real text/hit targets.
4. A (Grand Atlas) is for shared title/Dashboard/Polity; B (Chronometer) is **outside plotted data** for Spacetime tool chrome; C (Codex) belongs to Person biography/source entrance. Do not apply an ornate frame to every dense Person row.
5. Shared brass tokens inherit existing UI neutral `--atlas-honor-metal*`, **never mutate the eight representative domain semantic colors**. Never identify this compass rosette as a real bearing, astrolabe as real astronomical data, plaque as authentic archival identifier, or neutral filigree as true historical coat of arms.
6. Original SVGs are decorative; use `aria-hidden` for an explicit decorative IMG or present through CSS pseudo elements with `pointer-events:none`; preserve keyboard/other accessibility.
7. `@media (forced-colors:active)` suppresses decorative images while leaving framing, `@media (prefers-reduced-motion:reduce)` cancels decorative motion, small viewport CSS reduces ceremonial chrome.
8. Later browser acceptance must test **390/768/1440/1600 CSS widths**, real UI data+focus+semantics, Spacetime 500/1000/1500% at both East Asia and Europe, source citation, real/no portrait, plus real Production exact-SHA. CSS source lint/tests are **not** equivalent to aesthetic user signoff.

## Unit boundary
VIS3-03 ends at the source-owned toolkit + opt-in gallery and tests. There are **zero edits** to `index.html`, existing frontend runtime behavior, existing CSS layers, DB, Person/Activity/Polity records or location geometry. The **next** unit VIS3-04 is first Product shell/brand mounting of the ornamental system, and must include screenshot before/after evidence.
