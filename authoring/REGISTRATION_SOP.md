# ATLAS Historical Person Registration SOP — Lean Path v3

This file is the operational source of truth for ordinary reviewed historical-person registration.

The rule is simple: **screen cheaply first, research only what survives the screen, commit once, verify once.** Registration is a bounded Production data operation, not a repository/deployment investigation.

## 1. Completion criterion

A registration is complete only when authoritative Production read-back confirms the intended Person and Activity.

A merged PR, green CI, Vercel deployment, authoring response without read-back, or workflow start is not completion by itself.

## 2. Safety gates that are never removed

Every ordinary registration keeps these invariants:

- bounded Production Person duplicate screening before expensive historical research;
- reviewed historical identity, chronology, relation, Role, Polity, and at least one real Source for every new Activity;
- NamuWiki review for a new Person or a Person whose NamuWiki status has never been reviewed;
- an already reviewed existing Person reuses its live `linked` or `not_found` NamuWiki state without re-searching it;
- normalized Person/Polity/Role identity reuse when an exact live identity exists;
- active Relation Type and Period Basis resolution;
- PostgreSQL `SERIALIZABLE` transaction per logical request;
- semantic Activity duplicate enforcement;
- immutable `request_id` and idempotent replay;
- Production readiness / authorization boundaries enforced by the server;
- authoritative Production read-back after the write.

Historically real discontinuities are separate Activities. Never invent an exact year, month, or day merely to satisfy a request contract.

## 3. The normal four-stage path

Ordinary registration has four top-level stages:

```text
SCREEN
→ REVIEW
→ COMMIT
→ VERIFY
```

Git branches, PRs, CI jobs, workflow runs, deployments, UUIDs, and internal catalog lookups are transport or implementation details, not additional historical-registration stages.

## 4. Stage 1 — SCREEN: cheapest useful check first

Do not begin full historical research before checking whether the intended Person is already in Production.

Start with only enough identity information to search reliably:

- canonical or strongly likely English name;
- materially distinct aliases only when genuinely needed to distinguish the Person.

Use the bounded Person search surface:

```text
/api/atlas-read?__atlas_read_surface=person&q=<person-name>
```

Rules:

- If the intended Person and intended Activity already exist, stop. Do not research or submit anything else.
- If the Person exists but the intended Activity is missing, reuse that Person and review only the missing Activity.
- If the Person exists, note its current NamuWiki state. `linked` or `not_found` counts as reviewed and is reused; do not search NamuWiki again merely because a new Activity is being added.
- If the Person is absent, continue to REVIEW.
- Once an exact Person is identified, do not keep trying more spellings for reassurance.
- Never dump the full Production dataset for one registration.

This stage intentionally comes before expensive research.

## 5. Stage 2 — REVIEW: research only what is actually needed

For a new Person, or for the missing Activity of an existing Person, establish only the facts needed to author that record:

- canonical English Person name;
- Korean display name when a new Person will be created;
- primary Polity under the current ATLAS political-community rules;
- relation type;
- Role when applicable;
- period basis;
- reviewed start/end boundaries and certainty/calendar values;
- evidence confidence;
- at least one real Source;
- NamuWiki result only when the Person is new or currently unreviewed: exact `linked` Person document or explicit `not_found`.

Historical research and NamuWiki research may be performed in parallel after SCREEN has established that they are necessary.

Do not expand ordinary registration into a repository audit, deployment audit, unrelated Person comparison, or whole-DB investigation.

### Polity / Role lookup policy

Human Authoring itself resolves or creates exact normalized Person/Polity/Role identities inside the authoritative transaction.

Therefore manual catalog lookup is **not a mandatory standalone step** for every registration. Use a bounded catalog lookup only when:

- the reviewed historical label is ambiguous;
- several plausible existing identities may exist;
- a naming/canonicalization decision actually needs operator review.

If the reviewed entity is clearly legitimate and there is no exact live identity, let Human Authoring create it. Do not search for a comparable ruler merely to infer a Polity or Role.

### Source reuse policy

A real Source remains mandatory. When a submitted Source has an exact canonical URL already present in Production, Human Authoring reuses that Source identity instead of creating another request-specific copy. URL-less bibliographic sources remain reviewable as separate records unless an explicit existing Source identity is supplied.

## 6. Stage 3 — COMMIT: one logical request, one atomic write

Use one `atlas-human-authoring/v1` request for one logical registration.

Preferred transport:

- normal Admin Human Authoring when available;
- reviewed GitHub manifest only as an operational fallback or when an auditable manifest review is intentionally required.

The server is authoritative for:

- exact Person/Polity/Role reuse or creation;
- Relation Type and Period Basis resolution;
- Source canonical-URL reuse;
- NamuWiki reuse/persistence;
- semantic Activity duplicate detection;
- transaction and verification boundaries.

### NamuWiki behavior

For a new or previously unreviewed Person, submit exactly one decision at `external_references.namuwiki`:

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

For an existing Person whose Production NamuWiki state is already `linked` or `not_found`, omit the new NamuWiki decision. The server reuses the existing reviewed value. A different value never silently overwrites an existing linked document; it requires separate review.

The Human Authoring transaction persists the NamuWiki decision to `person_external_references`; it is not merely authoring-ledger metadata. Do not perform a separate NamuWiki write after a successful registration.

### Batch behavior

A batch shares transport/authentication and may share read-only catalog caching, but **each logical registration has its own `SERIALIZABLE` transaction**.

Therefore:

- A success commits independently.
- B success commits independently.
- C failure rolls back C only.
- D is still attempted and may commit.
- the batch reports failure after all eligible items have been attempted.

On retry, already committed items replay idempotently and only unresolved items need new work.

### GitHub fallback only

When the GitHub fallback is used:

1. read latest `main` once, immediately before creating the working branch;
2. create one `agent/...` branch;
3. add only the required registration manifest(s), with no unrelated code/UI changes;
4. open one PR;
5. require the repository's mandatory `test` check;
6. squash merge when green;
7. use the normal `ATLAS Authoring Apply` path.

For `authoring/requests/*.json`-only work, the authoring-only integrity fast path is expected. Do not voluntarily rerun P10, P11, full schema rehearsal, or Human Authoring Operational Parity unless changed files or a concrete failure require them.

For manifest-only registration, do not inspect Preview deployments or poll Vercel unless Authoring Apply reports a concrete runtime/readiness/SHA boundary problem.

## 7. Stage 4 — VERIFY: one Production read, then stop

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
- expected NamuWiki state, whether newly written or reused;
- no duplicate or partial Activity.

If the bounded Person result exposes all required completion fields, stop. Use Person detail only when a real ambiguity or provenance-specific verification requires it.

Do not perform additional alias reads merely for more confirmation.

## 8. Retry policy — reuse, never requeue

If the logical request content is correct but Commit fails because of a server bug, deployment timing, transient conflict, or another batch item:

1. fix only the concrete failure boundary if one exists;
2. replay the same immutable request;
3. for GitHub manifests, use `ATLAS Authoring Apply` → `workflow_dispatch` with the existing manifest path.

Do not create a copied manifest, timestamped replacement, new request id, or retry-only PR for unchanged content.

Create a new request/version only when the reviewed historical content itself changes.

## 9. Explicitly deleted from the normal registration process

The following are not normal registration steps unless a concrete failure makes one necessary:

- full historical research before Production duplicate screening;
- NamuWiki re-search for an existing Person already marked `linked` or `not_found`;
- mandatory separate Polity and Role catalog lookups when the reviewed labels are unambiguous;
- full Production dataset export/dump;
- comparable-Person chasing to infer identity;
- repeated discovery of GitHub/Vercel capabilities;
- repository-wide status inspection before every action;
- repeated reads of `main` SHA;
- Preview deployment inspection for data-only registration;
- post-merge Vercel polling without a concrete Apply/runtime error;
- separate NamuWiki persistence after Human Authoring;
- repeated Production read-back after canonical verification;
- requeue-only PRs for unchanged requests.

## 10. Failure handling is narrow and local

Only move backward when a concrete gate fails:

- SCREEN finds an existing complete record → stop;
- historical evidence changes the intended record → return to REVIEW;
- identity ambiguity → perform the smallest bounded catalog/detail lookup needed;
- NamuWiki conflict with an existing linked document → separate link review, never silent overwrite;
- Source canonical URL maps ambiguously → Source duplicate review;
- manifest validation or required `test` failure → fix the same branch/request;
- runtime/readiness/SHA failure → diagnose that boundary only;
- transient Commit failure → replay the same request;
- Production read-back mismatch → registration remains incomplete until that mismatch is resolved.

Do not restart generic repository, Production, or deployment discovery because a later gate failed.

## 11. Completion report

Report success only after VERIFY.

```text
등록 완료
Person: <English> / <Korean>
Polity: <...>
Role: <...>
Period: <...>
나무위키: 연결됨 — <document_title> | 문서 없음 | 기존 검토값 재사용
Production read-back: VERIFIED
```

The stopping rule is strict: **first authoritative canonical Production verification completes the registration.**