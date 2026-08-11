# Stage 2 Kublai Authority Decisions — 2026-08-12

## Status

**SOURCE-BACKED AUDIT ONLY — NO PRODUCTION MUTATION**

This decision record closes the Person–Polity authority semantics for the three current Kublai Khan Activities. It intentionally does **not** fabricate a pre-1271 direct-territory Polity or geometry.

## Source facts

Frederick W. Mote records that Khubilai took the Great Khan title in 1260 and only at the end of 1271 proclaimed that his government in China would be called the Great Yuan dynasty.

Thomas T. Allsen distinguishes Qubilai's universal Grand Qan sovereignty claim from actual administration: after the Mongol imperial fragmentation, Qubilai continued to assert sovereignty over the whole empire while his administrative authority was restricted to his own domains. Allsen also notes that those territories were formally called Yuan in 1271.

Christopher P. Atwood's recent Cambridge history treats Qubilai's eastern formation analytically as the “Yuan Ulus, 1260–1368,” which confirms that a pre-1271 Qubilai political formation can be studied without pretending that the formal Great Yuan designation already existed in 1260.

Sources:

- Frederick W. Mote, “Chinese society under Mongol rule, 1215–1368,” *The Cambridge History of China*.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-china/chinese-society-under-mongol-rule-12151368/9A6883E723707B5FA65850F9AD9AA402
- Thomas T. Allsen, “Grand Qans and Il-qans, 1265–1295,” *Culture and Conquest in Mongol Eurasia*.  
  https://www.cambridge.org/core/books/abs/culture-and-conquest-in-mongol-eurasia/grand_qans_and_ilqans_12651295/2EB9EC01543A034A159265DE731C432B
- Christopher P. Atwood, “The Empire of the Great Khan: The Yuan Ulus, 1260–1368,” *The Cambridge History of the Mongol Empire*.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-the-mongol-empire/empire-of-the-great-khan/41EEE744E9D3545E7111DC25B77C33F2

## Current live rows

The current 346-row ledger already contains the three pieces needed to avoid inventing a new Person/Polity record:

| Activity UUID | Polity | Interval | Role |
|---|---|---:|---|
| `94dc0003-495b-58e6-abec-48860ee6d710` | Mongol Empire | 1260–1271 | Khagan |
| `418d957a-1658-51a6-8b35-71757f712760` | Yuan Dynasty | 1260–1294 | Khagan and emperor |
| `d82b82dc-e263-5116-ae62-888452bc2655` | Yuan Dynasty | 1271–1294 | Emperor and Khagan |

## ATLAS decision

### 1. Mongol Empire 1260–1271

**KEEP as an overarching imperial-claim relation, with `relation_type = claims_rule`.**

This is the key correction to the conservative exact-role classifier, which would otherwise infer `rules` from `Khagan`. The historical source evidence is more specific than the generic role policy.

`claims_rule` here means:

- Qubilai's Grand Qan claim to the Mongol imperial whole is preserved;
- Runtime must **not** infer that all former Mongol imperial territory was under Qubilai's direct control from this Person relation;
- direct territory for Qubilai's own pre-1271 eastern domains remains separate Authoring/Territory research.

### 2. Yuan Dynasty 1260–1294 combined row

**RETIRE.**

This row combines two distinct meanings and back-projects both the Great Yuan dynastic designation and the emperor role before the reviewed 1271 boundary.

It should not be “fixed” by simply changing one field. The two cleaner existing rows preserve the semantics more accurately.

### 3. Yuan Dynasty 1271–1294

**KEEP with `relation_type = rules`.**

The row begins at the defensible Great Yuan proclamation boundary and may be used as the Person–Polity ruling relation. Its map rendering still resolves through time-dependent Yuan Territory records; Person data never owns geometry.

## What remains unresolved

The **Person Activity semantics are closed**, but one map/territory question intentionally remains:

> What exact source-backed territorial Polity/extent should represent Qubilai's own effective administrative domain before the formal Great Yuan designation in 1271?

The answer is not obtained by coloring the whole Mongol Empire, nor by inventing an unsourced `Kublai State` object.

ATLAS may later decide, from dedicated polity/territory research, whether the stable eastern political identity should be represented through an existing Yuan UUID with pre-1271 designations, another source-backed political identity, or Authoring-only unresolved territorial records. That decision is not required to correct the three current Person Activities.

## Machine-readable gate

`scripts/build-kublai-authority-decisions.mjs` verifies all three exact Activity UUIDs against the live 346-row ledger and enforces:

- 3 reviewed rows;
- 2 retained semantic phases;
- 1 competing row retired;
- Mongol Empire relation = `claims_rule`;
- Yuan 1271–1294 relation = `rules`;
- no fabricated pre-Yuan Polity;
- no Production mutation.

## Conclusion

The correct ATLAS representation separates:

1. **imperial sovereignty claim** over the Mongol imperial whole;
2. **actual administrative/direct territorial authority**;
3. **formal Great Yuan ruling phase from 1271**.

This prevents a title such as `Khagan` from automatically producing a false direct-control map of the entire former Mongol Empire.
