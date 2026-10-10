# VIS3-05T-B — Desktop connection-status ghost and targeted CSS correction (2026-10-10)

**Status: root cause and minimal source correction VALIDATED IN REAL CHROME / branch PR pending merge and actual Production read-back.**

## Why earlier checks were misleading

`atlas-main-authority-nav.js` correctly sets `connectionStatus.hidden=true` outside Persons and false inside Persons. But `styles.css .status{display:inline-flex}` as author style can override `hidden` and leave the stale string painted **on desktop**. At mobile widths `mobile-compact.css` deliberately hides `.topbar .status` on all routes regardless of `hidden`.

Initial [run #38018884859](https://github.com/JezCH/atlas-person-db/actions/runs/38018884859) failed because it incorrectly expected a 390px ghost. [Run #38019030066](https://github.com/JezCH/atlas-person-db/actions/runs/38019030066) established mobile Person also hides the status by design. [Run #38019235913](https://github.com/JezCH/atlas-person-db/actions/runs/38019235913) reported 1440px `display:none` due to a test harness artifact: locally inserted CSS from the previous mobile viewport could persist on a **same-URL fragment-only Page.navigate**. That run is **not valid evidence of original 1440px source**.

The subsequently corrected **unmodified read-only** [run #38019352425](https://github.com/JezCH/atlas-person-db/actions/runs/38019352425) captured 1440px Production **`hidden=true`, computed `display:flex`**, an actually visible element box and six populated KPI cards, thus confirming the desktop ghost. This run also intentionally failed after recording it, because it still expected normal status visibility. These failed tests must never be described as successful automated checks.

## Minimal source correction

In `atlas-ui-visual-foundation.css` add only:
```css
#connectionStatus[hidden] {
  display: none;
}
```
Bump its URL cache version only in `index.html`, add a narrow regression test. Preserve `atlas-main-authority-nav.js` and the original `연결 확인 중` telemetry string. This is visibility correctness, not a declaration of network readiness or alteration of person records.

## Branch validation

[Final real Chrome proof #38019473646](https://github.com/JezCH/atlas-person-db/actions/runs/38019473646) **SUCCESS**; [4 before/after dashboard screenshots + persons control screenshots + JSON report, artifact #11657772833](https://github.com/JezCH/atlas-person-db/actions/runs/38019473646/artifacts/11657772833). The workflow forced a **new document with distinct query strings per viewport** to prevent earlier test CSS from leaking into 1440px evidence. It checks 390px mobile baseline (both routes hidden as intended), 1440px desktop baseline (Dashboard ghost + visible Person), then injects only this exact source selector into the **same unmodified Production DOM**, asserting Dashboard hides, Person remains at its prior display, KPI 6 unchanged, no added overflow. Captures original and locally corrected screenshots and report.

**Verified results:** 390px baseline and corrected: Dashboard `none` / Persons `none`, as expected from mobile CSS. 1440px baseline: Dashboard computed `flex` while `hidden=true`, Person `flex`. Injected exact CSS: Dashboard `none`, Person remains `flex`. Six KPI cards and document width unchanged. Both viewports passed the browser run. This validates the CSS rule against actual live behavior, **not** that the branch has been independently deployed to Production. The one-off PR Chrome script/workflow were **retired from the final patch** after recording the immutable run/artifact; the committed UI CSS, HTML cache bump and focused source tests remain. After merge verify Vercel READY + exact live CSS/index parity and actual route transitions before claiming release complete. UI ownership is isolated: no sidebar typography, ornaments, Person/Polity/Spacetime/camera or DB mutation.

**Next:** VIS3-05T-C sidebar long labels and low-contrast status metadata; then KPI helper microtype, optional sidebar fold button, followed by VIS3-06~17 gates only with required user approvals. VIS3-05R-E D-art direction final user approval still pending.
