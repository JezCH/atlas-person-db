# VIS3-05 — Dashboard Frontispiece & KPI Ledger (2026-10-10)

**Implementation scope: actual source integration. Browser A/B and final aesthetic approval remain separate.**

## Changes
- The canonical `atlas-dashboard.js` Dashboard hero in loading and live views gets an opt-in original Grand Atlas frontispiece and a neutral nonfunctional rosette with `aria-hidden`; no fictional historical coat of arms or direction value.
- The existing `핵심 통계` region label now has an accessible `h3` and one engraved folio/chapter divider ahead of the original six KPI cards. The six KPI code/labels/values, drill-down targets, refresh action, attention queue, filters, 8 Person domain semantic colors, data reads and writes remain unchanged.
- The existing single `atlas-ui-phase3-ornaments.css` gets only namespaced Dashboard-specific rules, with responsive mobile corner treatment, forced-colors compatibility and the toolkit's reversible `data-atlas-ornament="off"`. It does not add repeated ornaments to KPI cards or data rows.
- Build dependency correction: Vercel's `scripts/prepare-vercel-public-ui.mjs` copied root CSS/JS/HTML but did not copy `assets/ui-ornaments/*.svg` to `public/assets/ui-ornaments/`. The new `syncPublicUiOrnaments()` publishes whitelisted original SVGs into the URL path referenced by the CSS, repairing the shared VIS3-04 asset delivery as well as VIS3-05.

## Tests / acceptance boundary
- Focused new tests check unchanged six KPI calls and action selectors, one source-owned ornamental stylesheet, CSS scope, opt-out, responsive breakpoint and presence/packaging of actual SVG files in the output.
- Real Chrome exact-SHA screenshots **must still be obtained** on 390/768/1440/1600 px with live/loading/error Dashboard states, same-DOM ON/OFF via `document.querySelectorAll('.atlas-ornament-v3').forEach(el=>el.dataset.atlasOrnament='off')`, 125/150% effective zoom, keyboard/touch/scroll, original KPI numbers, 200 responses for CSS/SVG and user visual approval. CI passing does not establish visual acceptance.
- VIS3-06 is a separate Spacetime exterior-chrome work unit and is not started by this PR.
