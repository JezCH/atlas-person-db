# ATLAS Historical Person Registration SOP — Lean Path v2

This file is the operational source of truth for ordinary reviewed historical-person registration.

The rule is simple: **registration is a bounded data operation, not a repository/deployment investigation.** Keep the safety gates that protect `atlas_v2`; remove repeated discovery, repeated reads, full-dataset inspection, comparable-person chasing, unnecessary deployment checks, and retry-only pull requests.

## 1. Completion criterion

A registration is complete only when authoritative Production read-back confirms the intended Person and Activity.

A merged PR, a green CI check, a Vercel deployment, or an Apply workflow starting is **not** completion by itself.

## 2. Safety gates that are never removed

Every ordinary registration keeps these invariants:

- reviewed historical identity, chronology, relation, Role, Polity, and at least one real Source;
- explicit NamuWiki review for a new `atlas-human-authoring/v1` Person: exact `linked` document or explicit `not_found`;
- bounded Production Person duplicate check before creating a new Person;
- normalized Person/Polity/Role identity reuse when an exact live identity exists;
- active Relation Type and Period Basis resolution;
- PostgreSQL `SERIALIZABLE` transaction per request;
- semantic Activity duplicate enforcement;
- immutable `request_id` and idempotent replay;
- Production readiness / authorization boundaries enforced by the server;
- authoritative Production read-back after the write.

Historically real discontinuities are separate Activities. Never invent an exact year, month, or day merely to satisfy a request contract.

## 3. The normal five-step path

Ordinary registration has only five top-level stages:

```text
REVIEWED
→ PREFLIGHT_OK
→ SUBMITTED
→ APPLIED
→ VERIFIED
```

Git branches, PRs, CI jobs, workflow runs, and deployments are transport details, not additional historical-registration stages.

### Step 1 — REVIEWED

Establish only the facts needed to author the record:

- canonical English Person name;
- Korean display name when the Person is new;
- Polity;
- relation type;
- Role when applicable;
- period basis;
- reviewed start/end boundaries and their certainty/calendar values;
- evidence confidence;
- at least one real Source;
- NamuWiki result: exact linked Person document or explicit `not_found`.

Do not expand ordinary registration into a general audit of the repository, deployment stack, or unrelated Persons.

### Step 2 — PREFLIGHT_OK: one bounded Production pass

#### Person duplicate check

Use the Person search surface only for the canonical name and materially distinct aliases needed to rule out a duplicate:

```text
/api/atlas-read?__atlas_read_surface=person&q=<person-name>
```

Rules:

- If the intended Person and Activity already exist, stop.
- If the Person exists but the Activity is missing, reuse the Person and author only the missing Activity.
- Once an exact Production Person has been identified, do not keep trying additional spellings merely for reassurance.
- Do not re-run the same search between GitHub steps unless Production could actually have changed.

#### Polity / Role lookup

Use the bounded catalog surface:

```text
/api/atlas-read?__atlas_read_surface=catalog&kind=polity&q=<polity-name>
/api/atlas-read?__atlas_read_surface=catalog&kind=role&q=<role-name-or-code>
```

These lookups may be performed together.

If an exact identity exists, reuse it. If no exact identity exists and the reviewed historical entity is legitimate, allow Human Authoring to create the new identity.

**Do not search for a comparable Person merely to discover their Polity or Role when the bounded catalog already answers the identity question.** Do not dump the full Production dataset. Do not keep searching indefinitely just because the correct new identity is absent.

The server remains authoritative for final identity collision and semantic duplicate enforcement at write time.

### Step 3 — SUBMITTED

Use one `atlas-human-authoring/v1` request for one logical registration.

Preferred transport:

- use the normal Admin Human Authoring path when it is available to the operator;
- use the reviewed GitHub manifest path only as the operational fallback when direct Admin submission is unavailable or an auditable manifest review is intentionally required.

A request must use one stable `request_id`. A retry of the same logical request reuses the same request and request id.

Every new Human Authoring Person request must contain exactly one NamuWiki decision at `external_references.namuwiki`:

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

Do not perform a separate NamuWiki write after registration; the reviewed decision is part of the same authoring request.

#### GitHub fallback only

When the GitHub fallback is used:

1. read latest `main` **once, immediately before creating the working branch**;
2. create one `agent/...` branch;
3. add exactly the required registration manifest(s), with no unrelated code/UI changes;
4. open one PR;
5. require the repository's mandatory `test` check;
6. squash merge when green.

For `authoring/requests/*.json`-only work, the authoring-only integrity fast path is the expected CI path. Do not voluntarily run P10, P11, full schema rehearsal, or Human Authoring Operational Parity again unless the changed files or a concrete failure require them.

### Step 4 — APPLIED

For direct Admin authoring, the successful authoring transaction is the Apply step.

For the GitHub fallback, use the normal `ATLAS Authoring Apply` path after merge.

For manifest-only registration:

- do not inspect Preview deployments;
- do not poll Vercel merely because `main` changed;
- do not wait for or diagnose a deployment unless Authoring Apply reports a concrete runtime/readiness/SHA error;
- do not perform generic GitHub/Vercel tool discovery after the request has already reached this stage.

If Apply reports a concrete runtime boundary problem, diagnose only that boundary and then resume the same request.

### Step 5 — VERIFIED

Perform one bounded Production Person read using the canonical Person name.

Verify:

- exactly one intended Person identity;
- intended Korean/English names;
- intended Activity;
- Polity;
- Role;
- relation type;
- period basis;
- temporal boundaries;
- explicit NamuWiki decision;
- no duplicate or partial Activity.

If the bounded Person result already exposes all required completion fields, stop. Use Person detail only when a real ambiguity or provenance-specific verification requires it.

Do not run additional alias queries after an exact verified row has been found merely to produce more confirmation.

## 4. Retry policy — reuse, never requeue

If the request content is correct but Apply fails because of a server bug, deployment timing, transient conflict, or another batch item:

1. fix the concrete runtime problem only if one exists;
2. replay the same immutable request;
3. for GitHub manifests, use `ATLAS Authoring Apply` → `workflow_dispatch` with the existing manifest path.

Do **not** create:

- a copied manifest;
- a timestamped replacement;
- a new request id;
- a new branch/PR whose only purpose is to make the unchanged request run again.

Create a new request/version only when the reviewed historical content itself changes.

## 5. Explicitly deleted from the normal registration process

The following are **not** normal registration steps and should not be performed unless a concrete failure makes one necessary:

- repeated discovery of GitHub/Vercel tool capabilities;
- repository-wide status inspection before every action;
- repeated reads of `main` SHA; only the GitHub fallback write boundary needs one fresh read;
- full Production dataset export/dump to resolve one Person, Polity, or Role;
- searching a similar/comparable Person just to infer an identity already resolvable through catalog lookup;
- Preview-deployment inspection for data-only registration;
- post-merge Vercel polling when Authoring Apply has not reported a deployment problem;
- manually re-running P10/P11/full schema/parity checks for a manifest-only PR;
- separate NamuWiki persistence after Human Authoring;
- repeated Production read-back with multiple spellings after the canonical row is verified;
- requeue-only PRs for unchanged requests.

## 6. Failure handling is narrow and local

Only move backward when a concrete gate fails:

- historical evidence problem → return to `REVIEWED`;
- duplicate/identity finding changes the request → return to `REVIEWED`;
- manifest validation failure → fix the same request/branch;
- required `test` failure → fix the same branch;
- runtime/readiness/SHA failure → diagnose that specific boundary, then retry the same request;
- transient Apply failure → replay the same request;
- Production read-back mismatch → registration remains incomplete until the concrete mismatch is resolved.

Do not restart generic repository, Production, or deployment discovery because one later-stage gate failed.

## 7. Practical decision rules learned from registration smoke tests

- **No catalog match is not a reason to search the whole DB.** If the historically reviewed Polity/Role is genuinely new, author it normally and let the resolver enforce collisions.
- **A comparable ruler is not an identity oracle.** Existing Persons can be useful historical references, but they are not required operational lookups for a new registration.
- **A data-only registration is not a Vercel deployment project.** Deployment state matters only when the Apply/readiness boundary says it matters.
- **The first successful canonical Production read is the stopping point.** Additional confirmation loops add latency without adding a new safety invariant.
- **Transport must not dominate the task.** The task is complete historical data in Production, not branch/PR/workflow bookkeeping.

## 8. Completion report

Report success only after `VERIFIED`.

Minimum completion report uses one of the following explicit NamuWiki outcomes:

```text
등록 완료
Person: <English> / <Korean>
Polity: <...>
Role: <...>
Period: <...>
나무위키: 연결됨 — <document_title>
Production read-back: VERIFIED
```

or:

```text
등록 완료
Person: <English> / <Korean>
Polity: <...>
Role: <...>
Period: <...>
나무위키: 문서 없음
Production read-back: VERIFIED
```

Do not infer registration success from a merged PR or deployment alone.
