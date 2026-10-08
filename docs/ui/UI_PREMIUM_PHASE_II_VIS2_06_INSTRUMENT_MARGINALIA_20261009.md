# ATLAS Phase II — VIS2-06 Spacetime Instrument / Marginalia

**Work unit:** VIS2-06 only · [#2158](https://github.com/JezCH/atlas-person-db/issues/2158) · 2026-10-09 KST.  
**Prior state:** VIS2-05 complete as a **REJECTED, default-OFF** watermark experiment, Production [run #37817749988](https://github.com/JezCH/atlas-person-db/actions/runs/37817749988).  
**State:** implementation available; awaiting exact-deployed-SHA Chrome, A/B image review and closeout.

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

**Closeout barrier:** no VIS2-07 Person Register work in this unit. Do not mark VIS2-06 complete until Chrome success and side-by-side visual review, then sign off in #2158.
