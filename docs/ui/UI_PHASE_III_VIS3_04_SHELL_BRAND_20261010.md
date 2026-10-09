# VIS3-04 — Grand Atlas Shared Shell Mount (2026-10-10)

**State: source implementation; live browser A/B and user aesthetic approval still pending.**

## Scope
The existing static desktop ATLAS brand, real dynamic topbar h1, static version folio, mobile appbar title and drawer branding now opt in to the single VIS3-03 SVG/CSS toolkit. Reused original assets: cartouche, compass rosette, corner filigree, chapter divider and folio plaque. Decorative pseudo-elements are noninteractive and unnamed; SVG shapes do not imply a historical coat of arms, a true bearing or a new historical fact.

The existing DOM IDs, `data-atlas-domain` controls, button/aria state, exact version text, domain title/connection status, Person rows, eight semantic colors, Spacetime camera and plot geometry, DB and source provenance are unchanged. One cache-versioned late CSS inclusion; no new global specificity layer or runtime JS.

## Same-DOM visual comparison (required for aesthetic closure)
In a real Chrome served session, capture ON at 390/768/1440/1600 CSS pixels, then set `document.querySelectorAll('.atlas-ornament-v3').forEach(el => el.dataset.atlasOrnament='off')` and capture OFF at the same scroll/viewport/data. Delete the attribute on each root to restore. At 390px test opening drawer, menu touch targets, long domain labels and horizontal overflow. At 768px test sidebar collapsing and focus. At 1440/1600px test heading/status separation; repeat 125%/150% effective scaling, forced-colors and reduced-motion. Confirm the CSS and SVG HTTP responses and record exact deployed SHA plus screenshots. Historical VIS3-00 screenshots are not current exact-SHA evidence.

## Verification boundary
`tests/atlas-vis3-04-shell-ornament.test.mjs` checks source mounting, semantic controls, asset reuse, opt-out and no Person/Spacetime CSS intrusion. `tests/atlas-vis3-03-ornament-toolkit.test.mjs` is updated to allow the intentional first production mounting. **Source contracts and CI are not visual acceptance**; browser screenshots and user aesthetic approval remain unverified until independently captured.
