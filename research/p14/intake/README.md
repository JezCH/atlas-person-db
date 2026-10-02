# P14 reviewed Territory / Geometry research intake

This directory is the machine-validated intake surface for **reviewed P14 historical territory research**.

A JSON artifact here must use:

`schema: atlas-p14-reviewed-territory-research/v1`

and must remain:

`production_mutation_authorized: false`

The intake is not a Production writer. It records one of three reviewed outcomes:

- `APPROVED` — research is complete enough to become a canonical P14 Authoring handoff candidate;
- `HOLD` — uncertainty or missing canonical bindings remain explicit;
- `REJECTED` — the proposed territorial interpretation is not supported.

For `APPROVED`, the case must already bind the historical political actor by canonical **Polity UUID** and must cite canonical **Source UUID + locator** evidence. Geometry is either an existing canonical Geometry UUID or a reviewed reusable Geometry candidate with its own evidence. Territory semantics carry separate evidence.

Do not put inline coordinates, GeoJSON, WKT, bounding boxes, display-only region labels, Person-owned territory, Activity-owned territory, inferred campaign extents, or placeholder geometry in this intake.

Historical research dossiers may remain in `docs/research/` or other reviewed research artifacts. Only the normalized reviewed outcome belongs here.

Validation:

`node scripts/verify-p14-reviewed-research-intake.mjs`

The validator accepts zero JSON artifacts. P14-B establishes the intake and evidence discipline without fabricating any historical map content.
