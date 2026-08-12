# ATLAS Stage 2 R0 — Future Semantic Equivalence Gate (2026-08-12)

> Status: REVIEWED PAIRWISE EQUIVALENCE — NO PRODUCTION MUTATION

R0 is destructive: six duplicate Activity UUIDs will be coalesced. Current v1 identity equality alone is therefore insufficient. This gate checks whether the duplicate UUIDs would remain distinguishable once Stage 2 adds Relation Type, Governance Context and full temporal boundaries.

## Evidence

Current normalized identity evidence:

- Production read-only inventory run `31499183625`
- artifact `9104264546`
- digest `sha256:ac1d91800412c2d79921b6ed791e6c82f94d125fc4203568f2cad4ddf5db3eb3`

Latest cumulative Stage 2 relation audit used for the pairwise check:

- run `31544564663`
- artifact `9121986912`
- digest `sha256:10469efe8d82900348de8c95a3b58286374303714a798708841c824ffb1322e7`
- head `ff85c2511249096dfb6c5c6e21f29c3913957f18`

Machine-readable decision: `corrections/evidence/stage2-r0-future-semantic-equivalence.json`.

## Result

All six R0 keep/drop pairs remain **pairwise semantically equivalent**.

| Pair | Keep Activity UUID | Drop Activity UUID | Stage 2 relation audit | Governance distinction | Temporal-boundary distinction | Gate |
|---|---|---|---|---|---|---|
| Wu Zetian / Wu Zhou | `da809f25-40ff-5c27-b10b-88d4acc4070d` | `75a124e8-df55-5247-aa48-dc9d7934c10e` | `rules` / `rules` | none | none | PASS |
| Sejong / Joseon | `4263e4d0-a0a0-5803-a61b-85a57322db7e` | `d1e0a5a6-31a1-5691-8d05-570dccdcad18` | `rules` / `rules` | none | none | PASS |
| Mehmed II / Ottoman Empire | `b0d35acc-9705-5b80-96bb-02616df72bcc` | `25ce2112-9b21-55dd-88d1-029153fc1a5a` | `rules` / `rules` | none | none | PASS |
| Charles V / Holy Roman Empire | `16ebebde-e4e4-553d-a520-00da68a276d2` | `d641eec9-2770-5099-8017-8ec3bcc9244e` | `rules` / `rules` | none | none | PASS |
| Simón Bolívar / Gran Colombia | `05d7091a-5cfc-5ec0-9aa3-32461925e7c7` | `caa526f9-220d-540c-93ea-d889f6d9b8cb` | `rules` / `rules` | none | none | PASS |
| Bismarck / German Empire | `1ff585a7-c481-5d38-98ff-38381c81d961` | `a8946a02-9235-5985-b882-0c7d60b555dd` | `governs` / `governs` | none | none | PASS |

Charles V and Simón Bolívar still carry broader historical-research dependencies in the Stage 2 ledger. That does **not** reopen the duplicate question: the dependency applies to the one historical assertion represented twice, not to one UUID independently of the other. If the eventual reviewed Relation label is refined, it applies to the surviving assertion.

The same rule applies to later sub-year precision. These pairs do not encode two different terms or two different temporal interpretations. They are duplicate storage rows for the same office/reign assertion. Any later precise boundary enriches the survivor; it does not make the duplicate row historically distinct.

## Destructive authorization boundary

R0 may proceed only if CI proves that:

1. the correction manifest contains exactly these six keep/drop pairs;
2. each pair still passes the existing normalized v1 semantic-equality validator;
3. the future-equivalence registry contains exactly the same pairs;
4. keep/drop proposed Relation values are pairwise equal;
5. relation conflict, Governance distinction and temporal-boundary distinction are all absent;
6. every pair is explicitly `future_semantic_equivalent=true`.

This gate authorizes only duplicate coalescing. It does not authorize any R1/R2/R3 relink, split, Polity identity merge or Stage 2 semantic backfill.
