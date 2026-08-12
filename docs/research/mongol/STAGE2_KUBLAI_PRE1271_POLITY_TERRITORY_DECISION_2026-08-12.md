# Stage 2 Qubilai pre-1271 Polity / Territory Decision — 2026-08-12

> Status: SOURCE-BACKED MODEL DECISION / NO PRODUCTION MUTATION / NO GEOMETRY FABRICATION

## Question

The Person-Activity semantics are already reviewed:

- Qubilai's overarching Mongol-imperial claim before 1271 is `claims_rule`, not direct control of the whole empire;
- the back-projected combined Yuan 1260–1294 Activity is retired;
- the formal Yuan 1271–1294 ruling phase is `rules`.

The remaining modeling question is whether ATLAS needs to invent a separate pre-1271 Polity merely because the formal **Great Yuan** designation begins in 1271.

## Source basis

Christopher P. Atwood titles the relevant political formation **“The Yuan Ulus, 1260–1368”** in *The Cambridge History of the Mongol Empire*, treating Qubilai's eastern formation as a continuous analytical political entity beginning in 1260.

Thomas T. Allsen describes the fragmented post-civil-war Mongol order as regional polities. He distinguishes Qubilai's universal Grand Qan sovereignty claim from his restricted administrative authority over his own domains and states that those territories were formally called Yuan in 1271.

Frederick W. Mote records that Qubilai took the supreme Mongol title in 1260 and at the end of 1271 proclaimed that his government in China would be called the Great Yuan dynasty.

Sources:

- Christopher P. Atwood, “The Empire of the Great Khan: The Yuan Ulus, 1260–1368,” *The Cambridge History of the Mongol Empire*, 2023/2024. https://www.cambridge.org/core/books/abs/cambridge-history-of-the-mongol-empire/empire-of-the-great-khan/41EEE744E9D3545E7111DC25B77C33F2
- Thomas T. Allsen, “Grand Qans and Il-qans, 1265–1295,” *Culture and Conquest in Mongol Eurasia*. https://www.cambridge.org/core/books/abs/culture-and-conquest-in-mongol-eurasia/grand-qans-and-il-qans-12651295/2EB9EC01543A034A159265DE731C432B
- Frederick W. Mote, “Chinese society under Mongol rule, 1215–1368,” *The Cambridge History of China*. https://www.cambridge.org/core/books/abs/cambridge-history-of-china/chinese-society-under-mongol-rule-12151368/9A6883E723707B5FA65850F9AD9AA402

## ATLAS decision

### Political identity continuity

ATLAS does **not** create an invented `Kublai State` Polity and does **not** require a brand-new Polity UUID at 1271 solely because the formal Great Yuan designation begins then.

The source-backed modeling direction is a **stable eastern Qubilai/Yuan political identity beginning in 1260**, with 1271 represented as a reviewed designation/state-form boundary for **Great Yuan**.

Operationally:

- future canonical Polity identity: reuse one reviewed stable Yuan/Qubilai eastern Polity UUID across the 1260/1271 designation boundary;
- 1260 is the identity/formation boundary supported for the eastern Qubilai polity model;
- 1271 is the formal Great Yuan designation boundary;
- the pre-1271 display designation is not invented here and may remain Authoring-unresolved until a source-grounded naming policy is chosen.

This is an ATLAS identity/continuity inference from the cited scholarship, not a claim that the official Chinese dynastic name “Great Yuan” existed from 1260.

### Territory

Exact pre-1271 geometry remains unresolved.

ATLAS must not:

- color the whole former Mongol Empire as Qubilai's direct territory;
- derive direct control from the title `Khagan`;
- invent borders from later Yuan extent;
- create placeholder GeoJSON.

The pre-1271 Territory layer may remain Authoring-only / unresolved until dedicated source-backed spatial reconstruction is completed. This unresolved geometry does **not** block Person Activity semantic migration or the Polity-identity/designation model.

## Consequence for roadmap

The old single blocker “Qubilai pre-1271 Territory” is decomposed:

- **Polity identity / 1271 designation policy:** resolved at model level by this decision;
- **Person Activity semantics:** already resolved;
- **exact pre-1271 Territory geometry:** intentionally deferred to dedicated map/Territory research and may remain unknown without blocking Stage 2 semantic cutover.

Before Production, Baseline A must still supply the exact surviving Polity/Activity UUIDs. No old 346-row UUID is authorized as a future write target by this document.