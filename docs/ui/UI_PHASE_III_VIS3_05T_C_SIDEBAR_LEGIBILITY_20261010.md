# VIS3-05T-C — restrained desktop sidebar readability (2026-10-10)

**Phase III v2.0 scope:** T-02/T-03 only. Existing Dashboard, Person and Spacetime data and all controls, geometry, ornaments, semantic status labels and 8 domain palette remain unchanged. VIS3-05R-E user aesthetic acceptance is separately pending.

## Source of issue

The approved [VIS3-05T-A readability audit](UI_PHASE_III_VIS3_05T_A_LEGIBILITY_AUDIT_20261010.md) observed cramped desktop `시공간 인물도` and `지리 형상` labels, long readiness statuses competing for one grid row in a 208px sidebar, 9px `#596168` helper copy on `#0e1114` (~3.0:1 static contrast) and 9px `#50585f` footer (~2.6:1).

## Proposed minimal change

One existing owner stylesheet `atlas-ui-visual-foundation.css`: **only the five long-status desktop routes** `spacetime,polities,places,events,geometry` use grid columns `20px minmax(0,1fr)` with the original live label occupying natural row 1 and unmodified `small` content on row 2; no HTML/JS rewrite, no status abbreviation, truncation, image, border, plaque or icon. Short routes including Dashboard, Person, Registration, Source retain one-row geometry. `.workspace-shell:not(.sidebar-collapsed)` excludes 68px icon-only rail. Under 760px a separate `.mobile-nav` exists and is not matched by the desktop selectors.

Raise small `.nav-list .nav-item small` to 10px/#a2a9ae, `.sidebar-foot` 10px/#99a2a8 and `.brand span` 10px/#99a2a8. Original status label / route / `aria-current` semantics remain in canonical data/JS. The literal dark background static contrast estimates for those new colors exceed 4.5:1, but this is **not proof of computed user-pixel contrast on layered/selected surfaces**.

## Acceptance gate

Source regression verifies no new cross-owner files and no changes to nav IDs, labels, 9 regions, 500–1500% X/Y spacetime camera, P14 pause, and six KPI truth. Before merging, run **read-only current Production Chrome** at 390/768/1000/1440/1600px with branch CSS inserted locally (and screenshot/metrics for both) to check long-label single-line body text vs subordinate status, click and focus targets, status no truncation, collapsed 68px navigation, desktop 761–1239px auto-compact, mobile drawer unchanged, and no overflow/new decorative clutter. A passing static check alone cannot claim visual success.

**Next bounded unit:** VIS3-05T-D KPI helper copy and mobile microtype, then T-05 collapse-toggle alignment, then VIS3-06–17 in original design-gated sequence. Do not convert this to an ornament expansion.

## Browser comparison and source validation results

- [Real Production same-DOM Chrome compare #38020737415](https://github.com/JezCH/atlas-person-db/actions/runs/38020737415), **SUCCESS**, [A/B 10 PNGs and machine-readable geometry/status report, artifact #11657957054](https://github.com/JezCH/atlas-person-db/actions/runs/38020737415/artifacts/11657957054). Tests at **390, 768, 1000, 1440, 1600 CSS px** all passed. The PR-only CSS was injected into **unmodified live Production DOM**, not separately deployed.
- In five tested viewports, all **9 desktop menu domain keys/labels/status strings** remained byte-identical in the DOM. At desktop widths, five long routes' status rectangles moved into a subordinate row, stayed within their buttons, and the route title fit a single line. Four short routes retained their prior row height. No new horizontal overflow or midpoint hit-target obstruction. The actual **68px collapsed rail** continued hiding statuses, and **390px mobile drawer labels/status strings remained unchanged**.
- New small text paint colors are tested against declared opaque `#0e1114` canvas to exceed WCAG 4.5:1 on the static pair. Layered/selected surface **actual pixel-based contrast was not independently measured**; the browser evidence asserts geometry and CSS deltas, not broad accessibility conformance.
- [ATLAS Integrity #38020737511](https://github.com/JezCH/atlas-person-db/actions/runs/38020737511) **SUCCESS**, including full current test suite. Initial run #38020619952 found two *test expectation mistakes only*: previous asset version assertion and our source owner guard matching a comment; both corrected without further CSS modifications.
- The temporary PR browser script/workflow are **retired from the final branch after PASS**. Only the actual canonical foundation CSS, index cache key, synchronized tests and documentation remain. The final commit may have a newer merge parent to preserve other parallel workstreams.
- **Production release still requires a READY deployment, exact source parity, and live read-back**; a green browser overlay is not a release claim. Final subjective style approval for the previously selected Dashboard mixed D remains separate and pending.

**Restart point:** once VIS3-05T-C is deployed and verified, resume **VIS3-05T-D** KPI descriptive type and mobile appbar (T-04/T-07) separately. VIS3-05T-E fold-toggle (T-05) follows, then VIS3-06–17 with established comparison gates.

## Release-gate checkpoint — 2026-10-10

- [VIS3-05T-C PR #2373](https://github.com/JezCH/atlas-person-db/pull/2373) **merged** at `1d4661de283bf8c6fced50c30ed8ed6494356d4b`. [Final PR ATLAS Integrity #38020953093](https://github.com/JezCH/atlas-person-db/actions/runs/38020953093) passed after reconciling the branch with other disjoint `main` workstreams.
- The GitHub Vercel commit-status context is **failure**: `Deployment rate limited — retry in 24 hours.` This is **not** a Chrome functionality failure. The latest confirmed Vercel Production **READY** commit remains `ca42ed47405cb6a96ae071e0b91f2fa85d07c945` and live alias HTML/CSS do **not** yet contain `vis3-05t-c-navlegibility-v1` or the T-C block. A merged source change is **not** a deployed UI.
- **Do not** override billing, change Git integration, repeatedly launch new manual API deployments, or claim screen approval. When ordinary deployment capacity returns, deploy the then-current compatible `main` release, verify READY exact deployed SHA and **byte-parity of live `index.html` and `atlas-ui-visual-foundation.css`**, then inspect 390/768/1440/1600px navigation and collapsed state against this already captured prototype. If `main` advances, compare the actual deployed descendant's source, not the superseded merge SHA.
- **Resume boundary:** VIS3-05T-C is **SOURCE MERGED / REAL CHROME PROTOTYPE PASSED / PRODUCTION RELEASE BLOCKED**. VIS3-05T-D remains the next *separate* visual readability unit in Phase III but this release gate must not be mistaken for closure. VIS3-05R-E mixed-D final user aesthetic approval still awaits user judgment.
