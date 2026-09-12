# ATLAS Historical Person Registration SOP — Lean Path v7.0

This file is the durable operational source of truth for ordinary Person registration across human operators, agents, GPT conversations, Admin sessions, and GitHub batches.

Use this optimized path:

> **SCREEN → REVIEW → WRITE → PUBLISH/VERIFY → STOP**

Compatibility shorthand used by earlier operational checks remains:

```text
SCREEN
→ REVIEW
→ COMMIT
→ VERIFY
```

Here `COMMIT` is the Authoring WRITE step and `VERIFY` includes the publication/disposition verification described below.

Git/PR/CI/OIDC/deployment/UUID resolution/Runtime compilation are implementation mechanisms, not extra historical-review stages.

## Universal completeness invariant — backfill becomes ingest contract

Any field, relation, classification, external reference, spatial binding, presentation binding, or other canonical data obligation that becomes important enough to trigger a retrospective audit/backfill of already-registered records becomes a mandatory part of the registration contract for every newly created applicable record from that point forward.

This rule is generic. It is not limited to `representative_domain`, NamuWiki, Spatial, Place, or any currently known field.

Operationally:

- if historical records require a full-coverage audit for a newly introduced obligation, new records MUST review that obligation during the same registration lifecycle;
- if the current Authoring transaction can persist it atomically, persist it there;
- if the current transport/writer forces a separate mutation, materialize the exact companion payload during registration prework and keep that companion write in the same registration completion chain;
- an explicit evidence-backed `HOLD` / unresolved disposition is valid when the decision genuinely cannot be made, but silent omission or vague future-backfill deferral is not;
- do not declare `등록 완료` while any applicable obligation introduced by this rule is still unspecified;
- future schema/product capabilities inherit this rule automatically: once existing data must be audited for a capability, new registrations must stop creating new debt immediately.

The purpose is to prevent the project from repeatedly creating a new coverage feature, auditing thousands of existing rows, and simultaneously adding fresh incomplete rows through the registration path.

## Terminal states

- `COMPLETE_EXISTING` — canonical Production data already satisfies the reviewed registration.
- `VERIFIED_RUNTIME` — Authoring committed; Runtime compile/disposition and intended public projection verified.
- `VERIFIED_AUTHORING_ONLY` — valid Authoring data committed; Runtime exclusion is intentional because a Runtime-required fact remains unresolved.
- `NON_TIMELINE` — historical Person retained outside Timeline because personal chronology is not defensible.
- `EXCLUDE` — reviewed out of scope.
- `NEEDS_CORRECTION` — existing canonical data requires correction rather than duplicate registration.
- `HOLD` — a required historical/editorial decision cannot yet be made defensibly, including a candidate whose registration-defining Activity is genuinely ongoing and therefore has no historical endpoint yet.

Stop when the applicable terminal state is proven. Do not add reassurance passes.

## SCREEN

Do not begin full historical research before checking whether the intended Person is already in Production. Perform a bounded Production identity check before expensive research or writes. Search exact English/Korean names plus only necessary aliases/transliterations. Reuse existing canonical Person/Polity/Role/Relation/Period Basis/Source objects. Decide NEW, EXISTING, CORRECTION, EXCLUDE, or HOLD. Do not turn SCREEN into a database-wide audit.

### Closed-boundary gate

Before full significance review or registration prework, classify the Activity that would justify Timeline registration as either historically closed, historically source-unknown, or genuinely ongoing.

A genuinely ongoing/current Activity has no historical endpoint yet. It is **not eligible for ordinary new Person registration**. Route the candidate to `HOLD` and STOP before WRITE. This is a temporal rule, not an office-title, profession, domain, nationality, or political-status rule: president, monarch, minister, cleric, commander, scientist, artist, executive, activist, or any other role is treated the same when the Activity is genuinely ongoing.

Living status by itself is not a gate. A living Person may be reviewed normally when the historical Activity being registered is already complete and has a defensible end boundary.

A genuinely historical source gap is also not the same as current service. An ancient/medieval/otherwise historical Activity whose end is unknown because surviving evidence does not resolve it may use an honest all-null historical unknown boundary. Never relabel a current Activity as historical `unknown` merely to bypass this gate, and never invent a projected/sentinel end date.

For cohorts, SCREEN independent candidates in parallel.

## REVIEW

Review every fact that is mandatory to author the candidate correctly in one bundle.

### Person

Review canonical English/Korean names, Person type/historicity, Timeline eligibility, and `representative_domain`.

Timeline admission uses two independent gates: historical grounding and defensible personal chronology. A Person may be historically meaningful yet lack defensible Timeline chronology; route that case to `NON_TIMELINE` instead of inventing dates.

Every new ordinary Person registration must explicitly review `person.representative_domain` as exactly one of:

`governance`, `military`, `knowledge`, `technology`, `commerce`, `culture`, `religion`, `exploration`, or explicit `null` HOLD.

`null` means reviewed-unclassified, not forgotten. Never infer domain from Activity Role. Preserve an existing non-null reviewed domain; a conflicting new proposal fails closed and requires separate editorial correction. Legacy immutable pre-v7 manifests may replay without the domain field.

### Activity

Review Polity binding, Relation Type, Role, Period Basis, start/end boundaries, chronology status, boundary certainty/calendar/granularity where known, confidence, and real Source provenance.

Temporal truth for an ordinary registration is:

- known boundary — store the supported value;
- historical source-unknown boundary — store the entire boundary tuple as null;
- genuinely ongoing/current end — **registration HOLD; do not WRITE the new Person/Activity through ordinary registration**.

The underlying temporal model may continue to represent `chronology_status:"ongoing"` for legacy or non-registration infrastructure. That capability is not permission to ingest a new ongoing Person Activity.

Unknown historical end is not ongoing. Current ongoing is not historical unknown. Never use year 0, current year, expected term end, polity bounds, January 1, or another sentinel to obtain eligibility or Runtime visibility.

At least one real Source is required for a new Activity. Reuse an exact Source identity when present; do not invent bibliographic URLs.

### NamuWiki — mandatory review for new/unreviewed Persons

NamuWiki review/reuse belongs in the same registration bundle, not a routine post-registration pass.

For every new or genuinely unreviewed Person, apply the same exhaustive search standard used by the rolling #820 re-audit before declaring absence or unresolved status:

1. preferred Korean display name and spacing variants;
2. canonical English name and transliteration variants;
3. local/native name, aliases, regnal names, titles, sobriquets, dynasty-qualified forms, and disambiguation variants;
4. external indexed search or mirror discovery when direct provider search is blocked;
5. related dynasty/Polity/event/list pages and reverse-link target recovery to discover the actual document title;
6. same-Person verification against homonyms, mentions, redirects, and broken targets.

`provider_access_blocked`, one failed direct fetch, or one failed exact-title search is never sufficient evidence for `not_found`.

When a verified independent NamuWiki Person document exists, write/read back the canonical external reference before registration completion. If current transport forces a separate NamuWiki mutation, materialize that exact companion write during registration and keep it in the same completion chain.

If exhaustive search still cannot verify a page, preserve the attempted variants/evidence as unresolved. `confirmed_not_found` is reserved for genuinely exhausted review, never mere provider blockage.

An existing reviewed Person may reuse a proven live linked state. Historical `not_found`/missing debt remains subject to the separate rolling #820 re-audit and must not be treated as proof that a new search would also fail.

### Spatial / spacetime — conditional for reused Polity, mandatory closure for new Polity

Already-bound reused Polities add no new placement write, but their existing binding must be verified rather than duplicated.

If a registration creates a NEW Polity identity, the registration is not complete until that Polity has an explicit reviewed spacetime-chart placement disposition in the canonical Spatial model:

- use `polity_geography` plus `polity_subregions` when the historical geography is sufficiently stable for a static placement;
- use temporal `place_function_records` when the center/region changes over time or a single static placement would materially distort history;
- do not infer placement from the registered Person's nationality, name, or modern country;
- if the historical placement is genuinely ambiguous, create an evidence-backed Spatial HOLD/unresolved disposition and keep the registration chain non-DONE rather than silently creating new coverage debt.

This obligation exists because live Polity spatial debt already required project-wide backfill; therefore every future new Polity must stop adding to that debt at ingest time.

### Place — conditional only

First-class Place support does not make Place mandatory. Author Place only when a supported historical relation actually needs it and evidence exists. Display anchors/layout coordinates are not historical Place facts.

## WRITE

Ordinary registration uses one canonical path:

- schema `atlas-human-authoring/v1`
- endpoint `/api/atlas-authoring`

Do not create a second registration API, registration wrapper, or feature-specific Person write loop.

Each logical request retains one SERIALIZABLE/idempotent transaction; in other words, each logical registration has its own `SERIALIZABLE` transaction. The canonical Human Authoring service resolves/reuses/creates reviewed entities and Sources, applies the reviewed Person domain, persists NamuWiki state where supported, and creates the Stage 2 Activity inside that same transaction. The immutable Human Authoring ledger records the requested domain review, resulting canonical domain, and disposition, including explicit null HOLD; registration does not add a second Person-domain audit write. Conflicting existing non-null domain fails closed; immutable replay must not revert later domain edits.

The canonical Human Authoring normalizer rejects `chronology_status:"ongoing"` with `HUMAN_AUTHORING_ONGOING_ACTIVITY_FORBIDDEN` before any database mutation. The registration manifest validator enforces the same invariant earlier so invalid current candidates do not consume an Authoring Apply cycle.

Any applicable registration obligation that cannot yet be persisted by this canonical transaction follows the universal completeness invariant above: prepare the concrete governed companion write before the Person registration is considered complete, serialize it at the proper shared-write boundary, and verify its Production result. Do not translate a transport limitation into permanent content debt.

For cohorts: prepare independently, run one `preflight_batch`, isolate BLOCKED requests, apply READY requests through one governed batch while retaining independent request transactions, and keep valid sibling commits even when another request is blocked. Use one registration PR/Authoring Apply cycle rather than one per Person.

## PUBLISH/VERIFY

Authoring persistence and Runtime publication are separate facts.

A successful Human Authoring transaction plus immutable ledger/result snapshot proves the Authoring write. **Never verify a just-written Activity through public Runtime before Runtime compile.** Runtime is a compiled projection; pre-compile public verification creates a circular dependency.

After the Authoring batch reaches its resulting authoritative state:

1. run **one Runtime compile for the resulting authoritative state** when that boundary is owned/available;
2. let the Runtime compiler classify eligibility honestly;
3. verify the intended Runtime/public state once, or record the current CORE-owned publication disposition when Runtime is outside the registration worker's ownership;
4. verify every applicable companion obligation required by the universal completeness invariant;
5. finish with the applicable terminal state and STOP.

A valid historical Authoring Activity may be intentionally excluded from Runtime because relation, temporal, or provenance readiness remains unresolved. Do not coerce historical data to avoid `VERIFIED_AUTHORING_ONLY`. Ongoing Runtime support is retained for pre-existing/non-registration data and does not override the ordinary registration closed-boundary gate.

## Bulk default

`bounded SCREEN → parallel REVIEW of all applicable obligations → one cohort preflight → one governed Human Authoring batch → required companion writes → one Runtime publication/disposition → one terminal read-back pass → STOP`

Optimize transport/deployment/compile cycles, not historical correctness or transaction isolation.

## Fail-closed invariants

Never duplicate canonical identity, infer Person domain from Role, silently overwrite a conflicting domain, fabricate chronology, conflate historical unknown with current ongoing, admit a genuinely ongoing Activity through ordinary new Person registration, create placeholder Place facts, omit spacetime placement for a newly created Polity, treat provider blockage as NamuWiki absence, leave a newly introduced backfill-worthy field unspecified on a new record, use public Runtime as pre-compile proof of an Authoring write, create redundant registration APIs/wrappers, or erase successful sibling commits because another batch item was blocked.

At a shared-write boundary owned by another linear task, finish all non-conflicting research/code/tests/preparation and then obey the current repository single-writer queue contract rather than racing the owner.
