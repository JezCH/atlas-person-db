# ATLAS Stage 2 Provenance Contract — Current v1

> Status: BASELINE-INDEPENDENT DOMAIN CONTRACT / NO PRODUCTION MUTATION

Every reviewed historical assertion that can influence Runtime retains normalized source provenance. Notes, confidence labels, and URLs embedded only in Markdown are not durable database provenance.

The existing Activity pattern remains authoritative:

```text
person_politics_v2
  <- person_politics_sources -> sources
```

Stage 2 adds equivalent source joins for the four new assertion families:

```text
polity_governance_period_sources
polity_relation_sources
polity_designation_sources
polity_identity_relation_sources
```

Each join identifies:

```text
assertion_id + source_id + source_locator_key
```

`source_locator_key` is mandatory and non-blank. The same normalized Source may support one assertion at **multiple distinct locators** (for example several pages, clauses, sections, inscriptions, or archival folios), so locator is part of the join identity rather than disposable annotation.

Source identity remains centralized in `atlas_v2.sources`; do not create per-feature source silos.

Deletion policy:

- assertion FK -> cascade all of that assertion's source joins;
- source FK -> restrict while cited.

Correction/merge operations must inventory and preserve all relevant source joins before retiring/coalescing assertions. Coalescing two assertions may deduplicate exact identical `(source_id, source_locator_key)` pairs, but it must not collapse distinct locator evidence from the same Source.

`relation_type` is a semantic dimension of Activity, so Activity provenance continues through `person_politics_sources`; no field-level Relation source table is introduced without a demonstrated need.

Runtime-visible reviewed Governance, Polity-relation, Designation, and Polity-identity assertions require normalized source evidence at compile/review policy level. Unresolved Authoring candidates may remain incomplete rather than inventing evidence.

Territory/Geometry provenance remains in the map domain but follows the same rule: source-backed reconstruction plus independent control/boundary/confidence dimensions.

This contract is baseline-independent. Actual assertion UUIDs/source links and backfills wait for Baseline A and the Stage 2 Production train.
