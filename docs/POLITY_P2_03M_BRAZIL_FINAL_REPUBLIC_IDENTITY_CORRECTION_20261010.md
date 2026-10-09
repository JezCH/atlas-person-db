# POLITY-P2-03M — Brazil family identity decision and actual one-Activity canonical correction

**Final disposition: `FIXED` (active Person–Polity identity reference), with **legacy zero-Activity physical Polity UUID RETAINED / NOT RETIRED** under user approval gate. This is the final bounded Brazil work unit. STOP opening new 1968-law/Source sub-units; next user-instructed Polity work moves to another pending case.**

## 1. Final source-backed historical decision

- The **Empire of Brazil** is distinct from the federal republic inaugurated **1889-11-15**, under [Decreto nº 1, Arts 1–2](https://www2.camara.leg.br/legin/fed/decret/1824-1899/decreto-1-15-novembro-1889-532625-publicacaooriginal-14906-pe.html).
- **`United States of Brazil`** is the formal historic name of the Brazilian federal republic; it is **not a sovereign state separate from** the republic presently represented in ATLAS as **`Brazil`**. The 1891 Constitution establishes the old constitutional title; [Law No. 5.389 of 1968, Arts 1, 3 and 4](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html) uses the newer `República Federativa do Brasil` title and changes official national symbol inscriptions. Merely changing that title does **not** establish extinction of the state.
- The **exact first-exclusive use date** of the newer national title was **not** independently proved. The 1968-02-23 publication/effectiveness applies directly to the national symbols law. No artificial exclusive day-precision `official_name` Designations inserted. Unverified full legal opinion H-733 is not needed to decide the two republican Polity UUIDs represent the same continuous sovereign identity.
- **Canonical republican identity:** `a8b27d54-b180-4d51-a664-dd40b3eed08f` (`Brazil`). **Historic-name legacy row:** `750bf6be-49e9-4215-95ff-a356ba1831cd` (`United States of Brazil`). **Distinct Empire:** `efcd0f70-bffe-5464-86e3-b28b3658404b`.

## 2. Actually committed authoring repair (one Activity, no other mutation)

[PR #2332](https://github.com/JezCH/atlas-person-db/pull/2332) squash-merged to `main` at `72b06db20781fa66bc97bf3e7900ae8cae8693a7`; [ATLAS Integrity #37995470343](https://github.com/JezCH/atlas-person-db/actions/runs/37995470343) **SUCCESS** including four hard invariant tests. The corrected plan is `corrections/plans/brazil-republic-continuity-afonso-pena-relink-20261010.v1.json`, one `rewrite_activity` operation only.

Authenticated exact-live Production workflow [ATLAS Correction Apply #37995627659](https://github.com/JezCH/atlas-person-db/actions/runs/37995627659), job `114040813649`, **SUCCESS**, downloadable verification artifact `11646218818`:
- **dry_run:** `ok=true`, `committed=false`, `replay=false`.
- **apply:** `ok=true`, `committed=true`, `replay=false`. Manifest `sha256:fa66e0bf466cfdc5a0837c279fcadb774c72c9a5c442c8e732d7d347d068116d` tied to exact live target baseline digest `sha256:6482ef5d16edbf028fb671c21906cc62f30dda21c7053a275294f402d78bbcf3`.
- **Only changed identity field:** Afonso Pena presidency Activity `7a021719-8a81-4367-9fd1-64e75f996563`, old `polity_id=750bf6be-49e9-4215-95ff-a356ba1831cd` → canonical `polity_id=a8b27d54-b180-4d51-a664-dd40b3eed08f`.
- **Unchanged fields:** Activity UUID, person UUID, `governs` relation, President role, `term` period basis, start **1906-11-15**, end **1909-06-14** (day/exact/gregorian), confidence `well_established`, chronology `reviewed`, old constitutional title in notes and original authoring provenance/source locator, exactly **one** existing normalized Source association `e91990eb-2d4a-4e05-afc0-9a5d9f6b741a` (Biblioteca da Presidência).
- **Zero** newly registered Source/Designation/name rows, zero activity splits or retirement/deletes, zero Empire edits; all other nine family Activities retain their prior exact identity assignment.

**Independent post-commit authoring Baseline A readback** in the SAME successful Correction workflow artifact reports:
| Polity | Before | After |
|---|---:|---:|
| Empire of Brazil (distinct) | 2 | **2** |
| United States of Brazil (legacy name row) | 1 | **0** |
| Brazil (canonical republican) | 7 | **8** |
| All three scoped together | 10 | **10** |

Post-commit baseline row for Afonso Pena independently resolves `polity_canonical_key: Brazil` and `polity_name_ko: 브라질`, with same preserved Activity UUID, exact dates and one official presidency Source link. Global post-commit count `2511` activities and `3854` normalized activity–Source links, no count change; baseline digest `sha256:610bfbeec44cff8f0a2ddd6410042c5bc7754c65217c104dab265a150892197c`. Family Source associations: Empire **3**, old republic **0**, canonical Brazil **14**.

**Automatic Runtime re-publication** [ATLAS Runtime Projection Compile #37995685332](https://github.com/JezCH/atlas-person-db/actions/runs/37995685332), job `114041023708`, **SUCCESS**, **2511 published** from `2511` authoring rows, compile key `runtime-person-politics-v1:c6db43c73291dc26b2261914945fd816eb8d91b730e1ebe4bda27ec81bc27209`. Authoring exact before/after row is validated and runtime compile is successful; a separate post-compile 10-row field-by-field Runtime census was not executed, so **do not assert comprehensive Runtime semantic row-content parity** beyond compiler acceptance.

## 3. Scope/approval line — no more Brazil research as prerequisite

**Old `United States of Brazil` Polity UUID still physically exists.** Its linked Authoring Person Activities are now zero, but its retirement, name redirect, potential remaining FK surfaces, and any deletion **have NOT been performed or approved**. A separate comprehensive zero-reference retirement readiness audit and user’s **explicit approval** are mandatory if that later physical cleanup is desired. **Do not treat `FIXED` as a claim that the old table row was deleted.** This family is terminal here because historical identity is adjudicated and all ten affected activities have correct canonical binding; physical legacy-row cleanup is a distinct gated operation.

No new Law No. 5.389 Source registration is necessary to perform or validate this already-completed identity correction. No precise 1968 name interval was invented, and no further H-733 inquiry is required to close the canonical identity-linkage case.

**Result: Brazil family `FIXED` — active identity resolution, not retirement. Registry expected `52 / 75` terminal, `23` pending. Next work: a DIFFERENT pending political-family case under [Issue #1895](https://github.com/JezCH/atlas-person-db/issues/1895).**
