# ATLAS GitHub Authoring Manifests

This directory is the reviewed GitHub entry point for new ATLAS authoring requests.

It does **not** define a second database write model. Every manifest is declarative input that must resolve through the existing normalized identity and activity services before anything reaches `atlas_v2`.

## Contract

A manifest describes one atomic authoring intent:

```json
{
  "schema": "atlas-authoring-manifest/v1",
  "request_id": "stable-idempotency-key",
  "person": {
    "canonical_name_en": "...",
    "display_name_ko": "...",
    "canonical_key": null,
    "person_type": "historical",
    "historicity": "historical",
    "allow_display_name_collision": false
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

## Invariants

- The manifest is reviewable Git history, not authoritative runtime data.
- Person creation must use the same semantics as `/api/atlas-identity`.
- Activity creation must use the same semantics as `/api/atlas-mutate`.
- Existing polity/role vocabulary is resolved exactly; unresolved or ambiguous references fail closed.
- A manifest must never create raw SQL, bypass duplicate rules, or write legacy tables.
- `request_id` is the stable idempotency key for the whole manifest.
- Re-applying an identical manifest is safe; a non-identical reuse of the same request id must fail.

## Execution

`server/atlas-authoring-manifest-service.js` is the single orchestration layer. It delegates identity creation to `atlas-identity-service.js` and activity creation to the normalized PostgreSQL activity transaction primitives.

Production automation can invoke the manifest service with server credentials; GitHub remains the audit/review surface, while `atlas_v2` remains the only authoritative database.