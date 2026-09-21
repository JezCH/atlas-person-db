# ATLAS Work Execution Protocol — Lean v1

> Status: authoritative project-wide execution rule.
>
> Goal: preserve historical/data/runtime safety while removing procedural work that does not directly reduce risk.
>
> This file supersedes older queue/release/process rules wherever they conflict. It does **not** weaken fail-closed security or invariants already enforced by a canonical writer/endpoint.

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

## 3. Queue only at a real shared-write boundary

Research, review, local reasoning, branch work, manifests, migrations, code, tests, and CI preparation do NOT require queue ownership.

Queue/claim is required only for an actual conflicting shared mutation such as:

- merge/update of the same repository resource where concurrent changes would conflict;
- schema migration;
- Production/runtime mutation using the same writer or table contract;
- release/freeze operation that must be exclusive.

A task lifetime is never a lock.

If another worker owns a conflicting shared mutation:

```text
enqueue/update exact task
→ continue non-conflicting prework
→ checkpoint when no more useful prework exists
```

No STANDBY, WAITING, or repeated lock polling.

## 4. Resource-scoped concurrency

The project does not have one global NONCORE writer.

Independent resources may progress concurrently. Typical resource classes include:

- Person/Activity authoring
- representative_domain
- NamuWiki external references
- Spatial taxonomy/index
- UI/product code
- CORE schema/runtime infrastructure

Two tasks block each other only when they mutate the same concrete resource/contract or when one explicitly depends on the result of the other.

`both touch main` is not a conflict by itself.

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

## 10. Active-only operational boards and historical archive

GitHub issue comments and merged PRs are durable audit history. They are **not** the operational status surface.

For #917 and #977, the issue body is the authoritative **ACTIVE ONLY** board:

- list only genuinely non-terminal work and exact dependencies;
- remove a task from the body in the same transition that makes it `DONE`, `SUCCESS`, `SUPERSEDED`, or `CANCELLED`;
- never maintain a growing "completed work" section in the active body;
- preserve completion evidence in the historical comment/PR record instead of copying it forward;
- keep blocked work only when the blocker is still current and exact.

Each active board SHOULD carry an `Archive cutoff` comment ID. During normal status discovery:

- do not scan comments at or before that cutoff;
- follow older evidence only when an active row explicitly references it or the body is proven inconsistent with current state;
- an old `READY`, `BLOCKED`, `CLAIMED`, or `IN_PROGRESS` comment cannot reactivate a task after later terminal/superseding evidence;
- re-entry requires the exact task/case plus new current evidence, then an explicit current-board update.

Open PR inventory follows the same rule: close historical diagnostic, superseded, or replaced PRs once their useful evidence is preserved elsewhere. An old open PR must not remain as a false signal of active work.

Branch inventory is **historical storage, not a work queue**. During normal status discovery:

- inspect only the head branches of currently open PRs or branches explicitly referenced by an ACTIVE board row;
- do not enumerate historical branch names to reconstruct project status;
- a merged/closed/discarded branch does not represent active work merely because its ref still exists;
- when branch deletion is unavailable, a conclusively disposable merged/temporary branch may be normalized to exact current `main` so it carries zero hidden code delta;
- never normalize or discard a branch whose unique commits have not been positively classified as obsolete or already materialized elsewhere.

Closed `REFERENCE ARCHIVE`, `CLOSED ARCHIVE`, and explicitly parked/non-active issues are also not status surfaces. Reopen or promote them only when fresh evidence creates a concrete actionable task.

A new worker answers "what is active?" from the active board first: full historical fold is exceptional recovery work, not normal bootstrap.

## 11. Registration completeness without repeated cleanup

When a new canonical obligation exists, new applicable records should handle it in the same registration lifecycle so legacy backfill debt does not keep growing.

However, this does not require every subsystem to become one giant synchronous transaction.

Use:

```text
review once
→ materialize required companion payloads
→ execute each independent writer in the same completion chain
→ batch verification
```

Do not reopen the same Person repeatedly for domain/NamuWiki/Spatial if those decisions were already made during registration.

## 12. Forbidden procedural waste

Do not:

- replay hundreds of queue comments when a valid checkpoint exists;
- re-audit the entire DB/repo after unrelated `main` changes;
- wait for a global writer when the resource is independent;
- hold queue ownership while only researching or waiting for CI;
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
4. older queue/release/process wording.

Older rules that impose broader locking, whole-project revalidation, duplicate deployment proof, or mandatory full event replay are superseded.

## 14. Operating maxim

> Minimum sufficient verification. Maximum safe forward progress.

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
→ canonical authoring payload
→ Authoring commit
→ Authoring read-back
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
- Registration workers serialize only where they actually share an authoritative writer/resource.
- A growing APPROVED backlog is valid queue state, not a reason to stop review.

### Handoff rule

The durable source of truth for a reviewed decision is the Lane A checkpoint referenced by the Lane B queue entry.

The handoff itself should contain only enough information to identify the approved candidate and locate that checkpoint. Do not spend time reformatting or duplicating the review into a second registration document.

Lane B reads the referenced checkpoint, prepares the canonical authoring payload, and may update registration state/resulting Person UUID. It must not silently rewrite the reviewed historical judgment. If the judgment changes, create a new review revision/checkpoint and reference that revision.

This dual-lane protocol is the default for future Person candidate work.
