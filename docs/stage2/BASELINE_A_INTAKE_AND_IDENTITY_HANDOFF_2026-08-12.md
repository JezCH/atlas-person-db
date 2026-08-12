# Baseline A Intake & Identity Handoff — 2026-08-12

> Status: BASELINE-INDEPENDENT HANDOFF CONTRACT / NO PRODUCTION MUTATION

## Why this exists

Production Train 1 ends by capturing `baseline-a.json` on the same exact deployed SHA after R0 and the current-schema R1 corrections. That file is the first trustworthy post-cleanup Activity inventory.

A dangerous gap would remain if Stage 2 then resumed by manually copying old UUIDs, matching names by intuition, or reviving the old 346-row ledger. This handoff closes that gap.

The flow is now:

```text
reviewed Train 1 SHA
-> R0 / R1
-> read-only Baseline A
-> cryptographic Baseline A validation
-> deterministic Baseline A intake
-> fresh Stage 2 integration branch/work queues
-> reviewed Person/Polity identity bindings
-> correction v2 targets
-> structural backfill
-> semantic-key-v2 cutover
-> physical Person merge
```

The intake is a verifier and indexing layer. It is not a correction manifest and grants no Production write authority.

## Baseline A is the execution UUID baseline

The accepted input is exactly the Train 1 response with marker `ATLAS_CORRECTION_BASELINE_A_V1` and mode `full_activity_baseline`.

The intake requires:

- `read_only = true` and `committed = false`;
- an exact 40-hex deployed Production SHA;
- `row_count == rows.length == counts.activities`;
- Activity UUID uniqueness;
- deterministic Activity UUID ordering;
- current-schema historical-year and interval validity;
- internally consistent Person/Polity/Role/Period metadata for every repeated UUID;
- a recomputed SHA-256 digest identical to the captured `baseline_digest`.

If any of these conditions drift, the handoff fails closed.

## What Baseline A authority means — and does not mean

Baseline A authoritatively tells us **which normalized UUID rows actually survived Train 1**. It does not decide the final historical model by itself.

In particular:

- an Activity's current `polity_id` is an actual current Production binding, but it is not automatically the final canonical Polity decision for Stage 2;
- canonical keys and EN/KO names are review labels and candidate-discovery metadata, not identity keys;
- matching historical research to a familiar string cannot authorize RELINK/SPLIT/RETIRE;
- the old 346-Activity baseline and old Stage 2 UUID bindings remain non-authoritative;
- there is no default Person–Polity Relation for rows that still need review.

This preserves the project rule that UUID is identity while names remain evidence/presentation.

## Three identity layers stay separate

### Person Identity

Answers: are two Person UUIDs the same historical person?

A duplicate detector/reviewer may reach `MERGE`, `KEEP_SEPARATE`, or `REVIEW` decisions before P9. That is an identity decision only.

### Polity Identity

Answers: are two political-actor representations the same continuous Polity, a temporal designation/state-form of one Polity, a constituent/composite structure, or genuinely distinct Polities?

Because final Activity identity contains `polity_id`, affected Polity identity decisions must be reviewed before the semantic-key-v2 cutover.

### Activity Identity

Final identity is:

```text
Person UUID
+ Polity UUID
+ Relation Type UUID
+ Role UUID / NULL
+ Period Basis UUID
+ interpreted start boundary
+ interpreted end boundary
```

Evidence certainty, confidence, notes, provenance, names and content hashes do not enter this identity.

## Duplicate decision is not physical merge

The current Phase 9 duplicate subsystem may continue to produce identity candidates and reviewed identity decisions. It must not physically merge Persons under the old relationship-reconciliation key.

Physical Person merge remains P10, after P9 changes every relevant consumer to semantic-key v2 and relationship reconciliation becomes Relation/full-temporal aware.

Therefore the Baseline A intake explicitly emits:

- `reviewed_person_identity_bindings_required = true`;
- `reviewed_polity_identity_bindings_required = true`;
- `physical_person_merge_authorized = false`;
- `semantic_key_v2_activation_authorized = false`;
- `correction_v2_target_generation_authorized = false`.

Those flags prevent an intake artifact from being mistaken for an execution approval.

## Deterministic output

`scripts/stage2-baseline-a-intake.mjs` consumes the captured Baseline A file and produces `atlas-stage2-baseline-a-intake/v1`.

The output contains:

1. the exact source Production SHA, baseline digest and counts;
2. current Activity UUID bindings required to rebuild the fresh ledger;
3. referenced Person/Polity/Role/Period catalogs for review navigation;
4. explicit downstream authorization gates;
5. a deterministic `intake_digest` linking every later artifact to the same validated handoff.

Catalog names and canonical keys are deliberately segregated from Activity UUID binding fields and marked `binding_authority: false`.

## How it is used after Train 1

Once Train 1 has succeeded, the workflow artifact is downloaded and the handoff is generated without another Vercel deployment:

```bash
node scripts/stage2-baseline-a-intake.mjs \
  baseline-a.json \
  stage2/integration/generated/baseline-a-intake.json
```

The fresh Stage 2 Integration branch is then based on the updated `main`, not on the old stacked Stage 2 branch. Historical contracts/research already carried into PR #125 are joined to this intake by reviewed UUID decisions.

The new ledger/work queues must cite both:

- `source.baseline_digest`; and
- `intake_digest`.

That makes stale or mixed-baseline execution detectable.

## What is intentionally still blocked

Baseline A itself is needed before any of the following can be produced honestly:

- the validated intake instance;
- the fresh master ledger;
- fresh Stage 2 work queues;
- surviving Activity UUID bindings for reviewed historical cases;
- reviewed final Person/Polity UUID binding registry;
- exact correction-v2 manifests;
- Relation Type row backfill targets;
- P9 semantic-key-v2 activation;
- physical Person merges.

This is not additional process for its own sake. It is the single handoff boundary that prevents stale UUIDs, name-based guesses and pre-Stage2 duplicate semantics from contaminating the final system.
