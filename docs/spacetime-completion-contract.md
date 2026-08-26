# ATLAS Spacetime Completion Contract

Status: authoritative completion gate for the current Production `시공간 인물도`.

## Purpose

P1–P14 established the in-place foundation renderer: semantic time projection, stable macroregion world geometry, Person tracks, political placement semantics, semantic LOD, Y-stable labels, unique-Person density, semantic axes, exploration controls, minimap, viewport virtualization, and legacy cleanup.

**Finishing P1–P14 does not mean the original ATLAS Spacetime Landscape product goal is complete.** Final completion is reached only when every required capability in `tests/fixtures/spacetime-completion-contract.json` is `locked` and every acceptance fixture passes.

## Non-negotiable architecture

```text
Person / Activity
  -> Historical Spatial Evidence
  -> Spatial Evidence Resolver
  -> Precision-aware Spatial Compile
  -> Person Track Compiler
  -> Stable Spacetime World
  -> 2D Camera
  -> Semantic LOD
  -> density / point / label / rail / Activity
```

Camera and LOD may change presentation. They must never invent, upgrade, or mutate historical coordinates.

## Historical-spatial precision rule

Compiled precision may never exceed reviewed evidence.

- reviewed Place evidence may compile to a Place point;
- reviewed subregion evidence may compile to a subregion range;
- reviewed macroregion evidence may compile only to a macroregion range;
- conflicting or missing evidence remains unresolved;
- a display anchor is presentation data and is never historical evidence.

A broad range may have a deterministic display anchor for rendering, but that anchor must remain explicitly distinguishable from the historical precision range.

## Stable-world invariants

The same historical record must keep the same normalized world coordinate under:

- search on/off;
- different search terms;
- selection changes;
- time zoom;
- space zoom;
- minimap navigation.

`opposes` is a political counterparty relationship and must never determine the Person's own spatial placement.

## Time invariant

Historical Y is derived from historical time only. Labels may move horizontally or defer, but must never move a Person to a different historical Y.

World overview may use compressed time, while sufficiently local time zoom approaches a linear projection continuously and reversibly.

## Spatial semantic hierarchy

The final spatial experience is one continuous world, not separate region screens or dynamically resized result columns.

Semantic detail progresses through:

`macroregion -> subregion -> reviewed Place`

Headers may cross-fade as detail increases, but the underlying normalized Person coordinate may not jump merely because a header level changes.

## Interaction completion

Final completion requires all of the following on the same Production surface:

- continuous horizontal and vertical camera behavior;
- Person search and focus without geometry mutation;
- minimap with whole-world context and current viewport;
- Person inspector exposing Activity, placement basis, precision, confidence, and sources;
- Meanwhile exploration based on active ATLAS Activities at a selected historical moment;
- Fit World / equivalent camera reset behavior.

## Dense-label acceptance

The permanent dense windows are:

1. Europe, AD 1800–1950;
2. East Asia, AD 500–1900.

At a documented sufficient zoom, every finite visible Person in each fixture must have:

- label overlap count = 0;
- historical Y deviation = 0 px;
- deferred visible labels = 0.

Overview is allowed to defer labels when capacity is physically insufficient; sufficient zoom is not.

## Data parity

Completion must not silently change Person or Activity identity or historical semantics. Final parity requires zero unintended delta for:

- Person identity/count;
- Activity identity/count;
- start/end temporal boundaries;
- Polity;
- relation;
- role.

Spatial changes are allowed only when they are a reviewed precision upgrade or an explicit correction supported by evidence.

## Performance

Runtime DOM size must scale primarily with `viewport + overscan`, not total database size. Whole-world context may be retained in compact data/Canvas structures such as the minimap and density layer.

## Source of truth

- Machine-readable completion state: `tests/fixtures/spacetime-completion-contract.json`
- Permanent acceptance fixtures: `tests/fixtures/spacetime-acceptance-fixtures.json`
- Contract tests: `tests/spacetime-completion-contract.test.mjs`

Changing a completion requirement requires an explicit reviewed contract change. A passing implementation test may not silently delete or weaken a product requirement.