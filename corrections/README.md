# ATLAS Correction Manifests

## Current schema extensions

The correction transport currently recognizes `v1`, `v1.1`, `v1.2`, `v1.3`, `v1.4`, and `v2`.

`atlas-correction-manifest/v1.4` is deliberately narrow metadata correction for existing identities:

- `update_person_historicity` changes only `atlas_v2.persons.historicity` under exact-before review;
- `update_activity_notes` changes only one existing Activity's `notes` while preserving Person, Polity, and year boundaries.

Both operations run in the same SERIALIZABLE, idempotent correction-ledger boundary as earlier schemas.

`corrections/requests/*.json` is the reviewed entry point for correcting existing normalized ATLAS relationships after semantic audit.

This is intentionally separate from `authoring/requests/*.json`:

- authoring creates/reuses historical identities and new Activity relationships;
- correction changes already-existing normalized data under exact before-state review.

## v1 scope

The only supported schema is currently:

`atlas-correction-manifest/v1`

The only supported operation is:

`coalesce_relationship`

v1 exists specifically for Stage 2 R0 true Activity duplicates. It does **not** support relink, rename, polity merge, chronology rewrite, or Activity split.

## Contract

```json
{
  "schema": "atlas-correction-manifest/v1",
  "request_id": "stable-idempotency-key",
  "review_status": "approved",
  "operations": [
    {
      "type": "coalesce_relationship",
      "keep_relationship_id": "UUID",
      "drop_relationship_id": "UUID",
      "expected_keep": {
        "person_id": "UUID",
        "polity_id": "UUID",
        "role_id": "UUID-or-null",
        "period_basis_id": "UUID",
        "activity_start": 1,
        "activity_end": 2,
        "notes": null,
        "legacy_source_key": "exact-or-null"
      },
      "expected_drop": {
        "person_id": "UUID",
        "polity_id": "UUID",
        "role_id": "UUID-or-null",
        "period_basis_id": "UUID",
        "activity_start": 1,
        "activity_end": 2,
        "notes": null,
        "legacy_source_key": "exact-or-null"
      }
    }
  ]
}
```

`expected_keep` and `expected_drop` must have identical semantic identity:

`Person + Polity + Role(nullable) + Period basis + Start + End`

Notes and legacy provenance may differ; that is why the reviewed manifest explicitly selects the representative relationship to keep.

## Safety model

Every selected relationship UUID is locked and checked against the reviewed exact before-state. Any drift fails closed.

The correction service runs in a PostgreSQL `SERIALIZABLE` transaction and reuses the source-preserving relationship coalesce primitive already used by the approved Person merge system. Before the redundant relationship is deleted it:

- preserves/moves relationship source links;
- rejects conflicting locator keys for the same source;
- moves chronology claims;
- moves relationship descriptions.

The service checks global relationship/child cardinality before commit and records the full keep/drop pre-state plus mutation summary in `atlas_v2.correction_manifest_runs`.

`request_id` + manifest hash is the idempotency boundary. Reusing the same request ID with different content fails closed.

## Production transport

`.github/workflows/atlas-correction-apply.yml` is isolated from normal authoring and audit workflows.

A correction request is processed only when an approved `corrections/requests/*.json` file reaches `main` (or by explicit workflow dispatch).

For each manifest the workflow must execute:

1. exact-SHA Production `dry_run` — transaction executes and rolls back;
2. only after successful dry-run, exact-SHA Production `apply`.

The workflow uses its own GitHub OIDC audience and exact workflow claim. GitHub Actions never receives `SUPABASE_DB_URL`; the credential remains server-side in Vercel.

The correction engine/workflow code itself is deliberately **not** a push trigger. Merging infrastructure without a request file therefore cannot mutate Production data.
