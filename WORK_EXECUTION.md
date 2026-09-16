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

## 10. Current-state records, not event-log replay

GitHub issue comments are audit history, not the primary state database.

For #917 and #977:

- issue body/current snapshot holds the authoritative active frontier;
- comments preserve append-only evidence and notable transitions;
- a new worker reads the current state first and follows only the relevant task tail;
- full historical fold is exceptional recovery work, not normal bootstrap.

When active state materially changes, update the compact current-state section so the next conversation can resume directly.

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
