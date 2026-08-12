# Stage 2 P4 Identity Closure — Baseline A v2

> Status: **P4 IDENTITY DECISIONS COMPLETE / BRANCH ONLY / NO PRODUCTION MUTATION**  
> Date: 2026-08-13  
> Baseline A deployment SHA: `ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`  
> Baseline digest: `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`

## Closure result

- Baseline A Activities: **338**
- P4 Person identity decisions: **complete**
- P4 Polity identity dependency total: **49**
- P4 Polity identity decisions applied: **49**
- P4 Polity identity unresolved: **0**
- P4 decided / downstream execution pending: **49**
- P4 Polity identity corrections applied: **1**
- Physical Person merges performed: **0**
- Production DB mutations authorized/performed by P4: **0**

`P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING` means the historical identity question is closed but P5/P6/P7 authoring, relink, split, governance, relation, designation, People/Event migration or provenance work can still remain. It is deliberately not equivalent to “fully corrected in Production”.

## Person identity

The Baseline A Person duplicate review is closed without destructive merge. Gorgo remains a reviewed P10 physical-merge handoff; Catherine the Great / Catherine II is one Person identity and requires no physical duplicate merge. P10 remains the only phase allowed to perform the physical Person merge after v2-aware reconciliation and revalidation.

Machine authority:

- `stage2/integration/baseline-a-person-identity-decisions.v1.json`
- `scripts/apply-stage2-baseline-a-person-identity-decisions.mjs`

## Polity identity

Six exact handoff batches close all 49 original `polity_identity_model` dependencies:

1. `baseline-a-polity-identity-decisions.v1.json`
2. `baseline-a-polity-identity-decisions-batch2.v1.json`
3. `baseline-a-polity-identity-decisions-batch3.v1.json`
4. `baseline-a-polity-identity-decisions-batch4.v1.json`
5. `baseline-a-polity-identity-decisions-batch5.v1.json`
6. `baseline-a-polity-identity-decisions-batch6.v1.json`

Every batch is exact-Activity/exact-current-Polity bound, forbids name-only binding, forbids invented UUIDs, and remains non-mutating.

## Sun Ce → Sun Quan → Wu correction

A later continuity review superseded one earlier Batch 2 implementation target. The earlier handoff correctly separated Sun Ce's nominal Eastern Han service from regional rule, but initially marked the Jiangdong political actor as `NEW_POLITY_REQUIRED`.

The reviewed continuity contract now treats the political enterprise created by Sun Ce and inherited/developed by Sun Quan as one stable Polity identity, using existing Baseline A Polity UUID:

`8768ce4f-26fe-5de9-a501-c19525461fdb`

The later `Eastern Wu` name/state form must not be back-projected as the formal name of the earlier Jiangdong phase. The correction is preserved explicitly rather than silently rewriting historical audit provenance.

Machine authority:

- `research/china/stage2-sun-ce-sun-quan-wu-continuity.v1.json`
- `stage2/integration/baseline-a-polity-identity-corrections.v1.json`
- `scripts/apply-stage2-baseline-a-polity-identity-corrections.mjs`

## Final Shi Xie closure

Shi Xie's current `Jiaozhou` row is not retained as a fabricated sovereign Polity. It is a split handoff:

- pre-210: Eastern Han political context, `serves`;
- from 210: stable Sun Ce/Sun Quan/Wu political context, `serves`;
- Jiaozhou itself moves to administrative Governance/Region context;
- substantial local autonomy remains representable as governance/authority context;
- no separate sovereign Shi Xie state is invented.

This closes the sole remaining P4 Polity identity blocker.

## CI gate

`npm run test:stage2-baseline-a-ledger` now reconstructs the fresh 338-row ledger, applies all reviewed closures and identity decisions, applies the explicit Sun Ce correction, applies final Batch 6, and runs the P4 closure verifier. The closure verifier requires:

- `polity_identity_model = 0`;
- decisions applied = `49`;
- unresolved = `0`;
- execution pending = `49`;
- correction count = `1`;
- Production mutation authorization = `false` for every decision.

ATLAS Integrity run #228 passed the full branch suite at commit `60237ef238c859f1e2f1fcbc2b8b880893fabc04` before this documentation/update step.

## Next boundary

P4 is closed. P3 is **not** globally closed yet because reviewed structural Polity relations still require exact live UUID/source binding where representable (`ATLAS-RQ-0214`). P5/P6 Production execution is also not authorized. The next safe work is branch-only generation and verification of deterministic P5/P6 execution manifests, followed by remaining structural relation binding and disposable-database rehearsals.
