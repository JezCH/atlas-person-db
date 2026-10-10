# VIS3-05T-B — Production connection-status display audit (2026-10-10)

**OUTCOME: TWO BREAKPOINTS VERIFIED; PREVIOUS CSS BUG HYPOTHESIS NOT REPRODUCIBLE; NO SOURCE PATCH.**

## Investigation history and actual evidence

The October screenshot appeared to show `연결 확인 중` on the Dashboard. Source inspection proposed that initial `styles.css .status{display:inline-flex}` might override HTML `hidden` on non-Person routes. Instead of immediately merging a CSS override, we tested actual Production Chrome.

- [Run #38018884859](https://github.com/JezCH/atlas-person-db/actions/runs/38018884859): first incorrect test expected a 390px Dashboard ghost. Chrome actually returned `hidden=true`, `display=none`. The test **failed as written**; do not mislabel it a passing regression.
- [Run #38019030066](https://github.com/JezCH/atlas-person-db/actions/runs/38019030066): discovered mobile `persons` has `hidden=false` but `display=none`. This is intended because **`mobile-compact.css` hides `.topbar .status`** on mobile. A test that demands visible Person status at 390px would be wrong.
- [Run #38019235913](https://github.com/JezCH/atlas-person-db/actions/runs/38019235913): extended to desktop 1440px. On Dashboard `hidden=true`, computed `display=none`, rect [0,0,0,0], 6 real KPI cards. On Persons `hidden=false`, computed `display=flex`. Thus the suspected **desktop** ghost was not reproduced either. This third workflow also **failed intentionally** because it incorrectly demanded that the pre-fix ghost be present.
- The last read-only browser workflow on this PR removes those invalid expectations and checks **actual expected current behavior** for Dashboard→Persons→Dashboard at 390 and 1440, with PNGs and JSON evidence. This is the authoritative final verification, not a test of a nonexistent fix.

## Disposition

The branch originally contained a proposed `#connectionStatus[hidden]{display:none}` rule, `index.html` cache bump and a source test. **All three are reverted/deleted before merge**. There is no need to change the shared status owner JS, manipulate actual connection semantics, or deploy a redundant stylesheet fix. The historical screenshot and current build are different evidence windows; it is not proven which earlier release/state led to the visible string. A stale DOM textContent can still contain hidden status text, so use `getComputedStyle` and element geometry rather than text searches.

The final audit PR adds only durable documentation and short-lived read-only QA evidence. No Production feature code/DB/geometry/semantics touched. The one-off browser script/workflow are removed after evidence is secured; the run and downloadable screenshots remain as a reference.

## Phase III work continuation

- VIS3-05R-E restrained mixed D is Production-integrated and Chrome technically validated; **user final design approval still pending**.
- VIS3-05T-A legibility/sidebar audit completed.
- **VIS3-05T-B current status display investigation completed with NO CODE CHANGE.**
- **Next: VIS3-05T-C** improve sidebar long nav labels and subordinate status readability/contrast, first design the smallest scoped modification and validate expanded/collapsed desktop, mobile drawer and 390/768/1440/1600.
- Then KPI microtype T-04/T-07, optional collapse-toggle T-05, with VIS3-06~17 sequence preserved. No new golden ornament before existing Phase III approval gates.
