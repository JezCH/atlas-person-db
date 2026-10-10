# VIS3-05T-B — Person-only connection status: smallest CSS fix (2026-10-10)

Status: implementation prototype in PR; **browser reproduction and deployment read-back pending**.

The existing topbar controller `atlas-main-authority-nav.js` intentionally shows `#connectionStatus` only on Persons and sets `.hidden=true` on Dashboard and other routes. Earlier Production screenshot still showed `연결 확인 중` on Dashboard. `styles.css` has `.status{display:inline-flex}`, an author display that may override UA `[hidden]` defaults.

Fix ONLY `atlas-ui-visual-foundation.css`: `#connectionStatus[hidden] { display:none; }`; update its cache query in `index.html`. No JS lifecycle, telemetry meaning, dashboard KPI, data, atlas ornament, camera or domains touched.

Source regression checks verify CSS selector + existing navigation ownership. **Before merge**, read-only Chrome should reproduce Dashboard hidden attribute plus still-visible computed display on current Production, then inject the exact branch CSS selector in the same DOM and verify Dashboard now hidden while Person remains visible (390/1440). After merge and deploy, inspect the actual Production source SHA and route transitions.

Phase III v2 progress: VIS3-05R mixed D technical check passed but user final aesthetic approval pending; VIS3-05T-A audit complete; VIS3-05T-B present unit; then sidebar T-02/T-03, KPI T-04/T-07, toggle T-05; VIS3-06~17 not advanced by this change.
