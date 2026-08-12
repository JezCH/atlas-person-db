# ATLAS Release Governance — Vercel-Minimized Release Trains

> Status: binding project release policy.
>
> Goal: complete as much research, implementation, migration rehearsal, manifest preparation and CI validation as possible **without consuming a Vercel Production build**, then cross each unavoidable live-data dependency barrier with one coherent Production release.

## 1. Core rule

A merge to `main` is treated as a scarce Production-deployment event.

ATLAS must not merge branches merely to:

- land documentation;
- run GitHub-only CI;
- rehearse PostgreSQL migrations;
- prepare correction/authoring manifests;
- perform historical research;
- generate code that does not yet need live Production state.

Those tasks remain on a reviewed release branch until the next live-state dependency requires a Production deployment.

`vercel.json` must continue to skip non-Production builds:

```text
ignoreCommand = test "$VERCEL_ENV" != "production"
```

Therefore branch/PR iteration uses GitHub Actions and disposable PostgreSQL, not Vercel Preview deployments.

## 2. Release-train states

Every Production-affecting train progresses through:

```text
PREPARE_BRANCH_ONLY
→ CI_PROVEN
→ READY_FOR_PRODUCTION
→ ONE_MAIN_MERGE
→ EXACT_SHA_DEPLOYED
→ ORDERED_PRODUCTION_OPERATIONS
→ LIVE_POSTCONDITIONS_VERIFIED
→ LIVE_BASELINE_CAPTURED_IF_REQUIRED
→ CLOSED
```

No state may be skipped when the next state depends on live data produced by the previous state.

## 3. Hard dependency barrier: Baseline A

The Stage 2 integration baseline cannot be finalized before R0/R1 current-schema corrections actually run in Production.

Therefore, from the present state, **at least two Production deployments are structurally unavoidable** if Stage 2 code must be rebound to the real post-cleanup UUID baseline:

1. **Production Train 1 — Current-schema cleanup**
   - requirements/release governance;
   - correction v1.1 transport and tests;
   - R0 future-semantic equivalence proof;
   - R0 + R1 current-schema correction package;
   - Baseline A capture tooling.

   After the single deployment, execute correction dry-run/apply and capture Baseline A from the same deployed SHA. No extra deployment is needed for the live operations themselves.

2. **Production Train 2 — Stage 2 transition**
   - built only after Baseline A exists;
   - rebind reviewed Stage 2 decisions to Baseline A;
   - additive Stage 2 schema;
   - correction v2;
   - historical corrections/backfills;
   - semantic-key v2 cutover;
   - v2-aware Person physical merge;
   - Baseline B capture/end-state constraints where safe.

   The target is one coherent deployed SHA with ordered, gated Production operations. Additive migration, correction, gate and cutover are operational stages of the same release, not reasons for repeated code deployments unless the code itself must change.

A third Production deployment is allowed only when post-cutover runtime/legacy-cleanup/map code genuinely cannot be included safely in Train 2. It is not the default.

## 4. Train 1 batching contract

Until Vercel Production is available, continue branch-only work and batch the following before merging:

- `ATLAS_REQUIREMENTS.md` + machine-readable registry;
- this release governance contract and CI verifier;
- correction v1.1 implementation (`coalesce`, `retire_activity`, bounded interval update only);
- R0 future-semantic equivalence gate;
- exact reviewed R0/R1 manifests when sufficient UUID-bound evidence exists;
- Baseline A read-only inventory/generation tooling;
- all unit/integration/schema tests that can run without Production.

Do not merge an incomplete subset merely because one item is finished.

## 5. Production operation ordering inside one deployed SHA

A single Production deployment may support multiple ordered operations without another Vercel build:

```text
exact SHA verification
→ real rollback dry-run
→ correction apply
→ post-state verification
→ read-only inventory
→ baseline artifact generation
```

For Stage 2 Train 2 the same principle applies:

```text
exact SHA verification
→ additive migration
→ structural corrections/backfills
→ semantic cutover gate
→ cutover
→ Person merge
→ Baseline B / final constraints
```

If an operation fails, stop the train. Do not patch Production ad hoc. Return to branch work, fix/revalidate, and consume another Production deployment only when the code change truly requires it.

## 6. Branch and PR policy

- Prefer one active release-candidate branch per live dependency barrier.
- Draft PRs are allowed to accumulate multiple reviewed commits because Vercel Preview is skipped.
- Do not split one coherent release merely to create many small deployable PRs.
- Historical research may remain in dedicated evidence branches, but its reviewed conclusions are ported into the release train before Production mutation.
- Stale 346-row Stage 2 stacked PRs are evidence sources, not a deployment sequence.

## 7. Main protection and exact-SHA discipline

Before Production mutation:

- `main` must be protected;
- `ATLAS Integrity` must be required;
- the deployed Vercel SHA must equal the merged `main` SHA;
- authoring/correction workflows must reject SHA mismatch;
- no Production capability is considered live merely because code exists on `main`.

Branch protection itself does not require a Vercel deployment and should be enabled as soon as the GitHub control surface permits it.

## 8. Vercel budget invariant

The optimization objective is not “zero deployments.” It is:

> **minimum deployments consistent with correct live-data dependency ordering.**

ATLAS must never reduce deployment count by guessing a future Production baseline, bypassing exact-SHA proof, merging destructive Person identities early, or combining operations whose correctness depends on a live result that does not yet exist.

Conversely, if several operations can run against one already-deployed SHA, they must be batched into that release rather than forcing separate deployments.
