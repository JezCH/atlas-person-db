# VIS2-05 — Monumental Year / Era Watermark A/B, Default-Reject Experiment

**Tracking:** [#2158](https://github.com/JezCH/atlas-person-db/issues/2158) · **only VIS2-05** · 2026-10-09 KST.  
**Prior gate:** VIS2-04 [Production run #37803485725](https://github.com/JezCH/atlas-person-db/actions/runs/37803485725) and [signoff #2199](https://github.com/JezCH/atlas-person-db/pull/2199).  
**Status:** A/B source ready, not yet visually accepted; **default OFF/REJECT**.

## Existing design and read-before-write audit

The Spacetime view already renders a sticky 140px time-axis gutter (responsive widths are existing owner-controlled), 500–1500% camera, `.spacetime-year-axis span` major/minor dates, `.spacetime-era-boundary b` era names, and material-refined 1px century/era lines. Existing Person 18px labels are collision managed by the geometry/LOD modules. Phase I `SPACETIME-L1` and Phase II VIS2-04 already give prominent year and era anchors. Repetition in a huge decorative overlay is **not presumed to add information**.

[VIS2-00 baseline](UI_PREMIUM_PHASE_II_VIS2_00_BASELINE_20261008.md) explicitly requires **era-boundary-centered** and **actually data-dense** time frames at the **same exact scroll/camera/region coordinates**, before a watermark could be accepted. The 29-image baseline alone cannot stand in for these cases.

**Protected:** historical BC/AD tick list, chronology/time projection, 9 macroregions/X/Y, camera/zoom, world compression 0.748, label/rail positions and 8 semantic domains, row sizes, Person/Activity/Polity data and route logic. Never generate fictitious years or mythological era labels.

## Candidate and release isolation

`experiments/vis2-05-monumental-watermark-candidate.css` is a **non-shipping experimental stylesheet**; never linked in `index.html`, dynamically loaded route CSS, or the Production app. No product visuals/DOM changed as part of this unit.

A read-only Production Chrome verifier `scripts/verify-vis2-05-watermark-ab.mjs` loads this CSS text from the repository and **temporarily injects** it into the in-memory rendered page *only between baseline screenshot A and experimental screenshot B*. A uses the real DOM and existing style unchanged; B overlays:
- a 62–132px muted year inscription sourced **verbatim from an existing visible major-year axis tick**, centered at that tick's real historical Y;
- for boundary scenes only, a 36–76px muted era inscription sourced **verbatim from the pre-existing boundary `b`** at that era's actual Y.

Visual geometry uses absolutely positioned `::before`/`::after` on existing elements with `pointer-events: none`. Any added DOM attributes or CSS variables exist only while the Chrome screenshot comparison is running; after B all trial style/attributes must be removed. If scroll/zoom/world/Person-label positioning differs in A vs B, fail the experiment. CSS paint activation must be measurable, and A must be **unstyled**. Candidate aesthetics may be rejected independently of CI success.

## Exact Production Chrome acceptance plan

Run [Spacetime Production Visual Acceptance workflow](https://github.com/JezCH/atlas-person-db/actions/workflows/atlas-spacetime-production-visual.yml) with its exact runtime SHA gate. Before Chrome A/B, the workflow already checks original Production Spacetime, Person, Polity, common 29 baseline captures and VIS2-01/02/03/04. The new verifier then:

1. At **390×844, 768×1000, 1440×1000, 1600×1000** and 500% zoom, focus East Asia on the existing macroregion header.
2. Capture two scene families at each size: an **era-boundary-centered view** based on an actual `.spacetime-era-boundary`, and the **highest-density visible-Person-label scene** from eleven sampled real scroll positions (reject the test when no real Person label is present).
3. At 1600×1000, additionally sample both scene families at **1000%** and **1500%**, using the original zoom gesture and buttons. This yields **12 A/B scene pairs = 24 screenshot PNGs**.
4. Compare every paired screenshot **on the same DOM, same year/era text, same scrollLeft/Top, same camera, same viewport, same Person-label boxes/count, same historical tick coordinates and same canvas bounds**. Record source year, era, actual Person density, scene scroll values and outcome in `vis2-05-watermark-ab.json`.
5. Remove the injected CSS and experimental attrs. Confirm the release site still has **no stylesheet reference**, and that there is no residual watermark after each scene.
6. Open and visually examine representative images for overlapping inscriptions, visual saturation, readability and information gain. **Default outcome REJECT** unless an improvement to precision/information hierarchy with no obstruction is unambiguous. A green Chrome test is *not* a design acceptance.

## Closure protocol

After actual Production capture and A/B inspection, record the **decision** as one of `ACCEPT` (explicit justification and separately gated safe opt-in) or `REJECT` (no production change). Then check VIS2-05 in #2158 as a completed experiment, without starting VIS2-06 or shipping any watermark by implication.

**Current decision:** PENDING VISUAL REVIEW — default remains REJECT/OFF.
