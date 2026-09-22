# ATLAS Release Governance — Lean v2

> Status: binding release policy.
>
> `WORK_EXECUTION.md` is the project-wide execution authority. This file defines only release-specific safety. Older Stage/Train-specific release policy is historical and no longer governs ordinary current work.

## 1. Core principle

Release controls must be proportional to the actual risk of the change.

Do not convert every merge or data write into a Production release train.

Use the smallest verification set that proves the changed surface is correct, while preserving any fail-closed checks already enforced by the canonical writer/workflow.

## 2. Release classes

### Class 0 — no release boundary

Includes:

- research;
- review;
- issue/checkpoint updates;
- historical decision records;
- branch-only preparation.

No Production/deployment proof is required.

### Class 1 — ordinary content/data write through an unchanged compatible writer

Includes typical reviewed:

- Person-domain assignments;
- NamuWiki references;
- Spatial bindings/taxonomy data;
- existing-contract authoring/correction manifests.

Required:

```text
reviewed batch
→ exact identity/target validation
→ canonical writer/workflow validation
→ apply
→ one batched post-write read-back
```

Do not add a second manual deployment/SHA proof beyond what the canonical writer already enforces. If that writer currently requires exact deployed SHA/OIDC/environment proof, satisfy it; changing that writer contract is a CORE change, not a shortcut in release procedure.

### Class 2 — code/UI change

Required:

```text
focused tests
→ repository-required CI
→ merge
```

Production deployment/read-back is required only when live behavior is part of the acceptance condition.

### Class 3 — schema/runtime/compiler/writer-contract change

Required:

```text
reviewed implementation/migration
→ required CI
→ migration/replay proof
→ merge
→ canonical exact deployed-version proof when live execution depends on that code
→ focused Production verification
```

### Class 4 — destructive / identity-changing / irreversible operation

Use fail-closed execution with explicit reviewed targets, rollback/replay strategy where possible, exact preconditions, and exact postconditions.

## 3. Exact-SHA policy

Exact SHA proof is a canonical safety primitive where the architecture or writer requires it; it is not a reason to duplicate orchestration work outside that gate.

It remains mandatory for flows whose writer/workflow verifies exact deployment identity and for changes such as:

- schema migration endpoint changes;
- runtime/compiler cutover;
- mutation transport changes;
- destructive executor changes;
- live UI/API release acceptance tied to a specific commit.

Once the canonical workflow has proven the required SHA/security identity, workers do not independently repeat the same proof unless troubleshooting conflicting evidence.

## 4. Main advancement

A newer `main` does not invalidate completed review automatically.

Before integration, inspect only the task-owned paths/contracts and direct dependencies.

If the delta does not touch them, continue. Do not repeat historical review, whole-repository audits, or whole-Production verification.

## 5. Batching

Research/review should checkpoint frequently in small units.

Release should batch aggressively when reviewed items share the same writer and safety contract.

Preferred pattern:

```text
5–12 record review/checkpoints
→ accumulated reviewed payload
→ largest safe superbatch
→ one apply chain
→ one batched verification
```

One microbatch does not imply one PR, deployment, apply run, or read-back.

## 6. Concurrency

Release ownership is resource-scoped.

Independent content writers and code paths may progress concurrently. Merely sharing the repository or `main` branch is not a reason to serialize them.

Exclusive release ownership is required only where simultaneous changes could produce an actual conflict or invalid state.

## 7. CI policy

Repository-required checks remain mandatory for merges covered by branch protection.

Beyond those checks, add targeted tests based on the affected surface.

Do not add unrelated broad verification solely because it appeared in an older release train.

## 8. Production verification

Verify only the layer the task actually changed, plus any security/integrity checks already enforced by the canonical workflow.

Examples:

- content write → changed records;
- UI live fix → changed interaction/view;
- runtime compiler change → affected projection and relevant smoke;
- schema migration → migrated objects/constraints and dependent path.

Do not repeatedly verify unrelated endpoints or settled layers.

## 9. No ad-hoc unsafe bypasses

Lean process does not mean bypassing canonical safety.

Still forbidden:

- invented historical data;
- raw SQL bypass of normalized identity/writer contracts;
- destructive mutation without reviewed targets;
- schema/runtime mutation against incompatible deployed code;
- bypassing exact-SHA/OIDC/environment validation that the canonical writer itself enforces;
- hidden data-destructive action inside ordinary CI;
- treating a different commit's green CI as proof for changed code when an exact-code gate is actually required.

## 10. Historical release-train rules

The former Stage 2 / Train 1 / Train 2 procedures are retained in Git history as evidence of that migration era.

Historical evidence belongs in Git history, release manifests, migration artifacts, and rehearsal evidence. Completed migration-era release transports must not remain deployed as live Production endpoints or dispatch workflows solely to preserve history.

They are not current general release rules and must not be replayed by new conversations unless a task explicitly investigates that historical migration.

## 11. Operating rule

> Minimum sufficient verification. Maximum safe forward progress.

If a release step does not materially reduce the risk of the specific change, and is not already a canonical writer/security invariant, it must not block the release.
