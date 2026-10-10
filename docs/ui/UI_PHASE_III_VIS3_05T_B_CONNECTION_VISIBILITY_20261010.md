# VIS3-05T-B — Connection status desktop ghost-visibility investigation (2026-10-10)

**Status: SOURCE FIX READY / real Chrome desktop proof running / Production not yet updated.**

## Root cause distinguished by breakpoint

- `atlas-main-authority-nav.js:setTopbar` correctly assigns `connectionStatus.hidden=true` outside the Persons domain and `false` within Persons.
- Common `styles.css` sets `.status{display:inline-flex}`, which can override the user-agent hidden display on **desktop**.
- However, `mobile-compact.css` explicitly defines `.topbar .status{display:none}` at **mobile widths**, so a 390px Chrome result of `hidden=true` + `display:none` is **not** proof that the desktop bug has vanished. Likewise, on Persons mobile `hidden=false` + `display:none` is expected.
- Early [Chrome run #38018884859](https://github.com/JezCH/atlas-person-db/actions/runs/38018884859) falsely attempted to require a 390px visible ghost and failed. A second run #38019030066 clarified that mobile Persons is hidden by design. Both failed tests are retained as diagnosis evidence, **not CI successes**.

**Targeted fix:** in the existing shared foundation CSS only, `#connectionStatus[hidden]{display:none}` to restore route visibility semantics for desktop non-Person domains. `index.html` cache-busts just this stylesheet. The existing mobile `.topbar .status{display:none}` rule remains unchanged. Do not fake network status or edit runtime model.

## Final branch Chrome gate

[Read-only Chrome test workflow](../../.github/workflows/atlas-vis3-05t-b-status-browser.yml) visits current Production at 390 and 1440 CSS px, records `hidden`, computed `display`, Dashboard 6 KPI cards, actual Dashboard→Persons→Dashboard transitions; **on the same live page only** it injects the exact selector from the branch source and captures corrected Dashboard output. At 390px both routes' status is hidden by mobile CSS. At 1440px Person is visible and Dashboard is expected to show the pre-fix ghost; the new selector must hide it without hiding Person. A green browser workflow is required before merge; that workflow is not itself the deployed PR build.

Temporary browser workflow/script should be retired from the final PR once archival screenshots and logs exist, but keep the evidence link here. ATLAS Integrity plus post-merge Production exact-SHA/css/live route validation remain separate gates. No other VIS3-05T fonts/sidebar, 8 domain colors, six KPI computations, mixed D ornaments, Spacetime camera, or DB changed.

Next bounded unit after closure: **VIS3-05T-C sidebar label and status-text contrast**; then KPI helper/mobile appbar readability and fold-toggle alignment. Full VIS3-06~17 roadmap remains unchanged, user final mixed D visual acceptance is not implied by this bug fix.
