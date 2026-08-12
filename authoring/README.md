# ATLAS GitHub Authoring Manifests

This directory is the reviewed GitHub entry point for the **current Person × Polity authoring workflow**.

It does **not** define a second database write model. Every manifest is declarative input that must resolve through the existing normalized identity and activity services before anything reaches `atlas_v2`.

The final ATLAS Authoring product is broader than this current manifest contract: first-class Person / Place / Source objects, unresolved-safe authoring, Compile → Runtime projection and the source-backed AI candidate review flow are preserved in `ATLAS_REQUIREMENTS.md` for P13. Do not silently stretch v2 manifests into those domains before their reviewed contracts exist.

## Recommended contract — v2

Use `atlas-authoring-manifest/v2` for new current-schema work.

A v2 manifest always declares the Person and Activity. It may also declare a Polity and/or Role identity when that vocabulary does not already exist.

```json
{
  "schema": "atlas-authoring-manifest/v2",
  "request_id": "stable-idempotency-key",
  "review_status": "approved",
  "person": {
    "canonical_name_en": "Example Person",
    "display_name_ko": "예시 인물",
    "canonical_key": null,
    "person_type": "historical",
    "historicity": "historical",
    "allow_display_name_collision": false
  },
  "polity_identity": {
    "canonical_name_en": "Example Polity",
    "display_name_ko": "예시 정치체",
    "canonical_key": null,
    "polity_type": "historical_polity",
    "historicity": "historical",
    "allow_display_name_collision": false
  },
  "role_identity": {
    "code": "example_role",
    "category": "example_category",
    "source_label": "Example Role",
    "display_name_ko": "예시 역할"
  },
  "activity": {
    "politic_name": "Example Polity",
    "activity_start": 1900,
    "activity_end": 1901,
    "role": "example_role",
    "period_basis": "general_activity",
    "notes": null
  }
}
```

The numbers above are syntactically valid example years only. **Historical year 0 is forbidden.** A genuinely unknown Activity boundary must never be encoded as `0`, `1`, the Person birth year, or another convenient placeholder. The current v2 manifest requires known integer endpoints; unresolved-boundary authoring is a separate P13 requirement rather than a fake current-schema value.

`polity_identity` and `role_identity` are optional. Omit them when existing normalized vocabulary should be reused.

When `polity_identity` is supplied, its `canonical_name_en` must exactly equal `activity.politic_name`. When `role_identity` is supplied, `activity.role` must exactly equal its code, source label, or Korean display name. The authoring layer never guesses which newly declared identity an activity intended to reference.

## Legacy-compatible contract — v1

Existing reviewed manifests such as `liliuokalani.json` remain valid as `atlas-authoring-manifest/v1`.

v1 creates/reuses the Person and requires the referenced Polity/Role vocabulary to already exist. New manifests that declare `polity_identity` or `role_identity` must use v2.

## Atomic execution

`server/atlas-authoring-manifest-service.js` owns one PostgreSQL `SERIALIZABLE` transaction for the entire manifest.

Within that one transaction it reuses the existing domain primitives:

1. `createPerson`
2. optional `createPolity`
3. optional `createRole`
4. normalized v2 activity creation
5. post-write normalized UUID binding verification
6. `authoring_manifest_runs` audit/idempotency + result snapshot write

There is no nested identity transaction, raw Person/Polity/Role INSERT path in the manifest runner, browser database credential, or legacy table write.

If any identity collision, vocabulary ambiguity, activity duplicate, reference mismatch, post-write binding mismatch, or activity creation failure occurs, the whole manifest rolls back.

### Post-write binding gate

After the Activity row is written but before commit, authoring reloads the normalized relationship row and checks its UUID bindings.

- relationship `person_id` must equal the Person identity result
- if a Polity was declared in the manifest, relationship `polity_id` must equal that exact Polity result
- if a Role was declared, relationship `role_id` must equal that exact Role result

A mismatch is a transaction failure, not a warning.

## Durable execution result

`atlas_v2.authoring_manifest_runs` stores not only request id/hash and the primary IDs, but also:

- `manifest_schema`
- `result_snapshot` JSONB

A new successful execution writes `result_snapshot.version = 1` with entity-level normalized outcomes:

```json
{
  "version": 1,
  "schema": "atlas-authoring-manifest/v2",
  "marker": "ATLAS_AUTHORING_MANIFEST_V2",
  "provenance_complete": true,
  "entities": {
    "person": { "id": "...", "disposition": "created" },
    "polity": { "id": "...", "disposition": "reused" },
    "role": { "id": "...", "disposition": "resolved_existing" },
    "period_basis": { "id": "...", "disposition": "resolved_existing" },
    "activity": { "id": "...", "disposition": "created" }
  }
}
```

Disposition semantics:

- `created` — this manifest execution created the normalized object
- `reused` — the declared object already existed and exact identity authoring reused it
- `resolved_existing` — the manifest did not declare a new identity; the Activity resolver bound an existing vocabulary object
- `not_applicable` — nullable Role was intentionally absent
- `historical_unknown` — the run predates durable result snapshots; original create/reuse state cannot be proven

Manifest-level `replay: true` is separate from these entity dispositions. Replaying a request returns the original stored result snapshot rather than rewriting every entity as “reused”.

### Historical ledger compatibility

Runs that completed before result snapshots existed are not reverse-engineered into a fake created/reused history. On exact manifest replay:

1. the stored manifest hash must still match;
2. the ledger Person/Activity UUIDs are checked against the live normalized relationship;
3. a one-time snapshot is backfilled with `provenance_complete: false` and `historical_unknown` dispositions;
4. future replays verify that stored snapshot UUIDs still match the live normalized relationship.

This preserves honest historical provenance while upgrading old ledger rows to the current response shape.

## Migration governance

Authoring-specific runtime migrations are registered centrally in `server/atlas-authoring-migrations.js` and applied in order by both:

- the Vercel production authoring handler
- the local/manual authoring runner

Do not add a migration to only one execution path. Any Production-authorized structural change must also update `db/schema/atlas_v2.current.sql` so a clean database rebuild produces the same current schema.

## Invariants

- The manifest is reviewable Git history, not authoritative runtime data.
- `atlas_v2` is the only authoritative current authoring database.
- Person/Polity/Role creation uses the same normalized identity semantics as `/api/atlas-identity`.
- Activity creation uses the same normalized v2 transaction semantics as `/api/atlas-mutate`.
- Existing vocabulary is resolved exactly; unresolved or ambiguous references fail closed.
- New Polity/Role declarations must exactly match the Activity reference they are intended to satisfy.
- Post-write declared-identity bindings must match the normalized relationship UUIDs before commit.
- A manifest must never create raw SQL, bypass duplicate rules, or write legacy tables.
- `request_id` is the stable idempotency key for the whole manifest.
- Re-applying an identical manifest is safe; a non-identical reuse of the same request id fails closed.
- Stored result snapshots are checked against live normalized UUID bindings on replay.
- Historical year 0 is invalid.
- Unknown history is never encoded through placeholder current-schema values merely to make a manifest pass validation.

## Production execution

`.github/workflows/atlas-authoring-apply.yml` applies approved v1/v2 manifests only after the corresponding `main` commit reaches the exact Vercel Production deployment.

GitHub Actions obtains a short-lived GitHub OIDC token. Vercel verifies repository, immutable repository id, `main`, workflow identity, production environment, audience, and exact commit SHA before opening the database. `SUPABASE_DB_URL` remains inside Vercel and is never stored in the GitHub Actions job.

The workflow treats only deployment propagation (`404` or exact `DEPLOYMENT_SHA_MISMATCH`) as retryable. All other authoring failures fail closed.

The production response includes backward-compatible top-level IDs plus the durable `result` snapshot, so workflow logs show both the committed UUIDs and how each entity was obtained.

## Current proven production examples

- `authoring/requests/liliuokalani.json` — first completed production request, v1 compatibility path.
- `authoring/requests/khri-srong-lde-btsan.json` — first production test of v2 with a declared Polity identity.

Both predate durable entity-disposition snapshots. Their next exact replay must therefore preserve the live UUID bindings while reporting historical create/reuse disposition as unknown rather than guessing.
