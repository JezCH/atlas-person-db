# ATLAS Stage 2 Additive Schema Contract — Current v1

> Status: BASELINE-INDEPENDENT SCHEMA CONTRACT / NO PRODUCTION MIGRATION

P5 is an **additive capability migration**, not semantic cutover. Existing Runtime/write behavior must remain valid until P9.

## Required capabilities

### Activity relation

- normalized Relation Type vocabulary table
- nullable `relation_type_id` on Activity during transition
- no generic Relation backfill

### Governance

- Governance Context identity + localized names
- Polity-governance periods with the shared full temporal boundary contract

### Polity structure

- Polity relation type vocabulary + temporal Polity relations
- codes include reviewed dependency/constituency/suzerainty relations and `nominally_subordinate_to`

### Polity identity history

- temporal Polity designations/state forms without forcing new UUIDs for ordinary designation changes
- explicit Polity identity/continuity relation capability for genuinely distinct identities/transitions

### Temporal precision

All temporal assertion families use the same year/month/day + granularity/certainty/calendar boundary language. Transition state permits all-new-detail-fields NULL; partial detail tuples are invalid.

### Provenance

Normalized source joins for Governance periods, Polity relations, designations, and Polity identity relations; Activity continues to use `person_politics_sources`.

## Constraints deliberately deferred

P5 must **not**:

- make Relation Type NOT NULL globally;
- activate semantic-key v2 uniqueness;
- drop/replace the current NULL-role semantic index before coherent P9 cutover;
- relink/split historical Activities merely because the schema can represent them;
- manufacture source rows, temporal precision, or Polity identities.

## Shared temporal hardening

One validation language must apply symmetrically to Activities, Governance periods, Polity relations, Polity designations, and identity transitions. A schema in which some Stage 2 temporal assertions remain year-only by design is rejected.

## Execution boundary

The schema design/rehearsal can be prepared before Baseline A. The actual Production migration is P5 and requires the exact deployed SHA discipline. Historical UUID-bound corrections/backfills are generated after Baseline A and applied later through Correction v2 / P7.