# ATLAS Human Authoring — Registration v7

`/api/atlas-authoring` remains the single authoritative Human Authoring surface for ordinary historical Person/Activity registration. Registration v7 **does not introduce a second API or parallel identity system**.

Operational procedure lives in `authoring/REGISTRATION_SOP.md`. This file documents the deployed Authoring contract.

## Reviewed request

A normal new `atlas-human-authoring/v1` request contains:

- Person canonical English name;
- Korean display name when a new Person must be created;
- explicit reviewed `person.representative_domain` using one canonical domain or `null` HOLD;
- Polity canonical English name and Korean display name when new;
- active Relation Type code;
- Role label when applicable, plus Korean display name only when a new Role must be created;
- active Period Basis code;
- start/end boundary data;
- evidence confidence;
- at least one real Source;
- reviewed NamuWiki outcome when new/unreviewed, or the bounded documented deferral path.

Canonical Person domains are exactly:

`governance / military / knowledge / technology / commerce / culture / religion / exploration`

`null` means reviewed unclassified/HOLD. Role-to-domain automatic classification is forbidden.

Immutable GitHub manifests created before registration v7 remain replayable without rewriting solely to add `representative_domain`. New pushed registration manifests must carry the field explicitly. Direct Admin registration requires an explicit reviewed value or `null`.

## Atomic Person-domain integration

The production `/api/atlas-authoring` wiring continues to use the existing canonical Human Authoring service. Person-domain review is resolved inside the **same caller-owned SERIALIZABLE transaction** as Person/Activity authoring; there is no registration wrapper and no second domain mutation transaction.

For a non-replay registration:

- current domain `NULL` + reviewed non-null domain → set the Person domain in the current Human Authoring transaction;
- current domain equals reviewed domain → reuse;
- current domain non-null + conflicting reviewed non-null domain → fail closed with `HUMAN_AUTHORING_REPRESENTATIVE_DOMAIN_CONFLICT`;
- explicit reviewed `null` while current domain is `NULL` → preserve `NULL` as reviewed-unclassified/HOLD;
- explicit reviewed `null` while an existing non-null domain exists → preserve the existing reviewed value.

The immutable `atlas_v2.authoring_manifest_runs.result_snapshot` records the requested domain review, resulting canonical value, and disposition. That ledger is the registration audit evidence; registration does not emit a second `person_profile_mutation_audits` write for the same domain decision.

Immutable Activity request replay never mutates mutable Person-domain metadata. A later explicit domain reclassification therefore does not invalidate or rewind an Activity replay.

## Temporal boundaries

Each start/end boundary is one of three states.

### Known

- signed non-zero historical year;
- optional month `1..12`;
- optional day `1..31`, with day requiring month;
- certainty: `exact | approximate | uncertain`;
- calendar: `gregorian | julian | unspecified_historical | source_calendar`.

The server derives year/month/day granularity. Missing month/day remain NULL.

### Unknown

An unresolved boundary is represented by an entirely null tuple:

`year / month / day / granularity / certainty / calendar = NULL`

No sentinel year, January 1, December 31, dynasty boundary, current year, or guessed midpoint is allowed.

### Ongoing

A genuinely current Activity uses:

- `chronology_status: "ongoing"`;
- entirely null end boundary;
- real `ongoing_as_of: "YYYY-MM-DD"` verified by Source evidence.

Unknown historical end is not ongoing.

## Source policy

A real Source is mandatory.

Human Authoring:

- reuses an explicit existing `source_id` when supplied;
- reuses an exact canonical URL when one live Source matches;
- otherwise creates the bibliographic Source inside the Authoring transaction;
- preserves locator/citation provenance;
- never invents a URL for books, papers, or other non-web bibliography.

Source creation is part of registration, not a follow-up mutation.

## NamuWiki

For a new or previously unreviewed Person, normal Authoring requires either:

```json
{
  "status": "linked",
  "checked_at": "YYYY-MM-DD",
  "document_title": "exact document title",
  "url": "https://namu.wiki/w/..."
}
```

or:

```json
{
  "status": "not_found",
  "checked_at": "YYYY-MM-DD"
}
```

Existing reviewed state is reused rather than re-searched. Operator-facing outcomes remain `나무위키: 연결됨` for `linked` and `나무위키: 문서 없음` for `not_found`. A conflicting existing linked document is never silently overwritten. The exceptional provider-access deferral is governed by `NAMUWIKI_REGISTRATION_POLICY.md`.

## Transaction behavior

The existing Human Authoring service remains authoritative for:

1. request-id lock and idempotent replay;
2. exact Person/Polity/Role resolution or creation;
3. reviewed Person-domain set/reuse/HOLD resolution;
4. Relation Type / Period Basis resolution;
5. NamuWiki persistence/reuse;
6. Source resolution/create;
7. Stage 2-native full-temporal Activity creation;
8. semantic duplicate enforcement;
9. one immutable ledger snapshot containing the domain review/result and the rest of the registration result.

Each logical request has its own SERIALIZABLE transaction. Batch transport shares authentication/catalog caching but not transaction rollback boundaries.

## Preflight and batch

`preflight_batch` runs each candidate through the same authoritative resolver inside a SERIALIZABLE transaction and always rolls it back. Results are independent:

- `READY`
- `ALREADY_PRESENT`
- `BLOCKED`

`apply_batch` then attempts READY requests independently. One failed request does not roll back already successful sibling transactions.

Normal multi-Person work must use one batch rather than repeated per-Person Git/CI/Apply cycles.

## Authoring versus Runtime publication

Authoring and public Runtime are separate layers.

The Authoring workflow proves the authoritative write using the transaction result and immutable ledger. **It does not query the public Runtime for a row that has not yet been compiled.**

After every completed main Authoring attempt, the Runtime Projection Compile workflow recompiles the sealed Runtime projection. This happens even when the upstream batch has a BLOCKED/failed sibling because valid sibling transactions may already have committed.

The Runtime compiler publishes only rows that satisfy the Runtime readiness contract. In particular:

- unresolved start → `START_BOUNDARY_UNRESOLVED` exclusion;
- unresolved closed end → `END_BOUNDARY_UNRESOLVED` exclusion;
- invalid/unverified ongoing end → `ONGOING_VERIFICATION_UNRESOLVED`;
- unresolved provenance → `PROVENANCE_UNRESOLVED`.

The compiler never edits Authoring data to make a row publishable.

After compile, public normalized and Person read surfaces must identify their source as `runtime-person-politics-v1`.

A registration with a publishable known/ongoing Activity completes as `VERIFIED_RUNTIME` only after the intended Activity is confirmed in public Runtime. An honestly unresolved Activity may complete as `VERIFIED_AUTHORING_ONLY` when Authoring is verified and its Runtime absence is the expected unresolved-boundary disposition.

## Browser/Admin behavior

Any current Admin UI that creates a new Human Authoring request must expose the same canonical reviewed domain selector, including an explicit HOLD/unclassified choice. The browser must not infer a domain from Role.

The server remains authoritative even when the browser mirrors validation.

## Stopping rule

Do not perform repeated reassurance reads. One authoritative Authoring result plus one required publication verification is enough. Diagnose additional layers only after a concrete mismatch.
