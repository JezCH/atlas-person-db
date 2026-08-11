# ATLAS Stage 2 Provenance Contract v1

> Status: **NON-PRODUCTION REHEARSAL / DATA CONTRACT**
>
> Production DB mutation: **none**

## 1. Rule

Every historical assertion that may later influence Runtime must retain normalized source provenance.

Free-text `notes` are not provenance. A confidence label is not provenance. A URL embedded in an audit document is not a durable database link.

ATLAS already has the correct pattern for Person–Polity Activities:

```text
person_politics_v2
  <- person_politics_sources -> sources
```

The Stage 2 assertion families must use the same pattern.

## 2. New assertion-source joins

The rehearsal adds exactly four joins:

```text
polity_governance_period_sources
polity_relation_sources
polity_designation_sources
polity_identity_relation_sources
```

Each stores:

```text
assertion_id
source_id
source_locator_key
```

Primary key:

```text
(assertion_id, source_id)
```

This matches the existing `person_politics_sources` contract: one source identity may support an assertion once, with one canonical locator for that assertion/source pair.

## 3. Source identity stays centralized

Do not create separate `governance_sources`, `relation_sources`, etc.

All assertion families reference the existing normalized:

```text
atlas_v2.sources
```

which already carries stable source identity and file/content provenance fields.

This preserves one source graph across Person, Polity, Governance, structural relations, and future map research.

## 4. Delete behavior

Assertion source joins use:

```text
assertion FK -> ON DELETE CASCADE
source FK    -> ON DELETE RESTRICT
```

Reason:

- deleting/reconciling a reviewed assertion may remove its join rows atomically;
- deleting a Source that is still cited by historical assertions must be blocked.

A structural correction executor must inventory/preserve source joins before retiring or coalescing an assertion, exactly as current Activity correction logic preserves `person_politics_sources`.

## 5. Locator is mandatory and non-blank

`source_locator_key` is required and must contain non-whitespace text.

It should identify the relevant passage/page/section/record within the normalized Source identity. It is not limited to a raw URL.

Examples of valid locator concepts:

```text
page:143
chapter:Biographies_of_Dong_Zhuo
section:regency_1560_1563
archive_record:ABC-123
url-fragment:...
```

The exact locator vocabulary may remain source-type-specific. The database contract only requires a stable non-empty locator key.

## 6. Why there is no separate Activity-Relation source table

`relation_type` is a semantic dimension of `person_politics_v2`, not a standalone historical assertion entity.

The existing:

```text
person_politics_sources
```

continues to cite the Activity as a whole, including Person, Polity, Role, Relation Type, temporal interval, and Period Basis.

If one source supports chronology and another supports the political relation, both may cite the same Activity with different locators. A field-level evidence graph is not justified by the current use case and would over-normalize the model.

## 7. No source-less Runtime assertions

End-state Authoring may preserve an unresolved candidate without a complete Runtime representation, but a compiled Runtime-visible historical assertion should not be accepted merely because it has a confidence string.

Compile/review policy should eventually require at least one normalized source join for:

```text
polity_governance_periods
polity_relations
polity_designations
polity_identity_relations
```

when the assertion is promoted from candidate/research state into reviewed historical data.

This requirement belongs to authoring/compile validation, not necessarily a raw SQL `NOT NULL source count` constraint, because source rows are relational and may be inserted in one transaction.

## 8. Territory provenance remains in the map domain

This rehearsal does not move Territory/Geometry into `atlas-person-db`.

The same principle applies there:

```text
Territory assertion
  -> normalized Source link(s)
  -> geometry/reconstruction provenance
```

The map project must preserve source-backed control type, boundary certainty, evidence confidence, and reconstruction provenance independently of Person Activities.

## 9. Rehearsal acceptance

Fresh PostgreSQL must prove:

1. all four join tables exist;
2. every join targets the correct Stage 2 assertion table;
3. every join targets `atlas_v2.sources` with `ON DELETE RESTRICT`;
4. assertion deletion cascades its source joins;
5. deleting a cited Source is rejected;
6. blank `source_locator_key` is rejected;
7. reverse lookup by `source_id` is indexed;
8. existing `person_politics_sources` remains intact;
9. no legacy table is recreated.

## 10. Production gate effect

Once this rehearsal passes, the preflight blocker:

```text
NEW_ASSERTION_PROVENANCE_SCHEMA_DEFERRED
```

is considered **schema-designed/rehearsed**, but Production remains blocked on:

- actual source-backed historical backfill;
- structural Activity corrections;
- identity reconciliation;
- continuity and layered-authority research;
- Activity semantic-key/hash/replay/merge cutover;
- explicit migration authorization and deployed Production SHA.

Schema capability is not equivalent to completed historical provenance backfill.
