# P14 reviewed Territory / Geometry research standard

**Status:** current P14 research-intake discipline  
**Scope:** historical territory research before canonical P14 Authoring  
**Production mutation:** forbidden at the research-artifact layer

## 1. Historical accuracy over completion

A missing polygon, unresolved boundary, disputed control classification, or unavailable canonical Source/Polity binding is a valid `HOLD`. It must not be converted into a convenient guess merely to fill the map.

## 2. Political authority and geometry are separate questions

The canonical chain remains:

`Person → Activity → Polity → TerritoryRecord → Geometry`

Person Activity, office, campaign, military presence, claim, tributary relation, hegemony, or later political extent does not by itself establish direct territorial control or a polygon.

## 3. Evidence must be normalized before APPROVED handoff

An `APPROVED` case requires:

- exact canonical Polity UUID;
- Geometry evidence and Territory evidence as canonical Source UUID + locator links;
- one reviewed Geometry binding:
  - reuse an existing canonical Geometry UUID, or
  - provide an evidence-backed reusable Geometry candidate;
- Territory control type, boundary certainty, evidence confidence, chronology status, and reviewed temporal boundaries;
- zero remaining blockers.

URLs, titles, labels, or prose alone are not Production assertion identity.

## 4. Unknown stays unknown

Unknown temporal boundaries are the canonical all-null boundary tuple. Year 0, guessed month/day, guessed sub-year precision, or a later extent back-projected into an earlier period is forbidden.

For current/ongoing territorial facts, the end boundary remains all-null and `ongoing_as_of` records the reviewed verification date.

## 5. Geometry may not be invented for presentation

Research intake must not carry inline coordinates, GeoJSON, WKT, bounding boxes, or display-derived geometry. A display need cannot create historical evidence.

A new Geometry candidate must identify a reusable evidence-backed shape by `geometry_ref` and canonical source provenance. Actual GIS materialization/import is a later bounded operation.

## 6. Territory evidence is not Geometry evidence

A source may support both when appropriate, but each assertion link is explicit. A source proving that a polity controlled a region does not automatically prove the exact shape of its boundary.

## 7. Review states

### APPROVED

Historical interpretation and canonical bindings are sufficient for a later Authoring handoff. Approval still does **not** authorize Production mutation by itself.

### HOLD

At least one explicit blocker remains, such as unresolved polity identity, unresolved Source normalization, disputed control semantics, insufficient geometry evidence, or unresolved chronology.

### REJECTED

The proposed territorial interpretation is unsupported or structurally invalid. A review reason is mandatory.

## 8. Existing Stage 2 research remains evidence, not write authority

Reviewed Stage 2 dossiers remain useful evidence and model history, including Sengoku, layered authority, regional authority, residual research, and Kublai/Yuan territory decisions. Their old labels, URLs, Activity UUIDs, or deferred geometry markers must not be copied directly into Production.

P14 intake requires current canonical UUID binding and current P14 evidence semantics.

## 9. Handoff boundary

The research intake produces only a reviewed Authoring candidate. The canonical P14 mutation authority remains:

`server/atlas-p14-territory-geometry-service.js`

Application must perform current-state validation and canonical writer execution separately. The research artifact itself never writes Production.
