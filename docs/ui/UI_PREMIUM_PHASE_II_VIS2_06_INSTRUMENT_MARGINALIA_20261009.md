# ATLAS Phase II — VIS2-06 Spacetime Instrument / Marginalia

**Work unit:** VIS2-06 only · [#2158](https://github.com/JezCH/atlas-person-db/issues/2158) · 2026-10-09 KST.  
**Prior state:** VIS2-05 complete as a **REJECTED, default-OFF** watermark experiment, Production [run #37817749988](https://github.com/JezCH/atlas-person-db/actions/runs/37817749988).  
**State:** **VIS2-06 COMPLETE / SIGNED OFF** — actual exact-deployed-SHA Chrome and matched visual screenshots PASS; next VIS2-07 NOT STARTED.

## Read-before-write and duplication check

1. Dynamic `atlas-person-spacetime-instrument-tools.css` already owns the compact V7 instrument rail, search field, 500–1500% zoom buttons/output, collapsed telemetry, legend, Meanwhile, sidecar minimap and selected/empty inspector states. SPACETIME-L2 at lines ~990–1051 already uses neutral material **engraving, sheen and shadows** on toolbar, minimap surface, selected inspector and activities. SPACETIME-M2 owns keyboard focus and reduced motion; responsive V8 owns mobile heights. **Do not add a second border, frame, shadow, icon or layout.**
2. VIS2-00→04 provided the graphite material, fonts, precision ticks and 60-PNG history register/Spacetime reference. VIS2-05's rejected watermarks must remain disconnected. A marginal annotation should be **existing instrument telemetry**, not redundant large year/era text.
3. The visible lower-priority annotation colors still include V7 `#5f676c` minimap status, `#5f676c` map help, `#636b70` Person Inspector metadata, `#9ca2a4` empty Inspector instruction and `#aaaeb0` primary status numerals. These can be made more readable against neutral graphite **without changing semantics, text density or font geometry**. Existing focus ring, interactive elements, selected domain colors and warning coloring remain untouched.

## Implementation

One reversible opt-in stylesheet `atlas-person-spacetime-marginalia-v2.css` loaded in `index.html` **after VIS2-04**. Targeting `#personSpacetimeMount[data-spacetime-tools="instrument-v7"]` means it can win over the later dynamic route file without `!important`, but affects no Person/Polity/Dashboard view.

Paint-only treatment:
- higher neutral legibility of existing 500%–1500% camera **readout** and its one-pixel text cut;
- brighter existing **primary Person count/zoom** telemetry numerals with a subtle shadow; a restrained background sheen inside the existing telemetry strip;
- clarify the existing **minimap title/help/status** annotations, with no minimap map redraw, viewport outline, selected-marker size or pan behavior changes;
- brighten the existing **empty Inspector** instruction and the **selected Inspector** uppercase micro-heading, retaining 52px mobile and all widths/heights;
- semantic Person-domain color/rails, selected activities, warning indicators and persistent labels remain under their original owners.

No `display`, `width/height`, `font-size`, `line-height`, `padding`, `border`, `transform`, `position`, `opacity`, `content`, DOM, routing or data edits. Property allowlist: `color`, `text-shadow`, `background-image`. Production rollback: drop this independent stylesheet link.

## Required exact-SHA Production verification

`tests/vis2-06-spacetime-instrument-marginalia.test.mjs` locks DOM ownership and paint-only declarations. `scripts/verify-vis2-06-production-instrument.mjs` performs **same-loaded-DOM on/off CSS** comparison of 8 scenarios:

| Viewport | Inspector | Main smoke |
|---|---|---|
| 390×844 | empty and selected | mobile minimap, instructions, zoom |
| 768×1000 | empty and selected | tablet sidecar and telemetry |
| 1440×1000 | empty and selected | desktop rail/telemetry and selection |
| 1600×1000 | empty and selected | full desktop sidecar |

Capture matched 390 and 1600 screenshots in both states (**8 VIS2-06 PNGs**). Before/after must keep the same 500% zoom, live Person label sampled positions, historical tick count, minimap canvas resolution, scroll/camera coordinates, viewport and document width, **ALL protected tool/panel rectangles and text**, and existing focus/selected functionality. It must prove at least one real computed color/sheen delta for each intended instrument area.

Existing exact-deploy-SHA gate, Person/Polity/Spacetime, 29-image baseline and VIS2-01/02/03/04 and VIS2-05 experimental capture must all pass, resulting in **92 PNGs total** if uninterrupted (84 inherited + 8 VIS2-06). Human screenshot comparison is mandatory, especially whether mobile panel hierarchy improves without obscuring chart content.

**Closeout:** VIS2-06 **COMPLETE**, eight Production same-DOM gates PASS and visually verified matched screenshots. **VIS2-07 Person Register is NOT STARTED; next user turn only.**


## Production acceptance — VERIFIED 2026-10-09 KST

### Deployed exact source and technical gates

- Implementation [PR #2204](https://github.com/JezCH/atlas-person-db/pull/2204) merged to `main` as `7071f2f15d54183ffc2bbc0fa0514dd9d7d2acd1`.
- [Actual exact-deploy-SHA Chrome run #37843633724](https://github.com/JezCH/atlas-person-db/actions/runs/37843633724) completed **SUCCESS** at that same SHA; [artifact #11579600285](https://github.com/JezCH/atlas-person-db/actions/runs/37843633724/artifacts/11579600285) is a valid **17,479,391-byte ZIP with 105 files / 92 PNGs**, containing `vis2-06-production-instrument.json` with `status: PASS`, **8 passing cases / 8 VIS2-06 PNGs**.
- In the same successful run: Spacetime Production Acceptance, Person V10 dense table, Polity, the 29-image VIS2-00 baseline, VIS2-01 materials, VIS2-02 engraving, VIS2-03 numeric typography, VIS2-04 chronograph ticks, and VIS2-05 watermark **experimental capture only, with default OFF** all passed.
- This unit's Chrome probe toggled **only** the VIS2-06 stylesheet on the identical rendered DOM, with a live CSS activation marker. It verified all existing tool/frame/canvas/minimap/inspector bounding rectangles and text, 500% camera and scroll coordinates, year counts, minimap canvas resolution, document overflow, label geometry, selected/empty transitions, and expected computed text contrast/paint changes.

| Viewport | Inspector | Year ticks | Person label DOM sample | Result |
|---|---|---:|---:|---|
| 390×844 | empty | 105 | 0 | PASS |
| 390×844 | selected | 105 | 24 | PASS |
| 768×1000 | empty | 105 | 0 | PASS |
| 768×1000 | selected | 105 | 24 | PASS |
| 1440×1000 | empty | 209 | 0 | PASS |
| 1440×1000 | selected | 209 | 24 | PASS |
| 1600×1000 | empty | 209 | 0 | PASS |
| 1600×1000 | selected | 209 | 24 | PASS |

The 24 selected Person labels are a **DOM geometry sample**, not a claim they are all simultaneously visible. The default empty state contains no virtualized labels in this screenshot, and is intentionally included as a distinct instrument state.

### Actual before/after artifact inspection

The exact artifact ZIP was downloaded, verified, extracted and all four matched 390/1600px empty/selected screenshot pairs were pixel-compared. Full desktop contact-sheet, mobile empty and mobile selected screenshots were **opened and visually reviewed**. The paint changes stay on existing upper instrument telemetry, minimap annotations and inspector marginalia; no added icons, historic dates, shadows of panels, substantive area decoration, text clipping or new competing labels were observed.

| Matching A/B state | Changed RGB pixels | Full viewport | Change |
|---|---:|---:|---:|
| 390×844 empty | 1,485 | 329,160 | 0.4511% |
| 390×844 selected | 1,151 | 329,160 | 0.3497% |
| 1600×1000 empty | 16,234 | 1,600,000 | 1.0146% |
| 1600×1000 selected | 15,099 | 1,600,000 | 0.9437% |

**Verdict: ACCEPT scoped VIS2-06 only.** The contrast hierarchy is small but visibly more readable against the existing graphite instrument surfaces, and everything else retains the canonical original geometry and behaviors. Existing monumental year watermarks remain **rejected, default OFF**. A subsequent unrelated Polity-source `main` merge did not change the VIS2-06 CSS/test source paths; the acceptance was at its exact deployed SHA, not falsely attributed to an arbitrary newer commit.

**Next work unit: VIS2-07 Person main table finish — NOT STARTED in this conversation.**
