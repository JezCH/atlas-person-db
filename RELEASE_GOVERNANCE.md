# ATLAS Release Governance — Vercel-Minimized Release Trains

> Status: binding project release policy.
>
> Goal: complete as much research, implementation, migration rehearsal, manifest preparation and CI validation as possible **without consuming a Vercel Production build**, then cross each unavoidable live-data dependency barrier with one coherent Production release.

## 1. Core rule

A merge to `main` is treated as a scarce Production-deployment event.

Branch-only documentation, research, PostgreSQL rehearsal, tests, evidence preparation and non-live historical modeling stay on the active release branch until a live-state barrier requires Production. Preview/non-Production builds are skipped when safely classifiable. Runtime/API/server/schema/package/Vercel/correction-operation changes remain deployment-relevant. Any unknown path, missing previous successful deployment SHA, unavailable shallow-clone commit, or failed diff **builds rather than skips**.

Mixed commits build if even one changed path is deployment-relevant.

## 2. Release-train state machine

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

No state is skipped when the next state depends on live data produced by the previous state.

## 3. Hard live dependency: Baseline A v2

Stage 2 live UUID binding cannot be finalized before R0/R1 actually run in Production. Therefore **at least two Production deployments are structurally unavoidable** when Stage 2 code must bind to the real post-cleanup UUID state.

### Production Train 1 — Current-schema cleanup

One exact deployed `main` SHA carries:

- requirements/release governance;
- correction v1.1 transport;
- R0 future-semantic equivalence;
- reviewed R0/R1 current-schema package;
- Baseline A v2 capture tooling.

After deployment, the same SHA runs dry-run/apply operations and then captures **Baseline A v2** in one `REPEATABLE READ READ ONLY` snapshot. The snapshot contains all Activity rows plus complete Person/name, Polity/name including raw `name_type`, Role/name, Period Basis/name and Source catalogs. Its digest covers `{rows, counts, catalogs}`. This prevents a second Vercel deployment or ad-hoc live query merely to recover unreferenced identity/name/source rows.

### Production Train 2 — Stage 2 transition

Only after validated Baseline A v2:

- fresh Stage 2 integration branch from updated `main`;
- reviewed surviving UUID and Polity name-kind bindings;
- additive Stage 2 schema, including People/Event and semantic name-kind capabilities;
- correction v2;
- historical/People/Event/provenance backfill;
- P8 semantic gate;
- P9 semantic-key v2 cutover;
- P10 v2-aware Person merge;
- Baseline B/end-state constraints where safe.

The target is one coherent deployed SHA with ordered operations. A third Production deployment is permitted only if post-cutover code genuinely cannot be safely included in Train 2; it is not the default.

## 4. Train 1 batching contract

Before Train 1 merge, branch-only work should include every Baseline-A-independent item that can be reviewed and tested:

- requirements and release governance;
- correction v1.1 and R0/R1 evidence;
- Baseline A v2 exact-SHA full-identity snapshot/intake;
- Stage 2 domain, temporal, provenance, Relation, Governance and semantic-key contracts;
- Polity naming semantic boundary and People/Event model;
- disposable PostgreSQL rehearsals;
- all Baseline-A-independent historical model decisions, with irreducible uncertainty explicit;
- Person physical-merge interlock until P10.

Do not merge an incomplete subset merely because one item is finished.

## 5. Ordered operations on one deployed SHA

Train 1:

```text
exact SHA verification
→ R0 real rollback dry-run
→ R0 apply
→ R1 Franklin/Bismarck dry-run + apply
→ Muhammad exact same-SHA read-only target snapshot
→ synthesized exact v1.1 dry-run + apply
→ post-state verification
→ Baseline A v2 full identity snapshot + digest
→ one evidence artifact
```

Train 2:

```text
exact SHA verification
→ additive migration
→ reviewed identity/name-kind binding
→ structural + People/Event + historical backfill
→ P8 semantic cutover gate
→ P9 cutover
→ P10 candidate revalidation + Person merge
→ Baseline B / final constraints
```

On failure, stop the train. Never patch Production ad hoc.

## 6. Branch / PR policy

- Prefer one active release-candidate branch per live dependency barrier.
- Draft PRs may accumulate many reviewed commits because Preview deployment is skipped.
- Do not split one coherent release merely to create small deployable PRs.
- Old 346-row Stage 2 stacked PRs are evidence sources, never a deployment sequence or UUID authority.
- Documentation/research-only commits may remain intentionally undeployed until the next deployment-relevant commit.

## 7. Exact-SHA / protection policy

Before Production mutation:

- `main` must be protected;
- `ATLAS Integrity` must be required;
- operation SHA must equal Vercel Production SHA;
- executable Production-operation commits must become the exact deployed SHA;
- authoring/correction/audit transports reject SHA mismatch;
- code existing on `main` is not considered live until the matching Production deployment exists.

Branch protection itself does not need Vercel and should be enabled as soon as the GitHub control surface permits it.

## 8. Vercel budget invariant

The objective is **minimum deployments consistent with correct live-data dependency ordering**.

Never reduce deployment count by guessing a future Production baseline, bypassing SHA proof, merging Persons early, inventing historical data, or combining stages whose correctness depends on a live result that does not yet exist. Conversely, multiple operations that can safely run against one exact deployed SHA belong to the same train.

## 9. Build-skip safety invariant

The ignored-build classifier is optimization, not correctness. Uncertainty defaults to BUILD. Deployment-relevant classes include API/server, DB schema/migration, runtime assets/package, `vercel.json`, correction requests/intents, and Production authoring/correction/audit workflows. Deletions and renames count in the diff.
