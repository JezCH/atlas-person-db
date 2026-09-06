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

## Terminal states

- `COMPLETE_EXISTING` — canonical Production data already satisfies the reviewed registration.
- `VERIFIED_RUNTIME` — Authoring committed; Runtime compile/disposition and intended public projection verified.
- `VERIFIED_AUTHORING_ONLY` — valid Authoring data committed; Runtime exclusion is intentional because a Runtime-required fact remains unresolved.
- `NON_TIMELINE` — historical Person retained outside Timeline because personal chronology is not defensible.
- `EXCLUDE` — reviewed out of scope.
- `NEEDS_CORRECTION` — existing canonical data requires correction rather than duplicate registration.
- `HOLD` — a required historical/editorial decision cannot yet be made defensibly.

Stop when the applicable terminal state is proven. Do not add reassurance passes.

## SCREEN

Do not begin full historical research before checking whether the intended Person is already in Production. Perform a bounded Production identity check before expensive research or writes. Search exact English/Korean names plus only necessary aliases/transliterations. Reuse existing canonical Person/Polity/Role/Relation/Period Basis/Source objects. Decide NEW, EXISTING, CORRECTION, EXCLUDE, or HOLD. Do not turn SCREEN into a database-wide audit.

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

Temporal truth is exactly one of:

- known boundary — store the supported value;
- unknown boundary — store the entire boundary tuple as null;
- ongoing end — null end boundary with `chronology_status:"ongoing"` and explicit `ongoing_as_of`.

Unknown is not ongoing. Never use year 0, current year, polity bounds, January 1, or another sentinel to obtain Runtime visibility.

At least one real Source is required for a new Activity. Reuse an exact Source identity when present; do not invent bibliographic URLs.

NamuWiki review/reuse belongs in the same registration bundle, not a routine post-registration pass. The request field is `external_references.namuwiki`; an existing reviewed Person reuses its live `linked` or `not_found` NamuWiki state without re-searching it.

### Spatial — conditional only

Do not add a standalone Spatial lookup to every registration. A companion Spatial obligation exists only when this registration creates a new Polity or reuses a Polity already known to be spatially unbound. If geography is clear, prepare the governed assignment; otherwise leave Spatial HOLD. Already-bound Polities add no registration step.

### Place — conditional only

First-class Place support does not make Place mandatory. Author Place only when a supported historical relation actually needs it and evidence exists. Display anchors/layout coordinates are not historical Place facts.

## WRITE

Ordinary registration uses one canonical path:

- schema `atlas-human-authoring/v1`
- endpoint `/api/atlas-authoring`

Do not create a second registration API, registration wrapper, or feature-specific Person write loop.

Each logical request retains one SERIALIZABLE/idempotent transaction; in other words, each logical registration has its own `SERIALIZABLE` transaction. The canonical Human Authoring service resolves/reuses/creates reviewed entities and Sources, applies the reviewed Person domain, persists NamuWiki state, and creates the Stage 2 Activity inside that same transaction. The immutable Human Authoring ledger records the requested domain review, resulting canonical domain, and disposition, including explicit null HOLD; registration does not add a second Person-domain audit write. Conflicting existing non-null domain fails closed; immutable replay must not revert later domain edits.

For cohorts: prepare independently, run one `preflight_batch`, isolate BLOCKED requests, apply READY requests through one governed batch while retaining independent request transactions, and keep valid sibling commits even when another request is blocked. Use one registration PR/Authoring Apply cycle rather than one per Person.

## PUBLISH/VERIFY

Authoring persistence and Runtime publication are separate facts.

A successful Human Authoring transaction plus immutable ledger/result snapshot proves the Authoring write. **Never verify a just-written Activity through public Runtime before Runtime compile.** Runtime is a compiled projection; pre-compile public verification creates a circular dependency.

After the Authoring batch reaches its resulting authoritative state:

1. run **one Runtime compile for the resulting authoritative state**;
2. let the Runtime compiler classify eligibility honestly;
3. verify the intended Runtime/public state once;
4. finish with the applicable terminal state and STOP.

A valid Authoring Activity may be intentionally excluded from Runtime because relation, temporal, ongoing-verification, or provenance readiness remains unresolved. Do not coerce historical data to avoid `VERIFIED_AUTHORING_ONLY`.

## Bulk default

`bounded SCREEN → parallel REVIEW → one cohort preflight → one governed Human Authoring batch → one Runtime compile → one terminal disposition/read-back pass → STOP`

Optimize transport/deployment/compile cycles, not historical correctness or transaction isolation.

## Fail-closed invariants

Never duplicate canonical identity, infer Person domain from Role, silently overwrite a conflicting domain, fabricate chronology, conflate unknown with ongoing, create placeholder Place facts, force Spatial work for already-bound Polities, use public Runtime as pre-compile proof of an Authoring write, create redundant registration APIs/wrappers, or erase successful sibling commits because another batch item was blocked.

At a shared-write boundary owned by another linear task, finish all non-conflicting research/code/tests/preparation and then obey the current repository single-writer queue contract rather than racing the owner.
