# ATLAS Spacetime Completion Contract

Status: authoritative completion gate for the current Production `시공간 인물도`.

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

## Dense-label acceptance

Permanent dense windows:
1. Europe, AD 1800–1950.
2. East Asia, AD 500–1900.

At sufficient zoom: label overlap count = 0, historical Y deviation = 0 px, deferred visible labels = 0. Reducing below 500% is never an acceptance strategy.

These two dense-label gates are locked by the reproducible Production snapshot in `tests/fixtures/spacetime-dense-label-snapshot.json`. The snapshot is packed at 800% using the minimum 900 px base world, the shared 0.748 compression, and the production label engine; CI requires zero overlap, zero deferred labels, and zero historical-Y deviation for both permanent dense windows.

## Legacy prohibition

The following may not return: overview/detail mode selector, density overview renderer, Person point-only renderer, logarithmic time overview, adaptive low-scale ticks, retired lane assignment, 100% reset, any below-500 camera entry, or local region/time compression.

## Data parity

Zero unintended delta for Person identity, Activity identity, temporal boundaries, Polity, relation, and role.

## Performance

DOM size scales with viewport + overscan, not total DB size. Minimap may retain compact whole-world context. Density canvas is not part of the Production renderer.

## Source of truth

- `tests/fixtures/spacetime-completion-contract.json`
- `tests/fixtures/spacetime-acceptance-fixtures.json`
- `tests/fixtures/spacetime-dense-label-snapshot.json`
- `tests/spacetime-dense-label-acceptance.test.mjs`
- `tests/spacetime-place-precision.test.mjs`
- `tests/spacetime-person-inspector-evidence.test.mjs`
- `tests/spacetime-completion-contract.test.mjs`
- `tests/spacetime-readable-scale-contract.test.mjs`

Changing the 500% floor, 0.748 shared compression, 900–1,275 px base-world bounds, 140/36 px shared chrome geometry, or prohibition on local compression requires explicit review.
