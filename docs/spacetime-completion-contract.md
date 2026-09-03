# ATLAS Spacetime Completion Contract

Status: authoritative completion gate for the current Production `시공간 인물도`. Original-plan reconciliation is in progress after the post-completion audit found requirements that were not represented by the earlier 23-gate contract.

## Readable-scale decision

The readable camera floor is **500%**.

- minimum zoom: 500%
- default zoom: 500%
- maximum zoom: 800%
- X and Y use the same global camera zoom
- the physical world extent applies one shared compression factor: **0.748**
- base world width before camera zoom/compression is globally bounded to 900–1,275 px
- widening the viewport above the 1,275 px base-world cap must not inflate world geometry
- shared axis/header chrome is compacted globally to 140 px / 36 px and may not vary by region or era
- local density-based compression is forbidden
- a sparse region or era may not be folded independently
- no runtime, UI, test, or compatibility path may expose a scale below 500%

The 0.748 factor is presentation compression only. It applies uniformly to the whole X and Y extent and never changes normalized historical coordinates. Horizontal base-world sizing is also data-independent: viewport width is clamped to a global 900–1,275 px base before zoom/compression, so large monitors do not create extra world-space. The readable label geometry keeps the 10px font and the exact prior text-content budget while using a 18px label box, a 2px collision gap, and 1px horizontal padding. The outer min/max widths are reduced from 38/156 px to 30/148 px only because per-label horizontal chrome falls from 12 px to 4 px; the usable text area remains 26 px minimum and 144 px maximum. Shared non-world chrome is also globally compact: the fixed left axis is 140px and the sticky region header is 36px high; these dimensions are renderer-owned and identical across all regions and eras.

## Architecture

```text
Person / Activity
  -> Historical Spatial Evidence
  -> Spatial Evidence Resolver
  -> Precision-aware Spatial Compile
  -> Person Track Compiler
  -> Stable Spacetime World
  -> Unified 2D Camera (500%-800%)
  -> readable labels + Person rails -> Activity detail
```

Camera and presentation may change extent. They must never invent, upgrade, locally warp, or mutate historical coordinates.

## Precision

Reviewed Place evidence may compile to a Place point; reviewed subregion evidence to a subregion range; reviewed macroregion evidence only to a macroregion range. Conflicting or missing evidence remains unresolved. Display anchors are presentation data, never historical evidence.

A reviewed Place point uses a zero-width world range (`x_min = x_anchor = x_max`). The current display anchor is the stable center of the reviewed subregion and is **not** claimed to be an exact geographic longitude. Place identity and evidence precision are therefore preserved without inventing coordinates. When a polity changes Place function over time, every time-sliced Place segment is preserved through spatial compile and Person Track compile; the Roman Empire Rome → Constantinople case is a permanent regression test.

## Spatial uncertainty rendering

Spatial precision is visible on the world surface and must not be confused with territory, residence, or a physical travel path.

- reviewed Place: point/rail precision; no fake uncertainty width
- multiple reviewed Place anchors: preserve every reviewed anchor and connect them only as a **placement-basis relation**, never as a route
- subregion: horizontal dotted uncertainty whisker from compiled `x_min/x_max`
- macroregion: wider dashed uncertainty whisker from compiled `x_min/x_max`
- unresolved: no world coordinate

The range is shown for selection or detail LOD. Coarse rails also keep a distinct precision treatment at lower detail so a macroregion placement does not masquerade as an exact Place. Viewport culling uses the full compiled uncertainty extent, not only `x_anchor`.

## Stable-world invariants

Normalized world coordinates remain identical under search, selection, global camera zoom, and minimap navigation. `opposes` never determines primary Person placement.

## Time invariant

Historical Y is derived from historical time only. The supported readable surface uses a **uniform linear time projection**. There is no low-scale logarithmic overview and no era-specific density compression. Labels may move horizontally or defer, never vertically.

## Space invariant

Macroregions remain equal stable bands in normalized world space. Subregions are fixed historical/geographic subdivisions. Person density must not resize Europe, Oceania, East Asia, or any other region.

## Interaction

The Production surface must provide continuous two-axis camera behavior at 500%-800%, pointer-centered zoom, Person search/focus, minimap context, inspector evidence, Meanwhile exploration, and reset to 500%.

A Fit World action that produces a scale below 500% is prohibited.

## Person inspector evidence

Selecting a Person must expose the spatial evidence used by the renderer instead of showing only a name and Activity summary.

For each displayed primary placement segment, the inspector shows:
- spatial precision (`Place`, subregion, macroregion, or unresolved)
- the historical placement basis and active Place-function evidence
- historical spatial source references preserved from the resolver
- display-precision source references used by reviewed Place bindings

Counterparty relations remain excluded from primary Person placement evidence. Presentation anchors are still presentation data and are never described as exact geographic coordinates.

## Meanwhile active-Activity exploration

Meanwhile is a selected-historical-moment comparison tool, not a second timeline and not a search-dependent filter.

- Clicking the year axis or an unoccupied point in the spacetime canvas selects a historical year.
- A horizontal line for that year crosses the full spatial world.
- Active entries come from primary spatial Activity segments whose interval contains the selected historical ordinal.
- The Activity list preserves simultaneous Activities.
- Global and macroregion counts deduplicate by Person, so one Person with multiple active Activities is counted once per region.
- Counterparty relations such as `opposes` never become a Person's contemporaneous spatial position.
- The global Meanwhile summary is computed from all placed Person tracks, independently of the current text search.
- Visible labels, rails, and Activity glyphs that are active at the selected moment receive an explicit highlight.

This preserves the original exploration question: **who else was active elsewhere in the world at this historical moment?**

## Dense-label acceptance

Permanent dense windows:
1. Europe, AD 1800–1950.
2. East Asia, AD 500–1900.

At sufficient zoom: label overlap count = 0, historical Y deviation = 0 px, deferred visible labels = 0. Reducing below 500% is never an acceptance strategy.

These two dense-label gates are locked by the reproducible Production snapshot in `tests/fixtures/spacetime-dense-label-snapshot.json`. The snapshot is packed at 800% using the minimum 900 px base world, the shared 0.748 compression, and the production label engine; CI requires zero overlap, zero deferred labels, and zero historical-Y deviation for both permanent dense windows.

## Legacy prohibition

The following may not return: overview/detail mode selector, density overview renderer, Person point-only renderer, logarithmic time overview, adaptive low-scale ticks, retired lane assignment, 100% reset, any below-500 camera entry, or local region/time compression.

## Data parity

Final parity is enforced at runtime, fail-closed, between the authoritative Person reader payload and the compiled Person Track set **before political placement partitioning**.

Required zero unintended delta:
- Person identity and count;
- Activity identity and count;
- complete start/end temporal boundaries, including year, month, day, granularity, certainty, and calendar;
- Polity identity;
- relation identity/code;
- role identity/code.

Activities that cannot be spatially placed or whose chronology is unresolved still participate in parity through the unresolved Person Track path. A single Activity split into multiple spatial segments by reviewed multi-Place evidence is deduplicated by Activity ID, but conflicting semantic payloads for the same Activity ID fail closed.

If any required semantic delta is detected, the Production renderer throws `SPACETIME_DATA_PARITY_FAILED` rather than rendering a silently altered historical model.

## Performance

DOM size scales with viewport + overscan, not total DB size. Minimap may retain compact whole-world context. Density canvas is not part of the Production renderer.

## Source of truth

- `tests/fixtures/spacetime-completion-contract.json`
- `tests/fixtures/spacetime-acceptance-fixtures.json`
- `tests/fixtures/spacetime-dense-label-snapshot.json`
- `tests/spacetime-dense-label-acceptance.test.mjs`
- `tests/spacetime-place-precision.test.mjs`
- `tests/spacetime-person-inspector-evidence.test.mjs`
- `tests/spacetime-meanwhile-active-activity.test.mjs`
- `tests/spacetime-data-parity.test.mjs`
- `tests/spacetime-uncertainty-rendering.test.mjs`
- `tests/spacetime-completion-contract.test.mjs`
- `tests/spacetime-readable-scale-contract.test.mjs`

Changing the 500% floor, 0.748 shared compression, 900–1,275 px base-world bounds, 140/36 px shared chrome geometry, or prohibition on local compression requires explicit review.

## Original-plan reconciliation

The earlier 23-gate contract reached zero pending before a direct audit against the original C0-C11 design. That audit showed the contract itself was incomplete. C6 uncertainty rendering is now locked; the remaining required original-plan gates are Place-level spatial semantic LOD, sticky Person/Activity inspector, Activity-selection-to-Meanwhile linkage, and final browser/visual acceptance. Final product completion must not be declared again until those gates are locked.
