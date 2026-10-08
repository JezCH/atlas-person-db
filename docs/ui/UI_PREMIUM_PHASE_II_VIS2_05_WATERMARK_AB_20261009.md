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

**Final decision: REJECT — VIS2-05 EXPERIMENT COMPLETE.** The watermark was not and will not be shipped; production remains unchanged. See the exact-sha Chrome evidence and A/B inspection below. **Next VIS2-06 NOT STARTED.**


## 2026-10-09 KST — actual Production acceptance, human A/B and decisive rejection

### Provenance, exact runtime and complete captures

- Feature/research-only [PR #2202](https://github.com/JezCH/atlas-person-db/pull/2202), squash merged SHA `b2ec024e449838fafffc121772b234940e5fb43b`; original UI `index.html`, dynamic Spacetime CSS loader and all historical data are **unchanged**, and the candidate file under `experiments/` remains disconnected from Production rendering.
- [Production Chrome SUCCESS #37817749988](https://github.com/JezCH/atlas-person-db/actions/runs/37817749988), exact source/deployed runtime `b2ec024e449838fafffc121772b234940e5fb43b`; [84-PNG plus machine JSON artifact #11567514381](https://github.com/JezCH/atlas-person-db/actions/runs/37817749988/artifacts/11567514381). Downloaded artifact valid ZIP, **96 entries / 84 PNGs**, `vis2-05-watermark-ab.json` status `CAPTURED_PENDING_VISUAL_REJECTION_REVIEW` with **12 geometric PASS scenes and 24 matched PNGs**. This machine status means captured for human review, not an automated endorsement of the design.
- Prior Spacetime, Person, Polity, 29-image common baseline, VIS2-01/02/03/04 tests all passed in the same exact-SHA workflow. Trial CSS is only injected temporarily into Chrome for screenshot B; strict style/attribute cleanup and release DEFAULT OFF gates passed.

### Actual same-state A/B evidence

Every `A-default`/`B-experiment` pair was compared in RGB pixel space, and representative mobile boundary, tablet dense, 1600px boundary and 1500% zoom captures were opened side by side. Nonzero changes occurred solely because the trial inscriptions rendered; the test separately confirms **unchanged history tick text/positions, world/axis boxes, scrollLeft/scrollTop, actual zoom, Person label geometry/count and no horizontal page overflow**.

| Viewport | Zoom | Scene | Original year; era | Person label DOM sample | Pixels changed |
|---|---:|---|---|---:|---:|
| 390×844 | 500% | Era boundary | AD 625 · 전기중세 | 21 | 5,717 (1.737%) |
| 390×844 | 500% | Label-dense | AD 1375 | 39 | 4,010 (1.218%) |
| 768×1000 | 500% | Era boundary | AD 625 · 전기중세 | 48 | 5,723 (0.745%) |
| 768×1000 | 500% | Label-dense | AD 1125 | 84 | 3,960 (0.516%) |
| 1440×1000 | 500% | Era boundary | AD 1000 · 후기중세 | 34 | 15,132 (1.051%) |
| 1440×1000 | 500% | Label-dense | AD 1375 | 33 | 9,932 (0.690%) |
| 1600×1000 | 500% | Era boundary | AD 1000 · 후기중세 | 34 | 18,068 (1.129%) |
| 1600×1000 | 500% | Label-dense | AD 1375 | 34 | 12,185 (0.762%) |
| 1600×1000 | 1000% | Era boundary | AD 1000 · 후기중세 | 7 | 18,068 (1.129%) |
| 1600×1000 | 1000% | Label-dense | AD 950 | 7 | 11,916 (0.745%) |
| 1600×1000 | 1500% | Era boundary | AD 1500 · 근세 | **0** | 16,824 (1.052%) |
| 1600×1000 | 1500% | Label-dense | AD 1350 | 6 | 13,088 (0.818%) |

**Qualification:** these Person label counts are the screenshot's *virtualized DOM samples*, not claims of 84 unobstructed labels simultaneously readable on screen; the separate dense-scene selector scanned eleven scroll positions for the maximum number of *visible* labels. The 1500% boundary scene contained zero labels, and is **not** counted as dense-frame readability evidence; its paired 1500% dense scene had six.

### Visual adjudication: REJECT

1. **Redundant information:** the monument-sized `AD 1000`/`후기중세` duplicates already-readable AD year ticks and era band/boundary text, rather than adding new historical information.
2. **Direct visual competition:** in the opened 390px AD 625/전기중세 boundary frame, the pale watermark lies across the populated Person line and middle of the limited mobile canvas; at 768px AD 1125 dense it competes with nearby labels, dense semantic rails and fine 1px time guides.
3. **Desktop archive hierarchy degrades:** the opened 1600px AD 1000 boundary view puts an oversized era title and date at the center of the active Person chart, diverting attention from the precise tick axis and existing domain-colored labels; the same 1600px A screen has clearer prioritization.
4. **No justified rollout:** unchanged geometry alone does not imply a superior reading experience. The extra 0.516–1.737% rendered content is decorative rather than informative, and at 1500% only makes otherwise sparse areas visually louder.

**Result: unequivocal REJECT.** Do not enable, opt in, or include the watermark in any production route. Preserve the non-shipping CSS *only as an isolated experiment evidence fixture*, and keep VIS2-04's improved precision ticks. All original visual/user-facing UI remains **A-default**, including mobile and high zoom. A future separate proposal would need a demonstrated accessibility/information benefit before any release decision.

**Work-unit gate:** VIS2-05 is finished as a *rejected experiment*, not an accepted feature; next VIS2-06 Spacetime instrument/marginalia is a distinct **NOT STARTED** user-triggered unit.
