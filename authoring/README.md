# ATLAS GitHub Authoring Manifests

This directory is the reviewed GitHub entry point for new ATLAS Person × Polity authoring requests.

It does **not** define a second database write model. Every manifest is declarative input that must resolve through the existing normalized identity and activity services before anything reaches `atlas_v2`.

## Recommended contract — v2

Use `atlas-authoring-manifest/v2` for new work.

A v2 manifest always declares the Person and Activity. It may also declare a Polity and/or Role identity when that vocabulary does not already exist.

```json
{
  "schema": "atlas-authoring-manifest/v2",
  "request_id": "stable-idempotency-key",
  "review_status": "approved",
  "person": {
    "canonical_name_en": "...",
    "display_name_ko": "...",
    "canonical_key": null,
    "person_type": "historical",
    "historicity": "historical",
    "allow_display_name_collision": false
  },
  "polity_identity": {
    "canonical_name_en": "...",
    "display_name_ko": "...",
    "canonical_key": null,
    "polity_type": "historical_polity",
    "historicity": "historical",
    "allow_display_name_collision": false
  },
  "role_identity": {
    "code": "...",
    "category": "...",
    "source_label": "...",
    "display_name_ko": "..."
  },
  "activity": {
    "politic_name": "...",
    "activity_start": 0,
    "activity_end": 0,
    "role": "...",
    "period_basis": "reign",
    "notes": null
  }
}
```

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
5. `authoring_manifest_runs` audit/idempotency ledger write

There is no nested identity transaction, raw Person/Polity/Role INSERT path in the manifest runner, browser database credential, or legacy table write.

If any identity collision, vocabulary ambiguity, activity duplicate, reference mismatch, or activity creation failure occurs, the whole manifest rolls back.

## Invariants

- The manifest is reviewable Git history, not authoritative runtime data.
- `atlas_v2` is the only authoritative runtime database.
- Person/Polity/Role creation uses the same normalized identity semantics as `/api/atlas-identity`.
- Activity creation uses the same normalized v2 transaction semantics as `/api/atlas-mutate`.
- Existing vocabulary is resolved exactly; unresolved or ambiguous references fail closed.
- New Polity/Role declarations must exactly match the Activity reference they are intended to satisfy.
- A manifest must never create raw SQL, bypass duplicate rules, or write legacy tables.
- `request_id` is the stable idempotency key for the whole manifest.
- Re-applying an identical manifest is safe; a non-identical reuse of the same request id fails closed.

## Production execution

`.github/workflows/atlas-authoring-apply.yml` applies approved v1/v2 manifests only after the corresponding `main` commit reaches the exact Vercel Production deployment.

GitHub Actions obtains a short-lived GitHub OIDC token. Vercel verifies repository, immutable repository id, `main`, workflow identity, production environment, audience, and exact commit SHA before opening the database. `SUPABASE_DB_URL` remains inside Vercel and is never stored in the GitHub Actions job.

The workflow treats only deployment propagation (`404` or exact `DEPLOYMENT_SHA_MISMATCH`) as retryable. All other authoring failures fail closed.

## Current proven production example

`authoring/requests/liliuokalani.json` is the first completed production authoring request. It used the v1 compatibility contract because `Kingdom of Hawaii` and `Queen` already existed in normalized vocabulary.

Production apply completed with a new Person UUID and relationship UUID. Future requests should use v2 whenever their Polity or Role does not already exist.
