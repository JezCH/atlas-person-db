# ATLAS spacetime spatial taxonomy migration — 2026-09-03 r3

## Scope

This revision only changes the South Asia tail after the r2 39-leaf taxonomy.

The reviewed `sri-lanka-maldives` leaf contained exactly two polity bindings:
- Kingdom of Maldives → Maldives
- Polonnaruwa Kingdom → Sri Lanka

Because both sides are independently represented by reviewed data, the compound leaf can be split without inventing empty geography.

## Result

South Asia becomes:

**Northwest South Asia → North India·Ganges → Deccan·South India → Maldives → Sri Lanka**

The full world path remains:

**Americas → Europe → Africa → West Asia → Central Asia → South Asia → Southeast Asia → East Asia → Oceania**

The leaf count changes from **39 to 40**. Every leaf still has at least one reviewed polity binding at migration time, and every leaf remains equal-width.

## Why Maldives precedes Sri Lanka

The purpose is not strict latitude or a modern political grouping. The X-axis is a one-dimensional historical display path.

- Deccan/South India provides the mainland handoff to the Indian Ocean.
- Maldives lies southwest of the southern Indian peninsula.
- Sri Lanka lies farther east and is a better eastern endpoint for the next macroregion.
- Ending South Asia at Sri Lanka reduces the jump into mainland Southeast Asia compared with ending at Maldives.

This is therefore a continuity-first path:
**mainland India → Indian Ocean west/southwest island chain → Sri Lanka → mainland Southeast Asia**.

## Southeast Asia decision

The existing order is intentionally retained:

**Mainland Southeast Asia → Maritime Southeast Asia**

Reversing it would improve the Maritime→China boundary but would worsen the South Asia→Southeast Asia boundary and introduce a larger internal westward return. Keeping macroregions contiguous, the current order is the better global compromise.

## Exact migration

| Polity UUID | Polity | r2 leaf | r3 leaf |
|---|---|---|---|
| 81abc0e7-367d-48db-853c-2bdd5f76fa04 | Kingdom of Maldives | sri-lanka-maldives | maldives |
| c4089cc9-41b3-4879-9db0-c8776c59c87d | Polonnaruwa Kingdom | sri-lanka-maldives | sri-lanka |

No polity geography macroregion changes. No Person Activity changes. No Place anchor changes.

## Invariants

- 500% minimum/default zoom remains unchanged.
- 800% maximum zoom remains unchanged.
- Global compression remains 0.748.
- Local density-based compression remains forbidden.
- All leaf widths remain equal.
- Historical X/Y coordinates are still derived from reviewed geography/time only.
- The retired `sri-lanka-maldives` code must have zero reviewed bindings after migration.
