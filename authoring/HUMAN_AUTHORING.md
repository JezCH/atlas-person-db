# ATLAS Human Authoring — Registration v7

`/api/atlas-authoring` remains the single authoritative Human Authoring surface for ordinary historical Person/Activity registration. Registration v7 **does not introduce a second API or parallel identity system**.

Operational procedure lives in `authoring/REGISTRATION_SOP.md`. This file documents the deployed Authoring contract.

## Universal ingest obligation

Registration v7 follows one general rule beyond the currently named fields: whenever the project introduces a new canonical field/relation/classification/linkage/presentation obligation that is important enough to require a retrospective audit/backfill of already-registered records, every newly created applicable record must review that obligation at ingest from then on.

If the canonical Human Authoring transaction owns the field, persist it atomically there. If ownership necessarily lives in another governed writer, the registration request must still materialize the exact companion payload during review/prework and keep that write in the same registration completion chain. Silent omission or vague future-backfill debt is not a valid completed registration; explicit evidence-backed HOLD/unresolved is allowed when the historical/editorial fact genuinely cannot be decided.

This rule automatically applies to future capabilities and is not limited to Person domain, NamuWiki, Spatial, or Place.

## Reviewed request

A normal new `atlas-human-authoring/v1` request contains:

- Person canonical English name;
- Korean display name when a new Person must be created;
- explicit reviewed `person.representative_domain` using one canonical domain or `null` HOLD;
- Polity canonical English name and Korean display name when new;
- active Relation Type code;
- Role label when applicable, plus Korean display name only when a new Role must be created;
- active Period Basis code;
- historically closed or historical source-unknown start/end boundary data; genuinely ongoing/current Activities are rejected from ordinary new registration;
- evidence confidence;
- at least one real Source;
- reviewed NamuWiki outcome for new/unreviewed Persons under the exhaustive registration search contract;
- when a NEW Polity is created, an explicit spacetime-placement disposition or a concrete companion Spatial payload/HOLD in the same registration chain;
- every other applicable obligation required by the universal ingest rule above.

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

The underlying temporal model can represent known, unknown, and ongoing boundaries. **Ordinary new Person registration admits only historically closed or genuinely historical source-unknown Activity boundaries.**

### Known

- signed non-zero historical year;
- optional month `1..12`;
- optional day `1..31`, with day requiring month;
- certainty: `exact | approximate | uncertain`;
- calendar: `gregorian | julian | unspecified_historical | source_calendar`.

The server derives year/month/day granularity. Missing month/day remain NULL.

### Historical unknown

An unresolved historical boundary is represented by an entirely null tuple:

`year / month / day / granularity / certainty / calendar = NULL`

This is for a real source/evidence gap in a historical Activity. No sentinel year, January 1, December 31, polity boundary, current year, expected term end, or guessed midpoint is allowed.

### Ongoing/current

The generic temporal model retains `chronology_status: "ongoing"`, an entirely null end boundary, and `ongoing_as_of` for existing/legacy/non-registration data that genuinely remains current.

That representation is **not an ordinary Person-registration option**. Human Authoring rejects a new registration request marked `chronology_status:"ongoing"` with `HUMAN_AUTHORING_ONGOING_ACTIVITY_FORBIDDEN` before database mutation, and the registration manifest validator rejects it earlier during manifest validation.

This is role- and domain-agnostic. Living status itself is irrelevant: a living Person with a completed historical Activity may be reviewed normally; a Person whose registration-defining Activity is genuinely ongoing is held until an actual historical end exists. Historical unknown is not ongoing, and current ongoing must never be mislabeled as historical unknown to bypass the gate.

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

For a new or genuinely unreviewed Person, registration must search to the rolling #820 standard before it may conclude that no link can be verified. At minimum the review cascade covers Korean/spacing variants, canonical English/transliteration variants, native/local names, aliases/regnal names/titles/sobriquets/disambiguation forms, external indexed search or mirror discovery when direct access is blocked, and related dynasty/Polity/event/list pages plus reverse-link target recovery.

A direct provider block, one failed fetch, or one failed exact-title query is never evidence of absence.

When an independent same-Person document is verified, normal Authoring uses:

```json
{
  "status": "linked",
  "checked_at": "YYYY-MM-DD",
  "document_title": "exact document title",
  "url": "https://namu.wiki/w/..."
}
```

A terminal absence/unresolved disposition requires the exhaustive-search evidence defined by the registration SOP. Historical pre-v7 `not_found` values may remain readable/replayable, but they are not a reason to weaken the search standard for new registrations.

A conflicting existing linked document is never silently overwritten. If current transport cannot persist the final reviewed NamuWiki result in the same Human Authoring transaction, the exact companion NamuWiki write must already be materialized and serialized as part of the same registration completion chain.

## New Polity spacetime obligation

Because Polity spatial coverage already required project-wide backfill, creating a new Polity identity creates a mandatory registration-owned placement obligation.

- existing reused, already-bound Polity → verify/reuse; no duplicate write;
- new Polity with sufficiently stable geography → prepare canonical `polity_geography` + `polity_subregions` placement;
- new Polity whose center/region materially changes through time → use temporal `place_function_records` rather than forcing one misleading static location;
- genuinely ambiguous placement → explicit evidence-backed Spatial HOLD/unresolved; registration remains non-DONE;
- never infer Polity placement from the Person's nationality/name or a modern-country shortcut.

Spatial may remain a separate governed writer, but transport separation does not remove it from the registration completion contract.

## Transaction behavior

The existing Human Authoring service remains authoritative for:

1. request-id lock and idempotent replay;
2. exact Person/Polity/Role resolution or creation;
3. reviewed Person-domain set/reuse/HOLD resolution;
4. Relation Type / Period Basis resolution;
5. NamuWiki persistence/reuse when owned by the canonical transaction;
6. Source resolution/create;
7. Stage 2-native full-temporal Activity creation;
8. semantic duplicate enforcement;
9. one immutable ledger snapshot containing the domain review/result and the rest of the registration result.

Any obligation required by the universal ingest rule but owned by another writer must be represented by a concrete companion payload/HOLD before registration completion and verified through that writer's governed path.

Each logical request has its own SERIALIZABLE transaction. Batch transport shares authentication/catalog caching but not transaction rollback boundaries.

## Preflight and batch

`preflight_batch` runs each candidate through the same authoritative resolver inside a SERIALIZABLE transaction and always rolls it back. Results are independent:

- `READY`
- `ALREADY_PRESENT`
- `BLOCKED`

An ongoing/current registration request is BLOCKED by canonical normalization before any mutation. The GitHub manifest validator rejects the same request before it reaches the Authoring Apply path.

`apply_batch` then attempts READY requests independently. One failed request does not roll back already successful sibling transactions.

Normal multi-Person work must use one batch rather than repeated per-Person Git/CI/Apply cycles.

## Authoring versus Runtime publication

Authoring and public Runtime are separate layers.

The Authoring workflow proves the authoritative write using the transaction result and immutable ledger. **It does not query the public Runtime for a row that has not yet been compiled.**

After every completed main Authoring attempt, the Runtime Projection Compile workflow recompiles the sealed Runtime projection when that CORE boundary is available/owned. This happens even when the upstream batch has a BLOCKED/failed sibling because valid sibling transactions may already have committed.

The Runtime compiler retains generic support for historical and pre-existing ongoing data and publishes only rows that satisfy the Runtime readiness contract. In particular:

- unresolved start → `START_BOUNDARY_UNRESOLVED` exclusion;
- unresolved closed end → `END_BOUNDARY_UNRESOLVED` exclusion;
- invalid/unverified ongoing end → `ONGOING_VERIFICATION_UNRESOLVED`;
- unresolved provenance → `PROVENANCE_UNRESOLVED`.

The compiler never edits Authoring data to make a row publishable.

After compile, public normalized and Person read surfaces must identify their source as `runtime-person-politics-v1`.

An ordinary new registration with a publishable closed Activity completes as `VERIFIED_RUNTIME` only after the intended Activity is confirmed in public Runtime. An honestly historical-unresolved Activity may complete as `VERIFIED_AUTHORING_ONLY` when Authoring is verified and its Runtime absence is the expected unresolved-boundary disposition. When Runtime infrastructure is owned by a separate CORE boundary, the registration chain records that publication disposition explicitly rather than pretending the obligation never existed.

## Browser/Admin behavior

Any current Admin UI that creates a new Human Authoring request must expose the same canonical reviewed domain selector, including an explicit HOLD/unclassified choice. The browser must not infer a domain from Role.

The server remains authoritative even when the browser mirrors validation. UI omission of the closed-boundary rule cannot bypass the server-side rejection.

## Stopping rule

Do not perform repeated reassurance reads. One authoritative Authoring result, all applicable companion-obligation verifications, and one required publication verification/disposition are enough. Diagnose additional layers only after a concrete mismatch.
