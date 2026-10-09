# VIS3-03 — Shared Ornament Component Kit / 실사용 SVG·CSS 공통 장식 엔진

**Date:** 2026-10-09  
**State:** HISTORICAL / SUPERSEDED — original PR #2310 merged, later PR #2320 became canonical; this duplicate asset family was retired on 2026-10-10  
**Tracker:** [Phase III plan](UI_PHASE_III_ORNAMENT_EXECUTION_PLAN_20261009.md) · [Canonical v2](../../ATLAS_UI_VISUAL_GUIDELINES.md) · [VIS3-02](UI_PHASE_III_VIS3_02_ORNAMENT_GUIDELINE_UPDATE_20261009.md)  
**Scope:** one bounded VIS3-03 unit: original vector visual language + style components + live-data-free standalone demonstration + deterministic tests. **NO actual app UI injection and no canonical data/geometry changes.**

> **Historical evidence only — do not integrate from this document.** This first implementation was merged as PR #2310 but independently duplicated by the later approved canonical VIS3-03 asset system in PR #2320. The older `assets/ornaments/*`, `atlas-ui-ornament-kit-v3.css`, standalone showcase and duplicate test are retired to maintain one active ornament API. Use [`UI_PHASE_III_VIS3_03_ORNAMENT_TOOLKIT_20261010.md`](UI_PHASE_III_VIS3_03_ORNAMENT_TOOLKIT_20261010.md) and `atlas-ui-phase3-ornaments.css` for VIS3-04 onward. File inventory below records what PR #2310 delivered at that time, **not what remains active in main**.

## 1. Deliverables — real assets, not another conceptual moodboard

| File | Role | Code owner |
| --- | --- | --- |
| `assets/ornaments/atlas-v3-cartouche.svg` | **Grand Atlas**, prominently carved symmetric atlas title plate with double engraving, scroll ends and node accents | Original secular SVG |
| `assets/ornaments/atlas-v3-corner.svg` | engraved foliate atlas corner pair; rotate or mirror only in decoration layer | Original secular SVG |
| `assets/ornaments/atlas-v3-astrolabe.svg` | **Chronometer**, 72 rendered tick elements, multiple nested rings, instrument hands and abstract arcs | Original secular SVG; **not genuine clock/sky/history data** |
| `assets/ornaments/atlas-v3-illuminated-initial.svg` | **Illuminated Codex**, original illuminated `A` initial with blue/red/gold secular floral border | Original secular SVG; not an actual religious/cultural manuscript facsimile |
| `assets/ornaments/atlas-v3-chapter-flourish.svg` | secular symmetrical section-divider/rosette-like engraving | Original secular SVG |
| `atlas-ui-ornament-kit-v3.css` | Opt-in, namespaced decorative component rules: `.atlas-o-plate`, `.atlas-o-cartouche`, `.atlas-o-instrument`, `.atlas-o-codex`, `.atlas-o-chapter`, `.atlas-o-folio` with shared style roles | **All selectors under `.atlas-ornament-kit` only**, no `index.html` link yet |
| `experiments/vis3-03-ornament-showcase.html` | **Standalone** local preview, all A/B/C styles side-by-side plus five vector originals; explicitly labels simulated captions and no DB facts | No scripts or API calls |
| `tests/atlas-vis3-03-ornament-kit.test.mjs` | 5 fail-fast tests covering asset self-containment, CSS scoping, preview paths, no accidental Production injection and scope safety | Picked up by `node --test tests/*.test.mjs`; also direct `node --test tests/atlas-vis3-03-ornament-kit.test.mjs` |

## 2. Preview

The existing real UI is **NOT** changed by this unit. For an isolated source preview after deploy/opening the experiment route, open:

`/experiments/vis3-03-ornament-showcase.html`

The preview is deliberately a **component showroom**, not a functional Dashboard, a genuine Person or a factual historical globe. Its titles are explanatory placeholders. The original VIS3-01 real-screenshot overlays remain the reference for what the design could do against actual Production content.

For independent local preview, from repository root run a simple static server (no build/bundler required) and visit the route. All five SVG sources and stylesheet load via **relative same-origin URLs**. There are no linked scripts, fonts, or third-party image requests. Only native HTML/CSS and local SVG are used.

## 3. Integration contract for VIS3-04 onwards

### Deliberate opt-in

1. A **screen-owning integration PR** first loads `atlas-ui-ornament-kit-v3.css` with a versioned query string or its existing screen-specific CSS load owner. **Current `index.html` intentionally does not load this stylesheet**.
2. Add `atlas-ornament-kit` to one well-scoped area, not to `body` or the full dense Person register. Decorate only the title/entry/section without modifying underlying content order or markup identity.
3. Use a neutral, purely ornamental node or pseudo-element, and `aria-hidden="true"` / `alt=""` for image elements. Example:
   ```html
   <div class="atlas-ornament-kit">
     <div class="atlas-o-cartouche">
       <span class="atlas-o-cartouche__name">ATLAS</span>
     </div>
   </div>
   ```
4. Screen ownership: A cartouche (global header / Dashboard / Polity); B astrolabe (Spacetime toolbar **outside** actual chart coordinates); C initial (Person Detail first chapter / existing real portrait only).
5. Surface permissions are **reviewed per owner**; the ornate kit never needs to query/modify Person, Activity or Polity records, projection code, browser storage or Supabase.
6. Keep existing `--atlas-honor-metal` / `--atlas-honor-metal-strong` tokens and mix them with aged brass, **not** the separate semantic `governance` Gold `#D4AF37`.
7. Isolate decoration with non-interactive pseudo layers and `pointer-events: none`. Do not put SVG shapes above buttons as hit targets. Responsive mobile (<760px) shrinks signatures and keeps text legible; `prefers-reduced-motion` disables any kit animation/transitions.

### Asset URL guarantees

CSS lives at repository root: CSS asset URL `./assets/ornaments/...` resolves from root stylesheet URL. Standalone preview lives in `/experiments/`: use `../assets/ornaments/...` and `../atlas-ui-ornament-kit-v3.css`. Later if CSS is moved/bundled, update asset URLs in the owner integration PR, never by assuming page-relative loading.

## 4. Acceptance scope and objective test

1. **Source asset inventory:** 5 vector XML files each with meaningful graphic paths, local in-repository data, `viewBox`, `<title>`, `<desc>`, no external URLs/JS/embedded images.
2. **Visual distinctness:** three original vocabularies unmistakably different: carved cartouche vs nested brass astrolabe vs illustrated initial. The kit is not merely another 1px divider.
3. **Non-regression by construction:** live `index.html` does not load `atlas-ui-ornament-kit-v3.css`. No existing app HTML/CSS/JS/data changed; therefore VIS3-03 alone must not be characterized as improved Production appearance.
4. **Stylesheet discipline:** all CSS under opt-in `.atlas-ornament-kit`; uses existing honors/graphite material roles; no `:root`, domain palette overrides or Spacetime coordinates. Unused DOM branches see **zero styling**.
5. **Conformance:** run focused Node tests and GitHub ATLAS Integrity on the exact PR SHA. Standalone HTML preview can be manually reviewed and zoom-tested, but this unit does not claim Production browser acceptance or all real-screen responsive screenshots.
6. **Rollback:** remove the optional kit stylesheet link / ornament class from any future consuming domain to restore its original design without touching state/identity or historical database.

## 5. Change isolation and next bounded unit

| Field | VIS3-03 |
| --- | --- |
| Person/Polity/Activity DB/identity writes | **0** |
| Spacetime projection, zoom 500–1500%, nine regions | **No changes** |
| 8 semantic Person domain colors | **No changes** |
| Main Person dense rows / column sizes / portraits | **No changes** |
| `index.html` / real route CSS adoption | **NOT YET — VIS3-04** |
| P14 geometry | **PARKED_BY_USER, unchanged** |
| VIS2-05 rejected watermark | **OFF, unchanged** |

**Next unit:** VIS3-04 common shell/brand integration (first deliberate real visual change), then VIS3-05 Dashboard and VIS3-06 Spacetime tool chrome. VIS3-04 must prove a clearly perceptible design difference using actual Production content and responsive screenshots; this kit's tests alone do not certify subjective appearance.

**VIS3-03 is closed at deliverable/test level only; real Production aesthetics and interaction remain for later units.**
