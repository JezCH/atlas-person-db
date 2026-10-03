# ATLAS Work Execution Protocol — Optimistic Concurrency v2

> Status: authoritative project-wide execution rule.
>
> Goal: maximize safe parallel throughput while making stale, conflicting, duplicated, or ambiguous authoritative writes fail closed at the narrowest possible resource boundary.
>
> This file supersedes older queue/release/process/single-writer/linear-gate rules wherever they conflict. It does **not** weaken fail-closed security or invariants already enforced by a canonical writer/endpoint.
>
> **Project concurrency maxim:** work is parallel; authority is singular; commit is resource-scoped.

## 1. Default behavior: do the work, not the ceremony

A worker should spend the minimum time needed to locate the owned resource and then make forward progress.

Default sequence:

```text
resume point or exact target
→ targeted current-state check
→ implement/review
→ focused test
→ shared mutation only if needed
→ one completion verification
→ durable checkpoint
```

Do not turn a small change into a repository-wide audit, queue replay, release train, or Production investigation unless the change actually crosses those boundaries.

## 2. Resume rule for every new conversation

A new worker MUST NOT reconstruct the whole project before continuing a known task.

Use this order:

1. user-provided resume point, if present;
2. current task's latest durable checkpoint/snapshot;
3. exact file/symbol/task search;
4. only if those are inconsistent, inspect a wider history.

Hard rule:

- no full #917/#977 comment replay when a valid current snapshot/checkpoint exists;
- no whole-repo re-audit merely because `main` moved;
- no repeated Production polling to discover whether something changed;
- inspect only the resource/path/table/workflow owned by the task plus direct dependencies.

If the exact path is unknown, search for the exact symbol/file contract and proceed once found. Do not keep expanding the search surface after the implementation location is known.

## 3. Parallel by default; a work unit is not a lock

No task, issue, lane, CORE unit, PR, branch, writer family, or conversation receives exclusive project ownership merely by starting work.

Research, review, local reasoning, branch work, manifests, migrations, code, tests, CI preparation, and independent writer calls proceed concurrently by default.

Hard rules:

- **a work unit is a completion boundary, not a concurrency boundary;**
- task lifetime is never a lock;
- `same repository`, `same main branch`, `same issue`, `same CORE unit`, `same table`, or `same writer family` is not by itself a conflict;
- no worker waits merely because another worker is active;
- no STANDBY, WAITING, global claim, queue ownership, or repeated lock polling;
- The project does not have one global NONCORE writer.
- if useful non-conflicting work exists, continue it.

A conflict exists only when concurrent mutations can invalidate the same concrete resource, semantic identity, schema/runtime contract, repository update precondition, or explicitly declared dependency.

### Active artifact pointer, not task ownership

For substantial work, the current-state surface MAY expose one lightweight pointer:

```text
task_key
→ active artifact / branch / PR
→ base revision
→ touch-set summary
```

The pointer exists to prevent accidental duplicate reconstruction. It is **not a lock** and does not prohibit other workers from reviewing, testing, or contributing.

If a replacement artifact becomes authoritative, update the pointer atomically and mark the older artifact `SUPERSEDED` or otherwise non-active. A stale artifact never blocks current work merely because its branch or PR still exists.

## 4. Optimistic resource-scoped commit protocol

Every authoritative mutation follows this sequence:

```text
PARALLEL PREPARE
→ RESOURCE PREFLIGHT
→ SHORT ATOMIC COMMIT
→ ONE COMPLETION VERIFY
```

### Phase A — PARALLEL PREPARE

Do all useful research, review, implementation, test preparation, and payload construction without a shared-work lock.

Before authoritative mutation, declare the smallest practical **touch set** and the state the change was prepared against.

Examples:

- canonical data: exact UUIDs plus semantic identity keys/direct dependencies;
- repository change: exact paths plus current blob/base SHA;
- schema change: exact migration objects/contracts;
- Runtime activation: exact projection/version/activation pointer.

Do not widen a touch set to a whole subsystem merely because that is easier to describe.

### Phase B — RESOURCE PREFLIGHT

Immediately before mutation, compare the prepared expectation with current authoritative state.

Use the strongest existing resource-appropriate precondition, such as:

- exact reviewed before-state;
- row/revision/version/digest;
- UUID + semantic-key uniqueness state;
- file blob SHA / expected branch head;
- schema object/version state;
- compiler/runtime generation or activation revision.

Where a governed operation can detect multiple independent blockers safely, preflight SHOULD aggregate and return all detectable blockers in one dry run instead of forcing one Production round-trip per blocker.

Preflight acquires no task-lifetime lock.

Result:

```text
MATCH
→ commit

MISMATCH
→ do not write
→ refresh only the conflicting resource/direct dependency
→ preserve all unrelated completed work
→ re-preflight
```

A mismatch must never trigger whole-project replay, full historical re-review, or automatic branch reconstruction.

A full historical fold is exceptional recovery work, not normal bootstrap.

### Phase C — SHORT ATOMIC COMMIT

The canonical writer must re-check the mutation precondition at the actual write boundary, inside the same transaction when possible or immediately before an atomic repository/ref update.

Required properties where applicable:

- fail closed on stale/mismatched expected state;
- deterministic resource lock ordering;
- stable idempotency/request key for the same approved semantic change;
- same idempotency key + same payload = replay/no duplicate effect;
- same idempotency key + different payload = fail closed;
- no partial authoritative mutation after a failed precondition.

Only the overlapping concrete resource is serialized, and only for the shortest mutation window required by the underlying database/repository/runtime primitive.

If an existing canonical writer has a stricter safety contract, keep it. If a writer cannot yet enforce stale-write safety at its mutation boundary, that is architectural debt, not justification for a project-wide single-writer queue.

### Phase D — ONE COMPLETION VERIFY

Read back or otherwise prove the changed invariant once at the boundary that owns it, preferably in a batch.

Release the resource immediately after commit. No worker retains ownership while waiting for CI, deployment, human review, or unrelated follow-up.

### What may serialize

**Queue only at a real shared-write boundary.**

Examples:

- the same Person/Polity/Activity UUID or semantic identity being changed incompatibly;
- the same exact repository path/ref update with incompatible expected SHA;
- the same schema object/migration boundary;
- the same Runtime activation pointer/generation;
- a destructive lifecycle operation and another mutation of the same dependent resource set.

### What must not serialize globally

Examples:

- different Persons through the same canonical writer when the writer supports independent safe transactions;
- unrelated Polities;
- Person review while Person apply is running;
- UI work while canonical data work is running;
- two branches that touch disjoint files/contracts;
- research/design/test preparation during another worker's commit.

## 5. Delta-only integration

When `main` advances, do not restart the task.

Before merge/apply, check only:

- changed paths owned by the task;
- schema/table/writer contracts the task directly depends on;
- exact conflict introduced by the new delta.

If there is no relevant delta, continue without re-reviewing historical content or rebuilding completed evidence.

## 6. Microbatch review, superbatch release

For long historical/content work:

- review/checkpoint in small safe units, normally 5–12 records;
- accumulate reviewed results durably;
- apply/release as the largest safe superbatch supported by the same writer and contract.

Do not pay PR/CI/deploy/read-back cost for every microbatch unless isolation is required by a real conflict or failure risk.

### Conversation-length safety: close units before expanding

For every task that may run long enough to be interrupted by conversation/tool limits, the worker MUST choose an independently closable work unit **before** expanding into the full task.

Default unit examples:

- 5–12 reviewed records;
- one microbatch;
- one feature plus its focused verification;
- one audit slice with a durable result;
- one correction plus exact read-back.

The chosen work unit limits what one worker promises to finish before reporting. It does **not** reserve that task, subsystem, writer, issue, branch, or resource against other workers.

Execution rule:

```text
choose smallest useful closable unit
→ finish that unit
→ write a durable checkpoint/commit/comment/result
→ only then start the next unit
```

Do not spend the whole conversation only discovering, auditing, or preparing a large task when a smaller finished unit can be produced first.

If the task is taking longer than expected, **shrink the unit immediately** rather than continuing an oversized batch.

Whenever work stops before the whole task is complete, the durable record MUST state both:

1. the last fully completed unit;
2. the exact next incomplete starting point.

This is the default project-wide behavior and does not require the user to repeat it in each conversation.

### Response barrier: close the user turn after each completed work unit

Unless the user explicitly requests multiple work units to be completed continuously in the same response, **one completed work unit is the maximum unit of execution for one user turn**.

After the chosen unit reaches its actual completion boundary — including the unit's required verification, checkpoint/commit/comment, merge, read-back, or other stated completion proof — the worker MUST:

```text
finish the chosen work unit completely
→ write its durable completion record
→ stop all work on the next unit
→ report the completed result to the user in the final response
→ end the turn
```

Hard rules:

- do **not** automatically start the next microbatch, record range, PR, queue item, audit slice, or feature after the current unit is complete;
- do **not** pre-open, pre-review, pre-claim, partially edit, or otherwise begin the next unit before the user sends the next message;
- the final response MUST state the unit that was completed, the completion/verification result, and the exact next resume point when remaining work exists;
- a durable checkpoint is **not** a substitute for the user-visible completion response; both are required;
- do not stop halfway through the chosen unit merely to satisfy this barrier — finish that unit to its real completion condition first;
- the next unit begins only after a new user message such as `continue`, `이어가`, or an equivalent instruction.

Exception: if the user explicitly instructs the worker to continue across multiple units in the same response (for example, "continue through multiple batches" or "keep going until this whole set is complete"), the worker may cross the response barrier for that request. The exception applies only to that explicit request and does not become the new default.

This response barrier overrides the general preference for maximum forward progress whenever continuing would cross from a completed work unit into a new one without a new user turn.

## 7. Verification proportional to risk

### Durable validation rule

Persistent tests and CI gates must verify durable invariants, not point-in-time project snapshots.

Prefer contract-level properties that remain meaningful as valid project state evolves, such as:

- identity uniqueness and referential integrity;
- schema and taxonomy validity;
- allowed state transitions and parent/child consistency;
- deterministic compilation from canonical inputs;
- expected-before-state checks for reviewed mutations;
- fail-closed rejection of stale, conflicting, destructive, or unauthorized writes.

Do not make long-lived gates depend on transient facts merely because they were true during one migration or review wave, including:

- a specific PR, issue, branch, release-train, or migration phase name;
- an exact current record count or batch membership unless that count itself is a contractual invariant;
- a particular file/shard owning a record when ownership is implementation detail rather than contract;
- the assumption that a reviewed item must remain in its historical pre-migration state forever.

If a one-time migration needs exact snapshot acceptance, keep that evidence scoped to the migration/checkpoint. Once valid state advances, retire or replace that point-in-time gate with the durable invariant it was meant to protect.

When correct current state has advanced beyond a stale test assumption, fix the stale test or contract if the durable invariant is still satisfied. Do not mutate correct data merely to satisfy obsolete historical test state.

### Low-risk content/data mutation using an unchanged governed writer

Required:

- exact target/UUID or deterministic resolver;
- the writer's built-in validation/security contract;
- one post-write read-back of the changed records, preferably batched.

Do **not** add extra process merely by habit:

- whole runtime smoke suites;
- unrelated schema checks;
- repeated read-backs;
- a second external deployment/SHA proof beyond what the canonical writer itself already enforces.

If the canonical writer/endpoint itself fail-closes on exact deployed SHA, OIDC identity, environment, or other transport proof, that remains mandatory until the writer contract is deliberately changed through CORE.

### Code/UI change without Production data mutation

Required:

- focused tests for affected code;
- repository-required CI if merging.

Production deployment verification is needed only when the user/task requires verifying live behavior.

### Schema/runtime/new-or-changed writer contract

Keep the strong gate:

- exact reviewed code/migration;
- required CI;
- migration/replay safety;
- exact deployed version when the live mutation depends on that code;
- focused Production smoke/read-back.

### Destructive or identity-changing operation

Keep fail-closed protections, explicit evidence, rollback/replay plan, and exact postcondition verification.

## 8. Exact-SHA rule is scoped, not duplicated

Exact SHA proof remains mandatory wherever the canonical architecture/writer requires it or where correctness depends on code introduced by that release, including schema/runtime cutovers or mutation-transport changes.

The Lean rule removes **duplicate external ceremony**, not built-in transport safety. A worker must not independently re-prove unrelated repository/deployment state after the canonical writer has already provided the required exact-SHA/security proof.

## 9. Completion verification happens once

A task is complete when the intended state is proven once at the correct boundary.

Examples:

- data batch: changed rows read back correctly;
- code: required CI passes and merge completes;
- live UI fix: deployed target behavior is verified;
- schema/runtime: migration + relevant smoke/postconditions pass.

Do not repeatedly re-prove completed layers that the task did not alter.

## 10. Active-only operational state and historical archive

GitHub issue comments, closed issues, merged/closed PRs, and old branches are durable audit history. They are **not** current work authority.

For CORE, **#917 body is the only active CORE status surface**. The former #977 NONCORE board is closed historical evidence and MUST NOT be treated as a live queue, claim surface, or blocker.

For any other work board, treat it as operational only when the issue is currently open **and** its current body explicitly declares itself active/current. Historical comments cannot grant ownership or reactivate work.

Active current-state surfaces should contain only genuinely non-terminal work, exact dependencies, and—when useful—the current active artifact pointer.

Rules:

- remove terminal work from an active body in the same transition that makes it `DONE`, `SUCCESS`, `SUPERSEDED`, or `CANCELLED`;
- never maintain a growing completed-work ledger in the active body;
- preserve completion evidence in PRs/Git history/comments instead;
- an old `READY`, `BLOCKED`, `CLAIMED`, `IN_PROGRESS`, queue position, or single-writer comment cannot block or reactivate current work;
- re-entry requires fresh current evidence plus an explicit active-state update;
- do not scan hundreds of historical comments when the active body/checkpoint is coherent.

Open PR inventory follows the same rule. Exactly one artifact should be marked active for one task key when duplicate reconstruction would otherwise cause confusion. Other overlapping artifacts must be explicitly classified as review-only, parked, or superseded; their mere existence is never ownership.

Branch inventory is historical storage, not a work queue. Inspect only branches referenced by current active artifacts or exact task evidence. Never reconstruct project status from branch names.

A new worker answers “what is active?” from current authoritative state first. Historical folding is exceptional recovery work.

### Person registration queue: one canonical DB authority

The Person registration backlog has one query surface:

```text
GET /api/atlas-read?__atlas_read_surface=registration-queue
```

Its canonical authority is the single DB dataset:

```text
atlas_v2.person_candidate_registration_states
```

Current membership is defined by exactly one invariant:

```sql
person_id IS NULL
```

A successful registration records the canonical Person UUID on that same candidate row. The read surface does not scan Person names, aliases, GitHub issue comments, historical queue comments, or the bootstrap JSON to decide current membership.

`data/core/person-registration-queue-source.v1.json` is retained only as the historical migration/bootstrap artifact for the 2026-10-03 cutover. It is not a live authority and is never dual-written with the DB.

Review revisions and registration lifecycle metadata may remain for their own audit/transaction purposes, but they do not participate in the current-queue predicate.

## 11. Registration completeness without repeated cleanup

When a new canonical obligation exists, new applicable records must handle it in the same registration lifecycle so legacy backfill debt does not keep growing.

However, this does not require every subsystem to become one giant synchronous transaction.

Use:

```text
review once
→ materialize required companion payloads
→ execute each independent writer in the same completion chain
→ batch verification
```

### Mandatory deceased-status closure for every new Person

Current life status is a **registration obligation**.

For every candidate that would create a new canonical Person identity:

- verify whether the person is currently living;
- `living` → `EXCLUDE` / `REJECTED`; no Person write is allowed;
- `deceased` → carry the reviewed `life_status`, `life_status_checked_at`, and `life_status_basis` into the registration payload;
- unresolved current life status → keep the candidate `HOLD` / `BLOCKED`; it MUST NOT be marked `REGISTERED`, `APPLIED`, or `VERIFIED_AUTHORING_ONLY`.

Do not substitute Activity chronology for this review. `activity_end`, `ongoing`, representative Activity year, office status, retirement, domain, or a birth-year cutoff do not establish present survival status. A birth-year threshold may only prioritize which candidates are checked first.

Existing Person reuse may continue without a new deceased attestation because it does not create a new Person identity. The canonical Person creator remains fail-closed for every new insert, including Human Authoring, native authoring, and direct Admin identity creation.

### Mandatory NamuWiki closure for every new Person

NamuWiki review is a **registration obligation**, not a later cleanup lane.

For every newly registered Person, and every existing Person whose NamuWiki state has never been reviewed:

- resolve exactly one reviewed NamuWiki disposition during the same registration lifecycle: `linked` or `not_found`;
- search external indexes first and verify same-person identity; never guess a URL or convert an unchecked state into `not_found`;
- if Lane A did not already finish this review, Lane B must finish the bounded NamuWiki review before materializing the authoring request;
- if an exact `linked` / `not_found` decision cannot be made, keep that candidate `QUEUED` or `BLOCKED`; it MUST NOT be marked `REGISTERED`, `APPLIED`, or `VERIFIED_AUTHORING_ONLY`;
- do not create normal registration debt that requires a separate later NamuWiki linking pass;
- an existing Person with a live reviewed `linked` or `not_found` state reuses that state without re-searching.

`review_deferrals.namuwiki` is retired for new registration manifests. Historical immutable pre-cutover requests may remain replay-compatible, but they are not templates or authorization for new registrations.

Do not reopen the same Person repeatedly for domain/NamuWiki/Spatial if those decisions were already made during registration.

## 12. Forbidden procedural waste

Do not:

- replay hundreds of queue comments when a valid checkpoint exists;
- re-audit the entire DB/repo after unrelated `main` changes;
- create or revive a task-level/global single-writer gate;
- wait merely because another worker uses the same issue, CORE unit, writer family, table, repository, or `main` branch;
- hold claim/queue ownership while only researching or waiting for CI;
- rebuild an already active task artifact from scratch when its current delta can be reused;
- let stale/superseded PRs or old queue comments act as blockers;
- create one PR/release per 5–12 reviewed records by default;
- add deployment/SHA proof beyond the canonical writer's own required gate;
- repeatedly poll writer/deployment state;
- re-run broad smoke suites for unrelated changes;
- reopen settled historical judgments without new conflicting evidence;
- invent extra process because the exact next implementation step is already known.

## 13. Priority rule when instructions conflict

Use this precedence:

1. historical/data correctness and no-fabrication rules;
2. security plus destructive/schema/runtime safety controls enforced by canonical code/contracts;
3. this Lean execution protocol;
4. older queue/release/process/single-writer/linear-gate wording.

Older rules that impose task-level ownership, broader locking, global/CORE/NONCORE single-writer gates, whole-project revalidation, duplicate deployment proof, mandatory full event replay, or wait-for-your-turn semantics are superseded. Historical documents may preserve those rules as evidence but cannot govern current execution.

## 14. Operating maxim

> Work is parallel. Authority is singular. Commit is resource-scoped. Minimum sufficient verification; maximum safe forward progress.

If a procedure does not materially reduce the risk of the specific change being made, it should not block the work.


## 15. Person candidate dual-lane pipeline

Person candidate **review** and canonical **registration/apply** are separate concurrent lanes joined by a reviewed handoff packet.

### Lane A — Candidate Review

Purpose: continuously discover and evaluate candidate people without performing authoritative Person/Activity Production mutation.

Allowed work:

- candidate discovery and de-duplication against current canonical Persons;
- historicity and timeline/non-timeline judgment;
- registration-value review;
- representative_domain review;
- proposed Activity facts and source gathering;
- NamuWiki availability review;
- Polity/spatial-readiness notes;
- APPROVED / HOLD / REJECTED / DUPLICATE_EXISTING decision.

A review unit normally contains 5–12 candidates. Each completed unit must publish a durable review checkpoint.

An **APPROVED** candidate does **not** require a separately rewritten registration packet.

Lane A's durable review checkpoint is the source of truth. Handoff should be nearly zero-cost:

```text
APPROVED_HANDOFF
- candidate_id / name
- review_checkpoint
```

If the review checkpoint already contains the reviewed identity, historicity, timeline disposition, domain decision, proposed Activities, sources/provenance, NamuWiki disposition, spatial-readiness notes, and review notes, Lane A MUST NOT copy those fields into a second packet just for Lane B.

Lane B follows the checkpoint reference and reads the reviewed material directly. Unknown facts remain unknown; do not fill gaps merely to make a handoff object look complete.

### Lane B — Registration Apply

Purpose: consume only Lane A candidates whose `review_state=APPROVED` and perform authoritative registration using the current canonical writer/contracts.

Before write, Lane B performs only the minimum freshness check needed for safe application:

1. exact duplicate / already-registered check;
2. stale or conflicting canonical identity check;
3. current authoring-contract compatibility check.

It does **not** redo the candidate's registration-value review unless new conflicting evidence appears.

Normal completion chain:

```text
APPROVED candidate + review checkpoint reference
→ read reviewed checkpoint
→ exact duplicate/current-state check
→ ensure reviewed NamuWiki disposition (reuse live reviewed state or finish bounded review)
→ canonical authoring payload
→ Authoring commit
→ Authoring read-back including NamuWiki state
→ Runtime compile/disposition
→ Runtime read-back when Runtime-eligible
→ REGISTERED or VERIFIED_AUTHORING_ONLY
```

### Independent state axes

Review state and registration state are distinct. Do not overload one status field to represent both.

Review states:

- `PENDING`
- `IN_REVIEW`
- `APPROVED`
- `HOLD`
- `REJECTED`
- `DUPLICATE_EXISTING`

Registration states:

- `NOT_READY`
- `QUEUED`
- `APPLYING`
- `REGISTERED`
- `VERIFIED_AUTHORING_ONLY`
- `BLOCKED`
- `NOT_APPLICABLE`

Typical transitions:

```text
PENDING / NOT_READY
→ IN_REVIEW / NOT_READY
→ APPROVED / QUEUED
→ APPROVED / APPLYING
→ APPROVED / REGISTERED
```

`HOLD`, `REJECTED`, and `DUPLICATE_EXISTING` normally pair with `NOT_APPLICABLE`.

### Concurrency rule

Lane A and Lane B are expected to run at the same time.

- Lane A does not wait for the registration backlog to drain.
- Lane B does not block new review work.
- Multiple review workers may operate on disjoint candidate sets.
- Registration workers do not serialize merely because they call the same writer. They serialize only for overlapping concrete resources or a narrower safety constraint that the canonical writer itself must enforce.
- A growing APPROVED backlog is valid queue state, not a reason to stop review.

### Handoff rule

The durable source of truth for a reviewed decision is the Lane A checkpoint referenced by the Lane B queue entry.

The handoff itself should contain only enough information to identify the approved candidate and locate that checkpoint. Do not spend time reformatting or duplicating the review into a second registration document.

Lane B reads the referenced checkpoint, prepares the canonical authoring payload, and may update registration state/resulting Person UUID. It must not silently rewrite the reviewed historical judgment. If the judgment changes, create a new review revision/checkpoint and reference that revision.

This dual-lane protocol is the default for future Person candidate work.
