# P14-E — Mōri primary map-page acquisition/inspection and boundary-semantics review

**Date:** 2026-10-02  
**Status:** REVIEWED / PRIMARY PAGE ACQUISITION BLOCKED / BOUNDARY SEMANTICS HOLD / NO PRODUCTION MUTATION  
**Artifact:** `research/p14/intake/20261002-mori-primary-map-page-inspection.json`

## Scope

This work unit resumes exactly from P14-D. It attempts to acquire and directly inspect the cited Mōri territorial map pages before any Geometry materialization.

Canonical target Polity: `488eb50f-a337-424c-84df-267cd6466274`  
Reviewed Activity interval: **1523–1571**.

No Source row, Geometry row, TerritoryRecord row, or Production mutation is created.

## Result

**Primary bibliographic verification succeeded, but the exact map pages were not lawfully/directly acquired in this work unit. Geometry remains HOLD.**

The strongest source family remains:

1. **『毛利氏の関ケ原』**, Mōri Museum, September 2000, **pp. 6–7 「毛利氏領国の拡大」**.
   - 1523 — around Motonari's succession
   - 1555 — immediately before Itsukushima
   - 1557 — after the Ōuchi were destroyed
   - c.1569 — after the Amago were destroyed

2. **『毛利元就展 その時代と至宝』**, Mōri Motonari Exhibition Planning Committee / NHK, 1997, **p.257 「毛利氏の勢力の推移」**.
   - c.1523
   - c.1530
   - c.1541
   - c.1554
   - c.1557
   - c.1569
   - c.1578, outside Motonari's Activity interval

The Yamaguchi Prefectural Yamaguchi Library reference case explicitly says these materials show Mōri **勢力範囲** by color coding or lines. It confirms the exact locators and time slices, but it does not reproduce the page legends at sufficient fidelity for boundary digitization.

## Direct acquisition attempt

### Source A — 『毛利氏の関ケ原』 pp.6–7

The public library/reference surfaces located in this unit provide the bibliographic citation and page locator, but no directly inspectable digital scan of pp.6–7 was found.

Therefore:

- the four slice dates are **verified as reported map states**;
- the polygon outlines are **not inspected**;
- the legend is **not inspected**;
- exact direct-control semantics are **not established**.

### Source B — 『毛利元就展』 p.257

NDL Search confirms the 1997 exhibition catalogue and its bibliographic identity. Hiroshima Prefectural Art Museum's archived exhibition page confirms that the catalogue contains `毛利氏の勢力の推移` and that the exhibition ran at major public museums.

However, the public surfaces found in this work unit do not expose p.257 itself for direct inspection.

Therefore Source B remains a strong cross-check source, not a digitizable geometry source yet.

## Boundary-semantics review

The key finding of P14-E is that **`勢力範囲` cannot be silently normalized to `direct administrative territory`.**

The library reference describes the maps generically as areas of power/influence rendered by color or line. Without the original legend, those shapes may encode one or more of:

- direct domain / administrative possession;
- effective political control;
- subordinate or vassal scope;
- military control;
- allied or coalition reach;
- mixed historical reconstruction.

Accordingly, the provisional Territory Interpretation Policy is:

> **MIXED_OR_UNRESOLVED — HOLD until the map legend is directly inspected.**

This is not a semantic technicality. Hiroshima Prefecture's historical account shows that Motonari's rise involved inherited holdings, leadership of kokujin coalitions, placement of sons into Kikkawa/Kobayakawa houses, conquest, and later territorial consolidation. Those mechanisms are historically different and must not all become one `definite` polygon automatically.

## Directly inspectable institutional context

Two public institutional sources were directly inspectable and are useful as controls.

### Hiroshima Prefecture — Mōri rise chronology

`ひろしま文化大百科` records the sequence from succession in 1523, Takahashi defeat in 1529, formation of the Mōri Ryōsen structure, break with the Ōuchi in 1554, destruction of the Ōuchi in 1557, near-control of Iwami by early 1562, and Amago surrender in 1566.

This supports the **need for time slicing**, but chronology is not substituted for map geometry.

### Hiroshima Web Museum — 1585 fixed Mōri domain

The directly inspectable institutional map `確定した毛利氏の領国` depicts the Mōri domain and separately marks the border fixed in 1585.

That map is outside Motonari's 1523–1571 interval, so it is **not** used for Motonari geometry. Its value is semantic: it demonstrates that an authoritative Mōri map can distinguish territorial possession from a formally fixed boundary. P14 must therefore inspect each legend rather than infer geometry semantics from color fill alone.

## Decision

**Geometry materialization remains HOLD.**

The following four slices remain the preferred first geometry candidates once the original map is inspectable:

- 1523
- 1555
- 1557
- c.1569

But their status is only:

`SOURCE_REPORTED_NOT_GEOMETRY_APPROVED`

P14-E does **not**:

- trace a polygon from a secondary textual description;
- infer province-complete boundaries from conquest chronology;
- treat coalition leadership as direct administration;
- back-project the inspectable 1585 domain into Motonari's lifetime;
- create canonical Source UUIDs without the canonical writer/read-back path;
- write Production.

## Exact next resume point

**P14-F — Mōri lawful primary-page acquisition path or equivalent authoritative inspectable 1523/1555/1557/1569 map asset — NOT STARTED.**

The next unit should first try to obtain an inspectable copy of 『毛利氏の関ケ原』 pp.6–7 or an equivalent institutional map asset for the same four slices. If that still cannot be obtained, keep Geometry HOLD rather than manufacture boundaries.
