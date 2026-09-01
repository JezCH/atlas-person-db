# ATLAS GitHub Authoring Manifests

This directory is the reviewed GitHub entry point for current **Person → Activity → Polity** authoring.

It does **not** define a second database write model. A reviewed manifest is declarative input. Production resolves it through normalized identity services and the Stage 2-native Activity service before anything reaches `atlas_v2`.

The broader final Authoring product — first-class Person / Place / Source objects, unresolved-safe research candidates, human review, Compile → Runtime projection and map integration — remains governed by `ATLAS_REQUIREMENTS.md` and later P13/P14 work.

## Current new-write contracts

The repository currently supports **two intentional authoring manifest families**, and they serve different operator surfaces:

- `atlas-human-authoring/v1` — the normal reviewed historical-Person registration path governed by `REGISTRATION_SOP.md` and `HUMAN_AUTHORING.md`. It accepts reviewed names/codes and lets the Production Human Authoring service resolve or create normalized Person/Polity/Role identities inside the SERIALIZABLE transaction.
- `atlas-authoring-manifest/v2` — the lower-level Stage 2-native UUID-bound path for already-normalized authoring work.

The `ATLAS Authoring Apply` workflow explicitly accepts both current families. For ordinary historical-Person registration, **follow `REGISTRATION_SOP.md` rather than converting a Human Authoring request into a UUID-bound v2 manifest merely because this README documents the native contract below.**

### Stage 2-native v2 contract

A v2 manifest always declares the Person and Activity. It may declare a new Polity and/or Role identity, or bind existing normalized UUIDs.

Example shape:

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
    "code": "example-ruler",
    "category": "ruler",
    "source_label": "Example Ruler",
    "display_name_ko": "예시 통치자"
  },
  "activity": {
    "polity_binding": { "mode": "declared" },
    "role_binding": { "mode": "declared" },
    "relation_type_id": "00000000-0000-4000-8000-000000000001",
    "period_basis_id": "00000000-0000-4000-8000-000000000002",
    "activity_start": 1900,
    "activity_start_month": null,
    "activity_start_day": null,
    "activity_start_granularity": "year",
    "activity_start_certainty": "exact",
    "activity_start_calendar": "proleptic_gregorian",
    "activity_end": 1901,
    "activity_end_month": null,
    "activity_end_day": null,
    "activity_end_granularity": "year",
    "activity_end_certainty": "exact",
    "activity_end_calendar": "proleptic_gregorian",
    "confidence": "high",
    "chronology_status": "reviewed",
    "source_links": [],
    "notes": null
  }
}
```

The UUIDs above are shape examples only. A real manifest must use reviewed normalized IDs that actually exist, unless the corresponding identity is declared in the same manifest.

### Binding rules

`activity.polity_binding`:

- `{ "mode": "declared" }` — use the `polity_identity` declared by this manifest.
- `{ "mode": "existing", "id": "<uuid>" }` — bind an existing normalized Polity UUID.
- `none` is forbidden for Polity.

`activity.role_binding`:

- `{ "mode": "declared" }` — use the `role_identity` declared by this manifest.
- `{ "mode": "existing", "id": "<uuid>" }` — bind an existing normalized Role UUID.
- `{ "mode": "none" }` — no Role applies.

New Stage 2-native Activity writes **forbid** name-based binding fields such as:

- `person_name`
- `politic_name` / `polity_name`
- `role`
- `period_basis`
- `relation_type`
- a manifest-supplied `person_id`

The Person UUID comes from the Person identity result inside the same SERIALIZABLE transaction.

### Temporal rules

The Activity identity uses full temporal semantics. Both boundaries carry:

- year
- optional month/day
- granularity
- certainty
- calendar

Historical year `0` is forbidden. Unknown history must never be encoded as `0`, `1`, a birth year, or another placeholder merely to make a manifest pass. Unresolved-boundary authoring remains a separate later contract.

Certainty is recorded but is **not** part of the P9 semantic identity key. Granularity and calendar are part of identity.

### Source links

`source_links` is an array of normalized Source UUID bindings:

```json
{
  "source_id": "<uuid>",
  "source_locator_key": "reviewed locator"
}
```

Synthetic source-link UUIDs and legacy source keys are forbidden. An empty list is allowed when the reviewed manifest has no normalized Source link yet, but provenance must never be fabricated.

## Manifest families and legacy compatibility

Historical manifests remain in `authoring/requests/` as audit history.

- `atlas-human-authoring/v1` is a **current** normal historical-Person registration schema. The Production workflow validates it, performs batch preflight/apply through the Human Authoring service, and verifies the resulting Stage 2-native Person/Activity data.
- `atlas-authoring-manifest/v2` is the current Stage 2-native UUID-bound schema for normalized authoring work.
- New `atlas-authoring-manifest/v1` writes are retired.
- Older ledger requests may still replay through the compatibility path when an exact historical request already exists.
- The Production workflow rejects unsupported schemas; it does **not** restrict new execution to v2 when the request is a valid `atlas-human-authoring/v1` registration.

Examples such as `liliuokalani.json`, `khri-srong-lde-btsan.json`, and `ngawang-lobsang-gyatso.json` predate the current contracts and are not templates for new requests.

## Atomic execution

A new current manifest executes inside one PostgreSQL `SERIALIZABLE` transaction:

1. create/reuse Person through normalized identity semantics;
2. create/reuse or bind Polity;
3. create/reuse or bind Role;
4. verify relation type / period basis / Source UUID references;
5. create Stage 2-native Activity;
6. enforce the P9 semantic-key v2 duplicate rule;
7. persist immutable authoring ledger evidence;
8. commit only if every step succeeds.

No browser database credential, raw legacy-table write, name-only Activity binding, nested identity transaction, Person geometry, or physical Person merge is involved.

`request_id` is the stable idempotency key. Reusing a request id with different manifest content fails closed.

## Durable result snapshot

New Stage 2-native runs write `result_snapshot.version = 2` and:

```json
{
  "version": 2,
  "schema": "atlas-authoring-manifest/v2",
  "semantic_version": "v2-relation-full-temporal",
  "transport": {
    "version": 2,
    "runtime_sha": "<deployed Production code SHA>",
    "authoring_sha": "<reviewed GitHub manifest commit SHA>",
    "manifest_path": "authoring/requests/example.json"
  },
  "entities": {
    "person": { "id": "...", "disposition": "created" },
    "polity": { "id": "...", "disposition": "existing_uuid" },
    "role": { "id": null, "disposition": "none" },
    "activity": {
      "id": "...",
      "disposition": "created",
      "semantic_key": "...",
      "semantic_hash": "...",
      "relation_type_id": "...",
      "period_basis_id": "..."
    }
  }
}
```

The stored `transport` object records the **original successful write**, not whichever runtime later replays the same request. The HTTP response also reports the runtime SHA and authoring SHA used for the current invocation.

Historical ledger snapshots without transport metadata remain valid historical evidence; they are not rewritten to invent provenance that was never recorded.

## Production transport v2

Production authoring deliberately separates two trust anchors:

1. **Runtime SHA** — the exact Vercel Production `main` commit currently executing the server code.
2. **Authoring SHA** — the exact GitHub `main` commit containing the reviewed manifest.

They do not need to be equal.

`GET /api/atlas-authoring-apply` is a read-only readiness handshake. It returns:

- transport marker/version;
- current deployed runtime SHA;
- P5/core schema readiness;
- P9 old/new index state and duplicate count;
- Person-merge interlock state.

It does not run migrations or author data.

For a POST apply:

- Vercel verifies it is Production, branch `main`, repository `JezCH/atlas-person-db`, and that the supplied `runtime_sha` exactly equals `VERCEL_GIT_COMMIT_SHA`.
- GitHub Actions OIDC separately verifies repository, immutable repository id, `refs/heads/main`, workflow identity, production environment, audience, event type, and that token `sha` exactly equals `authoring_sha`.
- The server applies authoring migrations, re-checks readiness, then executes the manifest.

This keeps exact-SHA security without coupling every data commit to a new Vercel deployment.

## Vercel build policy

`authoring/requests/*.json` is reviewed **data**, not runtime code. Data-only authoring commits are therefore safe for `scripts/vercel-ignore-build.mjs` to skip.

Changes to any of the following remain deployment-relevant and must build normally:

- authoring API/server code;
- authoring workflow contract;
- migrations/schema;
- Vercel configuration;
- application/runtime code.

The authoring workflow first queries the deployed runtime readiness marker. A future incompatible transport change must bump the transport version, so a newer workflow cannot silently talk to an older incompatible runtime.

## P9/P10 invariants for ordinary registration

Ordinary new authoring is allowed only when:

- P5 additive schema is ready;
- P9 old Activity unique index is absent;
- P9 semantic-key v2 index is present;
- P9 duplicate groups are zero;
- Person reconciliation semantics are `v2-relation-full-temporal`;
- physical Person merge remains blocked under `pre-p10-blocked` until P10 is separately authorized.

P10 physical Person merge is **not** a prerequisite for ordinary new Person registration.

## Invariants

- Authoring → normalized DB; manifests are reviewed inputs, not runtime authority.
- Person → Activity → Polity; Person never owns geometry.
- UUID binding replaces name-only identity binding for new Activity writes.
- Unknown dates are never fabricated.
- Provenance is never silently lost.
- No generic relation default.
- No physical Person merge before P10 v2 revalidation.
- No runtime name-only identity binding.
- Legacy projections fail closed when they lack relation/full-temporal identity.
- Re-applying an identical request is safe; changing content under the same request id fails closed.
