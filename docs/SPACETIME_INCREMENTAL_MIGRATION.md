# ATLAS Spacetime — Incremental Migration Contract

Status: active implementation contract

## Goal

The current `시공간 인물도` remains the single supported surface while its renderer is replaced subsystem by subsystem. We do **not** maintain a long-lived parallel `/spacetime-v2` surface and do not wait for one final all-at-once cutover.

Every merged step must leave the current spacetime surface usable.

## Invariants

- Historical time anchors are never moved to solve label collisions.
- Historical facts stay in Authoring; derived screen/layout values are Runtime concerns.
- Search and filtering must not redefine stable world coordinates.
- Missing spatial precision stays unresolved instead of being invented.
- `opposes` must not determine primary person placement.
- Person identity and Activity segments remain distinct concepts.
- World overview is not required to render every name at once; semantic LOD replaces unreadable overlap.
- Year zero remains invalid.

## Incremental replacement order

0. Preserve baseline/regression windows.
1. Centralize reversible world-time ↔ screen-Y projection without changing current output.
2. Move the existing time axis onto camera state and pointer-centered time zoom.
3. Replace fixed nine-column screen placement with stable world-X macroregion bands.
4. Add subregion / reviewed Place-derived spatial compile.
5. Compile Person tracks and render Activity changes as track segments.
6. Enforce relation-aware placement semantics.
7. Replace always-on overview labels with semantic LOD.
8. Retire legacy overview label packing when the new label controller lands.
9. Add overview density rendering.
10. Add semantic spatial/time headers.
11. Improve search, selection, Meanwhile, and inspector interactions.
12. Add minimap/navigation context.
13. Add culling/virtualization and Canvas/WebGL only where measurement justifies it.
14. Audit and remove remaining legacy rendering paths.

## Step acceptance rule

A step is complete only when its tests pass and the current surface can continue to render the same historical data. Compatibility adapters may exist temporarily, but a second long-lived renderer is not allowed.

The previous concept of “build v2 separately → compare v1/v2 → final cutover” is superseded by this contract.