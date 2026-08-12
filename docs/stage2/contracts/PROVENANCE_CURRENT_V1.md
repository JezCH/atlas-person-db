# ATLAS Stage 2 Provenance Contract — Current v1

> Status: BASELINE-INDEPENDENT DOMAIN CONTRACT / NO PRODUCTION MUTATION

Every reviewed historical assertion that can influence Runtime retains normalized source provenance. Notes, confidence labels, URLs embedded only in Markdown, and editorial catalog labels are not durable historical provenance by themselves.

The existing Activity pattern remains authoritative:

```text
person_politics_v2
  <- person_politics_sources -> sources
```

Stage 2 core assertion joins:

```text
polity_governance_period_sources
polity_relation_sources
polity_designation_sources
polity_identity_relation_sources
```

People/Event boundary joins:

```text
people_group_sources
historical_event_sources
person_people_affiliation_sources
person_event_participation_sources
```

Every new join identifies:

```text
assertion_or_entity_id + source_id + source_locator_key
```

`source_locator_key` is mandatory and non-blank. The same normalized Source may support one assertion/entity at **multiple distinct locators** (pages, clauses, sections, inscriptions, archival folios), so locator is part of join identity rather than disposable annotation.

Source identity remains centralized in `atlas_v2.sources`; do not create per-feature source silos.

Deletion policy:

- assertion/entity FK -> cascade that assertion/entity's source joins;
- source FK -> restrict while cited.

Correction/merge operations must inventory and preserve all relevant source joins before retiring/coalescing assertions. Coalescing may deduplicate exact identical `(source_id, source_locator_key)` pairs but must never collapse distinct locator evidence from the same Source.

`relation_type` is a semantic dimension of Activity, so Activity provenance continues through `person_politics_sources`; no field-level Relation source table is introduced without demonstrated need. People/Event assertions remain outside Activity and retain their own provenance joins.

Runtime-visible reviewed Governance, Polity relation, Designation, Polity identity, People affiliation, Event, and Event participation assertions require normalized evidence at compile/review policy level. Unresolved Authoring candidates may remain incomplete rather than inventing evidence.

Polity name semantics are different: Baseline A v2 preserves existing `polity_names.name_type` as live inventory. A Stage 2 `editorial_catalog_label` is explicitly an editorial label and must not masquerade as evidence for a historical designation.

Territory/Geometry provenance remains in the map domain but follows the same rule: source-backed reconstruction plus independent control/boundary/confidence dimensions.

This contract is baseline-independent. Actual assertion UUID/source links and reviewed name-kind mappings wait for Baseline A v2 and the Stage 2 Production train.
