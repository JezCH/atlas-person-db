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
- prepare non-executable historical evidence;
- perform historical research;
- generate code that does not yet need live Production state.

Those tasks remain on a reviewed release branch until the next live-state dependency requires a Production deployment whenever practical.

Vercel build admission is additionally fail-closed around deployment relevance through `scripts/vercel-ignore-build.mjs`:

- Preview/non-Production deployments are skipped.
- Production changes that are provably documentation, tests, requirements, research, reviewed evidence, or `ATLAS Integrity`-only are skipped.
- Runtime/API/server/schema/package/Vercel changes are built.
- Correction request/intent manifests and Production-operation workflows are built because their exact-SHA operations require the current `main` commit to become the deployed Production SHA.
- Any unknown path, missing previous successful deployment SHA, unavailable shallow-clone commit, or failed diff **builds rather than skips**.

The script compares the current Production commit with Vercel's previous successful deployment SHA. This means several safely skipped documentation/research commits may accumulate; the next deployment-relevant commit is compared across the whole undeployed range rather than only against its immediate parent.

Therefore GitHub-only iteration is allowed without treating every `main` commit as a Vercel build, while Production mutation still retains exact-SHA discipline.

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
- same-SHA exact-target snapshot support for reviewed intents whose normalized before-state must be read live;
- Baseline A read-only inventory/generation tooling;
- all unit/integration/schema tests that can run without Production.

Do not merge an incomplete subset merely because one item is finished.

## 5. Production operation ordering inside one deployed SHA

A single Production deployment may support multiple ordered operations without another Vercel build:

```text
exact SHA verification
→ R0 real rollback dry-run
→ R0 apply
→ R1 Franklin/Bismarck dry-run + apply
→ Muhammad exact same-SHA read-only target snapshot
→ synthesized exact v1.1 dry-run + apply
→ post-state verification
→ Baseline A full read-only inventory + digest
→ one evidence artifact
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
- Draft PRs are allowed to accumulate multiple reviewed commits because Preview deployment is skipped.
- Do not split one coherent release merely to create many small deployable PRs.
- Historical research may remain in dedicated evidence branches, but its reviewed conclusions are ported into the release train before Production mutation.
- Stale 346-row Stage 2 stacked PRs are evidence sources, not a deployment sequence.
- Documentation/research-only changes that reach `main` may remain intentionally undeployed until a deployment-relevant commit arrives; Production operations must never target such an undeployed `main` SHA.

## 7. Main protection and exact-SHA discipline

Before Production mutation:

- `main` must be protected;
- `ATLAS Integrity` must be required;
- the SHA supplied to an authoring/correction/audit operation must equal the Vercel Production deployment SHA;
- any release commit that carries an executable Production operation must itself be deployment-relevant and become the exact deployed SHA before the operation executes;
- authoring/correction workflows must reject SHA mismatch;
- no Production capability is considered live merely because code exists on `main`.

Branch protection itself does not require a Vercel deployment and should be enabled as soon as the GitHub control surface permits it.

## 8. Vercel budget invariant

The optimization objective is not “zero deployments.” It is:

> **minimum deployments consistent with correct live-data dependency ordering.**

ATLAS must never reduce deployment count by guessing a future Production baseline, bypassing exact-SHA proof, merging destructive Person identities early, or combining operations whose correctness depends on a live result that does not yet exist.

Conversely, if several operations can run against one already-deployed SHA, they must be batched into that release rather than forcing separate deployments.

## 9. Build-skip safety invariant

The ignored-build classifier is an optimization boundary, not a correctness boundary.

Its default for uncertainty is always **BUILD**. A path is skipped only when it belongs to an explicit non-deployable class. Tests must prove at least the following classes remain deployment-relevant:

- `api/**` and `server/**`;
- database schema/migration paths;
- root runtime HTML/JS/CSS/data and package manifests;
- `vercel.json`;
- correction `requests` / `intents`;
- Production authoring/correction/audit workflows.

Mixed commits build if even one changed path is deployment-relevant. Deletions and renames are included in the diff. If Vercel cannot expose or resolve the previous successful Production SHA in its shallow clone, the build proceeds rather than risking a false skip.
