# VIS3-05T-A — Dashboard, sidebar and auxiliary-type legibility audit (2026-10-10)

**Result: READ-ONLY AUDIT COMPLETE / CSS-JS IMPLEMENTATION NOT STARTED.**  
Based on `main` at `e9f14e1bd2d37ca854b62c27b4557a965ee6d7e2`, the actual 1440px and 390px Production Chrome captures from [VIS3-05R-E](UI_PHASE_III_VIS3_05R_E_PRODUCTION_ACCEPTANCE_20261010.md), and narrowly scoped source ownership inspection. The original 12-png artifact is [GitHub Actions #38013170081](https://github.com/JezCH/atlas-person-db/actions/runs/38013170081/artifacts/11655751239), deployed source SHA `0c9746028efa307d69580df08a18dfcf040af8b8` (the reviewed files remain unchanged on this current main). This is **not** a new browser capture or computed-style audit.

## 1. Findings and evidence

| ID | Priority | Observed user-visible issue | Concrete source/evidence | Safe correction scope |
| --- | --- | --- | --- | --- |
| T-01 | **P0** | In the actual 1440px Dashboard screenshot, the header still shows `연결 확인 중` above fully populated KPI cards; this misleading indicator is not a verified connectivity failure | `atlas-main-authority-nav.js:setTopbar()` sets `connectionStatus.hidden=true` for non-Person domains and `false` for Persons; `styles.css` author rule `.status{display:inline-flex}` can override UA `[hidden]` display:none, and `atlas-ui-visual-foundation.css` does not explicitly restore `[hidden]` | First prove **DOM hidden property vs actual computed display** in Chrome after switching Dashboard→Persons→Dashboard; if reproduced, add a narrow `#connectionStatus[hidden]{display:none}` or equivalent in owning shell CSS; do not spoof `연결 정상` or alter data/API health semantics |
| T-02 | **P1** | Sidebar `시공간 인물도` and `지리 형상` wrap to two lines; long state label competes with the route label, yielding cramped/uneven rows | Actual 1440px capture, `atlas-ui-visual-foundation.css` desktop shell 208px with `.nav-item{grid-template-columns:20px 1fr auto; padding:9px 10px 9px 11px}`; `atlas-main-authority-nav.js` inserts Spacetime as a bare text node followed by `small`; `atlas-ui-authority-catalog.ko.js` uses `사용 가능 · 검토 공간 기준` | Design a 2-line **label-first** navigation layout for only long labels, with status deliberately on a subordinate line or accessible tooltip; preserve actual status string and both desktop/mobile `data-atlas-domain`, nav route, focus and collapse behavior. Do not simply truncate the route label. |
| T-03 | **P1** | Small sidebar status, version and muted subtitle lack adequate small-text contrast on graphite | Static declarations: `.nav-item small{color:#596168;font-size:9px}` on `#0e1114` gives ~**3.01:1**; `.sidebar-foot{color:#50585f;font-size:9px}` on same background gives ~**2.62:1**; `--atlas-text-muted:#6e767c` on `#121518` gives ~**3.97:1**. All below 4.5:1 for normal text. Ratios are calculated for declared flat colors, **not** final live computed blended pixels. | Raise normal text to >=4.5:1 without changing any semantic Person-domain color or overstating version/state emphasis; aim supporting text >=10–11px, check real computed/contrast across selected and unselected sidebar backgrounds. Keep deliberately decorative hairlines exempt from text contrast tests. |
| T-04 | **P1** | KPI supporting descriptions look small, especially mobile; long NamuWiki details span cramped lines | Real 1440px/390px screenshots; `atlas-dashboard-monumental-v11.css` sets KPI label `small{font-size:9px;color:#858d92}`, at <=600px 8px; helper `span` is 9px mobile (and desktop `#8f979c`). Flat contrast of label `#858d92` over `#171b1e` is ~**5.13:1**, so this is primarily **font-size/density**, not all dark text failing WCAG. | Increase label/supporting copy cautiously only after geometry simulation at 390/768/1440/1600; use 10–11px where it fits and a 2–3-line clamp/wrap if a long factual status requires it. Preserve exact six KPI values, drill-down affordances and all underlying labels; do not enlarge fact card or revise meaning without measured layout checks. |
| T-05 | **P2** | Sidebar fold toggle projects beyond the 208px boundary and looks mechanically attached rather than integrated | Screenshot; `atlas-responsive-shell.css` sets toggle `right:-13px;top:72px;width:26px;height:36px` under min-width 761px. `atlas-ui-visual-foundation.css` changes material, not geometry | Compare 2 low-motion prototypes (edge-flush vs centered on split line) without sacrificing expanded/collapsed hover/focus hit box; verify desktop and the special 761–1239px auto-compact shell. Do not conflate visual protrusion with accessibility failure without a separate target-size check. |
| T-06 | **P2 investigation** | Status/lifecycle looks inconsistent across Dashboard and Person domain | `status-summary.js` updates a separate `#registrationSummary` / Person Runtime banner; `atlas-main-authority-nav.js` switches only visibility for `#connectionStatus` in Dashboard. Completed Dashboard KPI reads use an independent `atlas-client-data-store` path | Audit status owners separately before touching shared loading states. Avoid interpreting populated Dashboard KPIs as a promise that Person edit/API connection is ready. No forced state flip or fake telemetry. |
| T-07 | **Mobile** | Mobile appbar secondary `ATLAS 편집` remains tiny | `atlas-ui-mobile-v8.css` sets `.mobile-appbar-title small{font-size:7.5px;color:#666e73}`; actual 390px screenshot | Review whether the secondary microtype is essential; if it is, increase contrast and size without shrinking the primary `대시보드` title or mobile menu target. Avoid desktop/sidebar CSS leakage into mobile. |

### Color-ratio computation convention

WCAG relative luminance uses sRGB gamma correction, with contrast `(L_lighter + 0.05)/(L_darker + 0.05)`. The numbers above are **static CSS declaration color pairs**, not instrumented exact computed style values, and gradients/material overlays can affect real ratios. Normal body/helper text target >=4.5:1; presentation-only line ornaments do not have the same test. A screenshot visually confirming faint text is evidence of a design concern but does not independently establish calculated pixel ratios.

## 2. Ownership and dependency constraints

| Scope | Existing authority | MUST stay unchanged unless separate approved work |
| --- | --- | --- |
| Shared sidebar/header and text colors | `atlas-ui-visual-foundation.css`, `atlas-responsive-shell.css`, `atlas-main-authority-nav.js`, authority catalog metadata | hash navigation, desktop collapse, 761–1239px special sidebar, mobile drawer, all route/status labels |
| Dashboard label density | `atlas-dashboard-monumental-v11.css` and `atlas-dashboard.js` | six kpiCard computations, click routing, status freshness/model data, source display |
| Visual ornament source | `atlas-ui-phase3-ornaments.css` | selected mixed D edge etching and KPI small plate; no more gold overlays; preserve opt-out toggle |
| Person/Spacetime data & camera | unrelated owner files | 8 semantic Person colors; 9 macroregions, X/Y camera, compression 0.748, zoom 500–1500%, 140px axis, Person register density, P14 PARKED_BY_USER |

Dynamic nav labels and Person/Spacetime status are **shared shell concerns**; one route's appearance cannot be fixed through a selector that breaks the other route's activation, scrolling, focus, or collapse.

## 3. Implementation sequence, without opening multiple competing stylesheets

1. **T-01 narrowly verify/repair** `hidden` versus computed `display` on Dashboard/Persons navigation. This is a display/lifecycle presentation correction only, not status API/DB rewrite.
2. **T-02+T-03** CSS/DOM shell label grid and small-text contrast. Preserve status metadata and all domain keys, re-evaluate in expanded, 68px collapsed, 761–1239px compact and mobile drawer. Do not decrease label width via another decorative icon.
3. **T-04+T-07** KPI helper and mobile microtype density; separate responsive source test and screen-based acceptance, avoiding a repeat of the prior 5px KPI displacement.
4. **T-05** fold-toggle alignment only if actual hit/focus and pointer geometry passes. May be deferred if visual value is small.
5. **T-06** independent telemetry semantics inspection if the `hidden` fix still shows an incorrect state.

Scope each PR by CSS/JS authority to avoid unnecessary conflict; do not reopen resolved VIS3-04/05R ornament choices or start VIS3-06 in parallel with unfinished user aesthetic sign-off.

## 4. Acceptance and exact restart

Before each source change: capture same live Dashboard and Person domain with navigation-expanded/collapsed status; test Dashboard→Persons→Dashboard and mobile drawer; record `hidden`, `getComputedStyle(display)`, relevant pixel rectangles and contrast of rendered texts. No static-only test can certify the real DOM gate.

After change: CI, exact-SHA Production source parity, 390/768/1440/1600 Chrome screenshots, keyboard tab/focus, no new overflow, Person/Spacetime smoke, KPI 6-value parity, no new ornamental overlap. Browser zoom 125/150% requires actual native test before any unqualified zoom acceptance claim.

**This turn:** audit only, zero source UI/CSS/data edits.  
**Next bounded unit:** VIS3-05T-B, beginning with source-validated runtime reproduction and smallest `connectionStatus[hidden]` fix, followed by independent contrast/navigation-layout work.  
**VIS3-05R-E:** technical evidence PASS, final user's D-design aesthetic approval remains pending.
