# VIS3-06 — Spacetime exterior Chronometer A/B/C concept review (2026-10-10)

**State: NON-DEPLOY CONCEPT REVIEW COMPLETE. App/source implementation NOT started; user visual approval still required.**

## 1. Phase III objective, precedence and gates

This unit follows the [Phase III v2.0 execution plan](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md) and current [ATLAS visual guidelines](../../ATLAS_UI_VISUAL_GUIDELINES.md). Final product direction remains **Restrained Grand Atlas × Precision Chronometer × Editorial Codex**: historical archive and monumental typographic hierarchy combined with restrained, recognizably crafted instruments, *not* a generic dark dashboard, dense ornament catalog, 3D museum simulation or a game-card interface. The Phase III remainder remains VIS3-07 (real era/region headings) → 08–09 (Person chronicle/source) → 10–11 (Polity) → 12–13 (register/interaction) → 14–15 (cultural research/mobile) → 16–17 (integrated audit and Production/user acceptance).

The **VIS3-05R-E mixed-D Dashboard design received technical Production acceptance but final subjective user signoff is still pending**. A request to continue work is permission for this **non-deployed comparison**, **not** evidence of that final design approval or permission to release VIS3-06 CSS. The exact next implementation gate is therefore still closed.

## 2. Concrete current source ownership (main, 2026-10-10)

- `atlas-person-spacetime-view.js` renders the authoritative real `section.spacetime-toolbar.card` containing `.spacetime-controls` (search and `.spacetime-camera`), and `details.spacetime-precision-legend` (the `표시 기준` control). The chart starts **later**, inside `.spacetime-workspace > .spacetime-frame > .spacetime-scroll`. Do not add decorative elements to `spacetime-canvas`, year-axis, region head, Person rail, map or any hit target.
- `atlas-person-spacetime-instrument-tools.css` (instrument-v7) already establishes dark ink material, transparent toolbar rail with top/bottom hairlines, functional search/zoom controls, and a right-aligned precision legend. `atlas-person-spacetime-view.css` owns responsive 390/760 behavior. `atlas-person-spacetime-marginalia-v2.css` already applies instrument-readout treatment: do not double decorate that output.
- `atlas-ui-phase3-ornaments.css` already defines a generic `.atlas-o-instrument` asset using `atlas-astrolabe.svg`. Its original **340px square** footprint is unsuitable for this toolbar and **must not simply be pasted here**. Current accepted Dashboard mixed D ornament scope is not an all-screens transplant.
- Protected: 500–1500% camera behavior and unified X/Y, 0.748 global compression, 9 stable macroregions, 140px axis, full historical Y/track placement, label overlap rules, eight Person domain colors, P14 `PARKED_BY_USER`, prior VIS2-05 watermark **REJECT/OFF**.

## 3. Source-structure-faithful standalone Chrome study

A **standalone local HTML/CSS model** reused the current toolbar's search/zoom/precision-legend elements and material/color/size declarations; only ornamental CSS varies. The area beneath is explicitly a neutral **omitted real-data chart placeholder**. No real Production screenshot, 9-region dataset, real KPI values, Person tracks or backend data were copied or invented. The local model is **not source-byte-identical or layout-equivalent to the deployed app**.

| Candidate | Cosmetic difference, outside plotted data | Decision at concept gate |
| --- | --- | --- |
| **A / Current** | No added instrument ornament; existing ink toolbar and hairlines | Baseline; retain as safe fallback |
| **B / Calibration arc** | Approx. 44×25px non-interactive 2-ring arc plus three very small calibration-inspired marks **inside the toolbar's unused horizontal gap**, not on any year axis | **Preferred candidate to take into real-DOM A/B only**. The mark is visibly intentional at normal desktop scale but has semantic/gauge confusion and crowding risks to recheck |
| **C / Reduced arc** | Approx. 32×19px lower-opacity single arc with one short terminal | Back-up if B is visually too strong. More restrained but possibly insufficient distinctiveness |

The two arc candidates use no cardinal directions, numerical scale, geographic location, epoch glyph, imagined heraldry or fake citation. Any final implementation must make them `aria-hidden` implicitly (CSS pseudo only) and `pointer-events:none`; decoration must not acquire keyboard focus.

**Minimal experimental CSS sketch (not added to runtime):**

```css
/* This is a conceptual overlay; final production selectors depend on real DOM A/B. */
#personSpacetimeMount[data-spacetime-tools="instrument-v7"] .spacetime-toolbar {
  position: relative;
  isolation: isolate;
}
#personSpacetimeMount[data-spacetime-tools="instrument-v7"] .spacetime-toolbar::before {
  content:"";
  position:absolute;
  left:68%;
  top:1px;
  width:44px;
  height:25px;
  pointer-events:none;
  opacity:.74;
  background:
    radial-gradient(circle at 50% 106%,transparent 16px,rgba(192,174,136,.54) 16.5px,rgba(192,174,136,.54) 17px,transparent 17.5px),
    radial-gradient(circle at 50% 106%,transparent 22px,rgba(192,174,136,.19) 22.3px,rgba(192,174,136,.19) 23px,transparent 23.5px);
}
@media(max-width:900px) {
  #personSpacetimeMount[data-spacetime-tools="instrument-v7"] .spacetime-toolbar::before { display:none; }
}
```

The exact local test also compared B's three small tick-like marks and C's single reduced mark; no runtime file contains these rules. Crucially `left:68%` is **experimental**, not a production-safe anchor: the real controls/legend may widen with locale, zoom, text size or viewport. Replace it with a measured gap-safe design or drop the ornament if the free gap disappears.

## 4. Local headless Chromium measurement — synthetic model only

The same DOM for all 3 candidates was rendered at **390 / 600 / 768 / 1000 / 1440 / 1600 CSS px**. Within each viewport, **A/B/C had identical visible control bounding boxes and toolbar geometry**. The synthetic document introduced **no viewport-level horizontal overflow**. On <=900px both ornaments were turned off and controls rendered as A.

| CSS viewport width | Same-DOM toolbar size (W×H px) | A/B/C control geometry | Concept arcs |
| --- | --- | --- | --- |
| 390 | 306×89 | equal | hidden |
| 600 | 516×89 | equal | hidden |
| 768 | 656×43 | equal | hidden |
| 1000 | 852×43 | equal | shown |
| 1440 | 1062×43 | equal | shown |
| 1600 | 1062×43 | equal | shown |

Comparison files exported alongside the response: `VIS3-06_chronometer_compare.html`, `VIS3-06_chronometer_1440_focused.png`, `VIS3-06_chronometer_390_focused.png`, and `VIS3-06_chrome_metrics.json`. **They are conversation artifacts, not GitHub-tracked Production assets.** Actual browser security prevented `file://` navigation; the HTML source was loaded via Playwright `page.set_content`, with real Chromium layout/paint. This method does not certify any Production fact.

## 5. Formal go/no-go and next exact work

- **GO** for preserving A and presenting B as a **single, outside-plot, non-data conceptual design** for final subjective review. Keep C as fallback.
- **NO-GO** for immediate main/CSS/JS/Runtime/DB changes, global ornament rollout, treating B as a real temporal scale, enabling watermark, or claiming a live browser PASS.
- **No automatic VIS3-07 start**: no downstream work before the next independent unit and necessary visual gate.
- The next unit, once **VIS3-05R final user visual approval is explicitly given**, is `VIS3-06-R`: use the **actual live Production DOM and identical current dataset** for A/B/C side-by-side at 390/768/1000/1440/1600, with 125%/150% browser zoom; verify search, camera (500% default/1500% max), details, all controls' hit rectangles and focus, 9-region/140px-axis geometry, no extra scroll, WCAG AA where text is affected, semantic Person colors and performance. Reject arcs if controls/legend overlap in any supported state. Then ask for a per-screen style choice before an independent CSS application/Production acceptance step.
- In the absence of final user approval, further work can refine **non-deploy alternatives** but must not represent the Phase III implementation gate as cleared.

**Result:** one bounded work unit complete — exact source ownership identified; A/B/C conceptual comparison finished; local model geometry checked; candidate B identified for later production-DOM evaluation; explicit visual approval and release gates preserved.
