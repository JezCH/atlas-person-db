# ATLAS Spacetime — Incremental Migration Contract

Status: active implementation contract

## Goal

The current `시공간 인물도` remains the single supported renderer. The readable surface starts at **500%** and never exposes a lower scale.

## Locked invariants

- minimum/default camera zoom = 500%; maximum = 800%;
- one camera zoom controls X and Y;
- one shared physical extent compression factor = 0.78;
- horizontal base-world width is globally clamped to 900–1,275 px before zoom/compression;
- viewport growth beyond the cap must not enlarge world geometry;
- no local density-based region or era compression;
- historical Y never moves to resolve labels;
- search/filter never changes normalized coordinates;
- missing precision stays unresolved;
- `opposes` never drives primary placement;
- Person identity and Activity segments remain distinct;
- year zero remains invalid.

## Current replacement order

1. Lock 500% readable-scale contract.
2. Replace low-scale semantic/log time projection with uniform time projection.
3. Unify time and space zoom into one 2D camera.
4. Apply the same 0.78 extent compression to X and Y.
5. Remove overview/detail selector and all below-floor entry points.
6. Remove density and point low-scale rendering.
7. Remove obsolete log/adaptive tick/lane APIs.
8. Compact common padding, gutters, axes, rails, and labels uniformly.
9. Update tests and acceptance fixtures.
10. Remove dead files and stale cache references.
11. Run complete CI and browser visual verification.
12. Merge only after checks pass, then verify exact Production SHA.

## Forbidden shortcuts

Do not shrink Oceania because it is sparse, stretch Europe because it is dense, compress ancient eras because fewer Persons exist, maintain a hidden 100% compatibility branch, keep dead density/point/log code, or change historical coordinates to make labels fit.

## Acceptance

The final cleanup gate requires repository-wide evidence that no reachable below-500 renderer remains and that Person/Activity semantics are unchanged.
