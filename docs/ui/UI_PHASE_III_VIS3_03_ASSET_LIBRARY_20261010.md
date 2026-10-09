# VIS3-03 — Original Ornament SVG/CSS Asset Library

**Date:** 2026-10-10 KST
**Status:** IMPLEMENTED AS SHARED ASSET LIBRARY / PREVIEW ONLY; NOT WIRED INTO ACTIVE ATLAS UI
**Scope:** eight original inert SVG assets, isolated atlas-v3 opt-in stylesheet, one standalone preview HTML and four Node contract tests.

## Art assets and owner

| Art | Asset path (prefix: assets/ornaments/v3/) | CSS usage | Adoption unit |
|---|---|---|---|
| Grand Atlas cartouche | cartouche.svg | atlas-v3--cartouche | VIS3-04 shell |
| Ornate corner | corner.svg | atlas-v3--corner or engraved-panel | VIS3-04 |
| Chapter engraving | chapter-rule.svg | atlas-v3--chapter-rule | VIS3-04 |
| Index label | folio-plaque.svg | atlas-v3--folio-plaque | VIS3-04 |
| Abstract rosette | rosette.svg | atlas-v3--rosette | VIS3-04 |
| True-portrait decorative frame | portrait-frame.svg | atlas-v3--portrait-niche | VIS3-08 |
| Nonreligious foliate border | illuminated-foliage.svg | atlas-v3--codex-panel | VIS3-08/09 |
| Decorative astrolabe | astrolabe.svg | atlas-v3--astrolabe | VIS3-06 |

## Source and Preview

- Main namespaced style file: atlas-ui-ornaments-v3.css
- Separate demo route after deploy: https://atlas-person-db.vercel.app/docs/ui/preview/VIS3_03_ORNAMENT_LIBRARY.html
- Main index.html is **not modified and does not import the CSS**. Appearance of currently operating application must remain unchanged.
- Demo is explicitly marked illustrative and noindex. Original SVG artwork only, without copied historical artifacts, faces, false national emblems, official source IDs, fake astronomy facts, scripts, external URLs or external font files.
- Existing graphite and neutral brass tokens are read as CSS fallbacks and semantic Person domain palette is never reset.
- All decoration pointer-events none and SVG aria-hidden true/focusable false; static (no animation); responsive opt-in components at <= 640px; reduced-motion handled.
- Asset size per SVG limited to < 22kB, CSS < 15kB. Test script tests file integrity, consistent relative asset URLs, nonproduction isolation, no global UI selectors.
- Actual UI integration, same-data screenshots and Production aesthetic approval must occur **in later scoped VIS3-04 onward**. Not claimed in this unit.

## Next checkpoint

VIS3-04: activate A Grand Atlas entry only in existing shell/brand/chapter areas with controlled CSS ownership and real Chrome before/after, preserving search/navigation/touch and all historical, camera and density invariants. This unit does **not** start VIS3-04, P14 or old rejected watermark.
