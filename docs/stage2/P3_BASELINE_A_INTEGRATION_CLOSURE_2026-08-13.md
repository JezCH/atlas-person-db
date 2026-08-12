# Stage 2 P3 Baseline A Integration Closure

> Status: **P3 BASELINE A INTEGRATION DECISIONS COMPLETE / BRANCH ONLY / NO PRODUCTION MUTATION**  
> Date: 2026-08-13  
> Baseline A deployment SHA: `ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`  
> Baseline digest: `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`

## Closure result

P3 historical-model research was already closed before this step. P4 subsequently closed Person and Polity identity decisions. This closure finishes the remaining Baseline-A structural Polity-relation model work without applying any Production schema or data mutation.

- Baseline A Activities: **338**
- Generic historical-research blockers: **0**
- Person identity blockers: **0**
- Polity identity blockers: **0**
- Polity relation model blockers before reviewed overlay: **14**
- Reviewed Polity relation decisions applied: **14**
- Polity relation model blockers after reviewed overlay: **0**
- Reviewed Polity relation assertions ready for later schema/data execution: **10**
- Relation-model rows requiring later Activity correction: **12**
- Production mutation authorized/performed: **0**

`P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING` means the historical relation model has been decided. It does not mean the relation row, new Polity, normalized Source, or Activity correction already exists in Production.

## Three residual layered-authority closures

Three Baseline A rows had only an audit-level regional-authority flag and lacked a final machine-readable model:

- **Tao Qian**: source-backed Xu-centered regional political actor, nominally subordinate to Eastern Han. Xu Province itself is not auto-promoted as a Polity; the future Polity is an editorial identity for Tao Qian's historical regional political authority.
- **Liu Yu**: source-backed You-centered regional political actor, nominally subordinate to Eastern Han. His loyalty to Han is preserved as the superior relation rather than by treating the whole Eastern Han as his directly ruled territory.
- **Bolad Temur**: retained inside the Yuan Polity model. Yuan offices, army command, factional military power and temporary central control do not by themselves justify inventing a separate Bolad Temur territorial Polity.

Machine authority:

- `research/china/stage2-tao-qian-liu-yu-bolad-temur-layered-authority-closure.v1.json`
- `stage2/integration/baseline-a-polity-relation-decisions.v1.json`

## Relation registry

The 14 reviewed relation-model rows are now exact Activity-bound decisions. They include:

- Huainan → Western Han `vassal_of`;
- Liu Yan, Tao Qian, Liu Yu, Yuan Shao, Liu Biao, Gongsun Zan → reviewed Eastern Han nominal-subordination models where a relation interval is supportable;
- Zhang Lu/Hanzhong → Liu Yan's Yi authority for the reviewed initial phase;
- Fang Guozhen → Yuan for the reviewed 1355–1358 phase while later multiple-superior relations remain independently time-bounded;
- Dominion of Canada → United Kingdom `dominion_of`;
- explicit no-default policies for Ma Teng, Lü Bu and Sun Ce where a continuous superior relation would fabricate history;
- Bolad Temur as no-separate-Polity/no-Polity-relation closure.

No name-only UUID binding is permitted. New Polity targets retain `UUID = null` until P5/P7 authoring creates them through the reviewed authoring path.

## Corrected P5/P6 execution frontier

P4 identity closure alone exposed **15** new Polity authoring targets. The structural-relation pass exposed **9 additional distinct regional-authority Polity classes** that were not part of the P4 identity queue.

Therefore the branch-only P5/P6 execution manifest now requires:

- new Polity target classes: **24** total;
- reviewed Polity relation assertions: **10**;
- Correction v2 Activity frontier: **57 unique Activities**;
- P4 merge reconciliations: **7**;
- P4 entity migrations: **3**;
- Production execution authorization: **false**.

This corrects the earlier 49-Activity / 15-new-Polity P5/P6 projection, which only counted P4 identity decisions and would have silently omitted several already-reviewed regional-authority authoring requirements.

## CI gate

`npm run test:stage2-baseline-a-ledger` now requires the following sequence:

1. reconstruct the exact 338-row Baseline A ledger;
2. apply reviewed research closures;
3. apply Person identity decisions;
4. apply and verify all six Polity identity batches and the Sun-Wu correction;
5. verify P4 identity closure;
6. apply and verify all 14 P3 Polity-relation decisions;
7. build and verify the P5/P6 execution manifest v2;
8. build work queues only after `polity_relation_model = 0`.

The work-queue builder fails closed if the P3 relation decision total is not 14, if any relation model remains unresolved, or if the 14 reviewed decisions are not present as execution-pending overlays.

ATLAS Integrity **#234** passed this full chain at commit `d3194fdbcbd5c4517bf5eed46382dbca4dd65650`. The generated artifact independently records `polity_relation_model = 0`, 24 new Polity targets, 57 Correction v2 Activities and 10 reviewed Polity-relation assertions.

## Next boundary

P3 and P4 historical/identity decision work is closed on Baseline A. The next work remains branch-only P5/P6 preparation first: authoring packages for the 24 missing Polity identities, normalized Source packages, additive-schema rehearsal alignment, and Correction v2 execution packages. Actual Production schema migration or data correction remains deferred until those non-Production preparations are exhausted and a deliberate Production train is authorized.
