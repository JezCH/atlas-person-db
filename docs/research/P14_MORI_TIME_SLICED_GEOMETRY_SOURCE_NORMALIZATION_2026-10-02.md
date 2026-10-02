# P14-D — Mōri time-sliced Geometry source normalization

**Date:** 2026-10-02  
**Status:** REVIEWED SOURCE NORMALIZATION / NO GEOMETRY MATERIALIZATION / NO PRODUCTION MUTATION  
**Normalized artifact:** `research/p14/intake/20261002-mori-time-sliced-geometry-source-normalization.json`

## Scope

This work unit resumes exactly from P14-C and handles only the Mōri Motonari source-normalization step. It does not create Source rows, Geometry rows, TerritoryRecord rows, or Production mutations.

Canonical target Polity: `488eb50f-a337-424c-84df-267cd6466274`  
Reviewed Activity interval: 1523–1571.

## Result

**Source normalization completed; Geometry materialization remains HOLD.**

The Yamaguchi Prefectural Yamaguchi Library reference investigation, published through the National Diet Library Collaborative Reference Database as case `1000212761`, identifies six works containing pre-Sekigahara Mōri territorial maps. Two sources are especially useful for Motonari's own lifetime because they provide discrete map states with explicit year/event labels.

### Source A — preferred first inspection target

**『毛利氏の関ケ原』**, edited by Mōri Museum, Mōri Museum, September 2000.  
Exact locator: **pp. 6–7, 「毛利氏領国の拡大」**.

The library reference states that the color map presents:

- 1523 — around Motonari's succession to the Mōri house;
- 1555 — immediately before the Battle of Itsukushima;
- 1557 — after the destruction of the Ōuchi;
- c. 1569 — after the destruction of the Amago.

This is the cleanest four-slice family for P14 because all four states fall inside Motonari's reviewed 1523–1571 Activity interval.

### Source B — higher temporal resolution fallback / cross-check

**『毛利元就展 その時代と至宝』**, edited by the Mōri Motonari Exhibition Planning Committee and NHK, NHK, 1997.  
Exact locator: **p. 257, 「毛利氏の勢力の推移」**.

The library reference identifies map states at approximately 1523, 1530, 1541, 1554, 1557, 1569, and 1578. For the canonical Motonari interval, the first six are relevant. This source can cross-check whether the four broader states in Source A conceal materially important intermediate boundary changes.

## Chronology cross-check

Hiroshima Prefecture educational material independently supports the main transition anchors: succession in 1523; defeat of the Takahashi in 1529; Itsukushima in 1555; control of Nagato and Suō after the Ōuchi defeat in 1557; control of Izumo and Hōki after the Amago defeat in 1566; death in 1571.

That chronology is useful for interpreting map slices, but it is **not** used to invent polygon boundaries.

## Why Geometry is still HOLD

The bibliographic source identities and exact page locators are now normalized, but the actual cited map pages were not directly inspectable in this work unit. A library reference description that says a map exists is sufficient to normalize the source and locator; it is **not** sufficient to digitize the map's boundary.

Therefore P14-D deliberately does not:

- infer province polygons from the map descriptions;
- use campaign chronology as polygon geometry;
- equate `勢力範囲` automatically with direct administrative control;
- create a canonical Source UUID without the canonical writer/read-back path;
- materialize a `geometry_ref` from an unseen page;
- write any TerritoryRecord or Production row.

## Exact next resume point

**P14-E — Mōri primary map-page acquisition/inspection and boundary-semantics review — NOT STARTED.**

The first target should be 『毛利氏の関ケ原』 pp. 6–7. If those pages can be directly inspected, compare the four map states against Source B p. 257 and the Hiroshima chronology before any boundary digitization. If the primary pages cannot be lawfully/directly inspected, keep the case HOLD rather than substituting an inferred geometry.
