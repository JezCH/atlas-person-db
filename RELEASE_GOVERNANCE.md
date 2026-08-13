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

After deployment, the same SHA runs dry-run/apply operations and then captures **Baseline A v2** in one `REPEATABLE READ READ ONLY` snapshot. The snapshot contains all Activity rows plus complete Person/name, Polity/name including raw `name_type`, Role/name, Period Basis/name and Source catalogs. Its digest covers `{rows, counts,catalogs}`. This prevents a second Vercel deployment or ad-hoc live query merely to recover unreferenced identity/name/source rows.

### Production Train 2 — Stage 2 transition

Only after validated Baseline A v2:

- fresh Stage 2 integration branch from updated `main`;
- reviewed surviving UUID and Polity name-kind bindings;
- non-destructive Stage 2 schema transition: additive objects plus reviewed backward-compatible constraint relaxation for Stage 2-native Activity provenance;
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
→ non-destructive schema transition
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

GitHub-enforced branch protection is preferred **only when the repository/account can actually enforce it**. A visible but non-enforced ruleset is not a safety control and must not be treated as one.

Current repository decision is recorded in `docs/release/P0_MAIN_PROTECTION_AVAILABILITY_2026-08-12.md`.

Before any Production mutation, one of the following release-control modes must be true:

### Mode A — platform-enforced protection available

- `main` protection/ruleset is actually enforced;
- `ATLAS Integrity` is a required check;
- ordinary release flow still uses exact-head and exact-Production-SHA verification.

### Mode B — protection unavailable under current repository/account configuration

The release must fail closed unless **all** conditions are proven:

- release occurs through the reviewed release PR;
- `ATLAS Integrity` succeeded on the exact PR head SHA;
- unresolved review threads are zero;
- merge is executed with that exact expected head SHA;
- resulting `main` SHA is read after merge;
- operation SHA equals Vercel Production SHA;
- authoring/correction/audit transports reject SHA mismatch;
- code existing on `main` is not considered live until matching Production deployment exists.

If any proof is missing, the train stops. No Production mutation is authorized.

When GitHub protection becomes enforceable later, enable it and require `ATLAS Integrity`; this is future hardening, not a reason to create a decorative non-enforced ruleset now.

## 8. Vercel budget invariant

The objective is **minimum deployments consistent with correct live-data dependency ordering**.

Never reduce deployment count by guessing a future Production baseline, bypassing SHA proof, merging Persons early, inventing historical data, or combining stages whose correctness depends on a live result that does not yet exist. Conversely, multiple operations that can safely run against one exact deployed SHA belong to the same train.

## 9. Build-skip safety invariant

The ignored-build classifier is optimization, not correctness. Uncertainty defaults to BUILD. Deployment-relevant classes include API/server, DB schema/migration, runtime assets/package, `vercel.json`, correction requests/intents, and Production authoring/correction/audit workflows. Deletions and renames count in the diff.

## 10. Stage 2 additive schema release authorization

Stage 2 additive schema release is never triggered automatically by `push` or `pull_request`.

The release currently contains six ordered non-destructive components: five additive Stage 2 capability components plus one backward-compatible provenance constraint relaxation. The sixth component makes `person_politics_v2.legacy_source_key` nullable for genuinely Stage 2-native Activity fragments while keeping existing imported keys unique and forbidding blank non-null values. New fragments must use normalized Source links and Correction v2 audit evidence; **inventing a fake legacy import key is forbidden**.

The Production migration path is intentionally separate from ordinary authoring and correction transports. It may run only through `.github/workflows/atlas-stage2-schema-release.yml` by explicit `workflow_dispatch` on `main`, with the GitHub `production` environment and a dedicated OIDC audience. The operator must provide the exact reviewed `release_id` and type `APPLY:<release_id>` exactly.

The server endpoint then independently requires all of the following before opening a write path:

- Vercel Production is the same exact `main` SHA as the workflow run;
- the OIDC token belongs to the dedicated Stage 2 schema workflow, repository, environment and SHA;
- the local release package still has exact reviewed component Git blob SHAs;
- P6 effective prebinding is closed at 54/54 with zero remaining Activities;
- the live Baseline A v2 digest and authoritative 338 Activity / 302 Person / 212 Polity / 20 Source cardinalities still match the release baseline;
- any existing release-ledger rows match the exact component SHA and contain no unknown component.

The workflow performs a read-only live preflight first. Only after that preflight succeeds may it call `apply`. Each schema component is atomic and restart-safe; a retry skips only an already-recorded component with the exact same blob SHA. After apply, the Baseline A digest must remain unchanged and all six release components must be present in the release ledger.

The release JSON intentionally keeps `production_apply_authorized: false`: a checked-in data file cannot authorize its own Production execution. Authorization comes only from the exact-SHA manual workflow + typed approval + dedicated OIDC + live preflight combination.
