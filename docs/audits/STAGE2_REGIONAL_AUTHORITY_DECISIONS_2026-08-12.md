# Stage 2 Regional Authority Decisions — 2026-08-12

## Status

**SOURCE-BACKED MODEL CLASSIFICATION ONLY — NO PRODUCTION MUTATION**

This decision record classifies the final ten current Activity rows that still carried unresolved `polity_relation_model` semantics after the Japan and modern dependent/union reviews.

It closes the **model-classification question** for all ten rows. It does **not** claim that every replacement Polity identity, exact phase boundary, structural-relation interval, or Territory reconstruction is already known.

The core ATLAS rule is:

> A formal imperial/provincial title, nominal allegiance, and effective territorial power are separate facts. A historical person can serve a dynasty, nominally accept its authority, rebel against it, and exercise autonomous territorial power in different phases. None of those facts by itself authorizes inventing a new Polity or coloring the parent empire as the person’s direct territory.

---

## 1. Why one additional Polity-relation type is justified

The existing Stage 2 vocabulary already distinguishes formal structures such as:

- `vassal_of`
- `constituent_of`
- `dominion_of`
- `colonial_dependency_of`
- `tributary_to`

The remaining Late Han / Late Yuan material exposes a different repeated pattern:

- a regional political authority exercises substantial autonomous military and territorial power;
- the same authority still accepts, receives, or invokes titles/legitimacy from the imperial dynasty;
- the superior dynasty therefore retains nominal or de jure authority that is not equivalent to effective direct control;
- the relationship is neither ordinary constitutional constituency nor a source-defined feudal vassal kingdom.

The minimal new candidate code is therefore:

`nominally_subordinate_to`

Meaning:

> A de facto territorial political authority retains or accepts a formal/nominal superior relationship to another Polity while exercising substantial autonomous power.

Runtime rule:

> Render the subject from its own Territory Records. Do not make the superior inherit direct-control geometry over the subject merely because nominal authority exists.

This vocabulary extension is justified by the source pattern; it is not added merely to cover an awkward string.

---

## 2. Ying Bu — a source-named dependent kingdom, not Western Han itself

### Source fact

The *Shiji* records Ying Bu being enfeoffed as **King of Huainan** and describes the kingdom through its capital and commandery-level territorial basis. This is stronger evidence than a generic “regional warlord” interpretation: a named dependent kingdom existed.

Primary source:

- Sima Qian, *Records of the Grand Historian*, biography of Qing Bu / Ying Bu, Chinese Text Project digital edition.  
  https://ctext.org/shiji/qing-bu-lie-zhuan

### Current row

- Activity `a77a000e-2fec-5983-afb9-5d7dbc829223`
- Ying Bu
- Western Han
- 202–196 BCE
- King

### ATLAS decision

The current target is semantically wrong because Ying Bu did not rule the whole Western Han.

Correction model:

- **Person Activity target:** `Kingdom of Huainan`
- Person–Polity Relation: `rules`
- Polity relation: `Kingdom of Huainan -> vassal_of -> Western Han`

The exact Huainan Polity UUID must be reused if it already exists or created through the reviewed identity-authoring path if absent. No name-only write is authorized here.

---

## 3. Late Han: provincial office does not automatically create a Polity

Rafe de Crespigny’s work on Later Han local administration establishes the formal administrative framework in which governors and inspectors operated. B. J. Mansvelt Beck’s Cambridge account of Han’s fall shows how that framework fragmented into regional military power during the late second century.

General sources:

- B. J. Mansvelt Beck, “The fall of Han,” *The Cambridge History of China*, Cambridge University Press.  
  https://www.cambridge.org/core/books/abs/cambridge-history-of-china/fall-of-han/CFB7AEDDD40ACD9BB0A76CFE4ADA3318
- Rafe de Crespigny, *An Outline of the Local Administration of the Later Han Empire*, Australian National University, 1980.  
  https://researchportalplus.anu.edu.au/en/publications/an-outline-of-the-local-administration-of-the-later-han-empire/

The resulting ATLAS rule is deliberately conservative:

> `Governor of X` is not enough to create `X Polity`. A distinct regional Polity requires evidence that the authority functioned as a durable political-territorial actor beyond ordinary delegated provincial government.

### Liu Yu — keep Eastern Han

Current Activity:

- `b449d90d-783f-598b-aaeb-67cf37ea549a`
- Eastern Han
- 189–193
- Governor

The reviewed evidence supports loyal Han service and even refusal of schemes to elevate him as emperor. No independent You Province Polity is justified.

Decision:

- **KEEP Eastern Han**
- Person relation: `serves`
- no new structural Polity relation
- no You Province Polity from the office title alone

### Tao Qian — regional military administration, but separate Polity not yet proven

Current Activity:

- `d22767c7-4e64-5c59-a5d9-60e32d146a4c`
- Eastern Han
- 188–194
- Warlord

Tao Qian possessed substantial provincial military authority, but the current reviewed evidence does not require a new Polity identity merely because he controlled the Xu provincial administration.

Decision:

- **KEEP Eastern Han context provisionally**
- Person relation: `serves`
- review/relabel the Role separately
- do not manufacture a `Xu Province` Polity from an administrative jurisdiction

This can be revisited if dedicated territorial research later proves a distinct political authority deserving its own Polity UUID.

---

## 4. Liu Yan — formal governor to de facto regional authority

Primary Later Han tradition presents Liu Yan as a particularly clear transition case. He entered Yi under formal Han appointment but subsequently pursued independent designs; the tradition records Zhang Lu’s seizure of Hanzhong, severing communications and killing Han envoys, and Liu Yan’s adoption of imperial-style symbols.

Sources:

- *Book of the Later Han*, Liu Yan material, Chinese Text Project digital edition.  
  https://ctext.org/text.pl?if=gb&node=76813&show=parallel
- historical compilation preserving the Chuping 2 / 191 Hanzhong episode, Chinese Text Project.  
  https://ctext.org/wiki.pl?chapter=78297&if=en

Current Activity:

- `15777776-b739-5988-9a04-472b2d6629c7`
- Eastern Han
- 188–194
- Warlord

Decision:

- **RETIRE the coarse one-row model and rebuild phases**
- early formal-government phase belongs to Eastern Han service/government context
- later de facto Yi regional authority requires a source-backed territorial Polity identity
- candidate structural relation for the autonomous phase: `nominally_subordinate_to -> Eastern Han`
- exact transition and structural-relation interval remain research-gated

No invented `Liu Yan State` name is authorized.

---

## 5. Yuan Shao — multi-province de facto regional authority

Current Activity:

- `36a3ade9-b108-5358-8732-be7b3f6637f9`
- Eastern Han
- 189–202
- Warlord

The late-Han collapse literature and primary-history tradition support a major territorial authority extending across multiple northern provinces. Treating the whole Eastern Han as Yuan Shao’s direct polity would be false, while treating him as an ordinary central official would also be false.

Decision:

- **RETIRE the coarse Eastern Han Warlord row after phase reconstruction**
- research a source-backed Yuan Shao regional-authority Polity identity and changing Territory intervals
- candidate relation: `nominally_subordinate_to -> Eastern Han` for source-supported phases
- do not turn the Yuan family/lineage itself into the Polity by default

---

## 6. Ma Teng — rebellion, autonomous western power, and later Han service

Current Activity:

- `42274e4c-af35-503f-a14f-e7460489b252`
- Eastern Han
- 189–212
- Warlord

Ma Teng’s career crosses materially different relationships: rebellion/autonomous western military power, acceptance of Han titles, and later central service.

Decision:

- **RETIRE the coarse continuous row**
- rebuild multiple Person–Polity phases rather than forcing one relation over 23 years
- research the exact territorial authority for autonomous phases
- candidate regional structural relation: `nominally_subordinate_to -> Eastern Han` where formal Han titles and de facto autonomy overlap
- later central-office phase should remain direct service/government context within Eastern Han

---

## 7. Liu Biao — durable Jing regional rule under Han legitimacy

Current Activity:

- `583d7e8d-ed63-5a7e-947a-2a3c43f8dfad`
- Eastern Han
- 190–208
- Warlord

Liu Biao received Han appointment but created durable territorial rule in Jing and transferred that regional political base to his son. This exceeds an ordinary transient provincial office, while still operating under Han legitimacy.

Decision:

- rebuild Person phases and a source-backed Jing regional-authority Polity target
- candidate structural relation: `nominally_subordinate_to -> Eastern Han`
- exact Polity identity and interval remain research-gated
- do not equate “Jing Province” the administrative geography with the eventual Polity identity without source review

---

## 8. Lü Bu — mobile service and multiple regional authority phases

Current Activity:

- `5b4fa9a3-ca6f-5e6b-a417-874f31b10650`
- Eastern Han
- 192–198
- Warlord

Primary-history tradition shows Lü Bu moving through service, flight, alliance, and seizure of regional power. A single 192–198 political authority is not defensible.

Decision:

- **RETIRE the coarse row and rebuild phases**
- research Yan/Xu authority phases individually
- do not assume one stable “Lü Bu polity” for 192–198
- candidate `nominally_subordinate_to -> Eastern Han` only for phases where a de facto territorial authority and retained Han title/legitimacy coexist

Primary source:

- Chen Shou, *Records of the Three Kingdoms*, biography of Lü Bu, Chinese Text Project digital edition.  
  https://ctext.org/text.pl?if=gb&node=602263

---

## 9. Late Yuan: Fang Guozhen versus Bolad Temur

The two current “Yuan warlord” rows illustrate why the model cannot be inferred from the word *warlord*.

### Fang Guozhen — de facto autonomous territorial authority with intermittent nominal Yuan submission

Current Activity:

- `8198cad1-dc14-5c1e-9b01-ddbddc447da7`
- Yuan Dynasty
- 1348–1367
- Warlord

The *History of Yuan* repeatedly records Fang fighting Yuan forces, accepting or refusing Yuan offices, retaining his own forces, and ignoring mobilization demands. This is a strong case of autonomous territorial power coexisting with intermittent formal or nominal Yuan subordination.

Decision:

- retire the coarse Person→Yuan Warlord row
- research the exact Fang regional-authority Polity identity and territorial phases
- candidate relation for source-supported phases: `nominally_subordinate_to -> Yuan Dynasty`
- no fabricated Fang-state name

Primary source:

- *History of Yuan*, biography of Fang Guozhen, Chinese Text Project digital edition.  
  https://ctext.org/wiki.pl?chapter=838827&if=gb

### Bolad Temur — factional Yuan commander and central-government actor, separate Polity not proven

Current Activity:

- `2a9029b6-3485-55a3-924f-6e9bc9adb901`
- Yuan Dynasty
- 1359–1365
- Warlord

Bolad Temur fought factional civil war inside the Yuan political system, disobeyed imperial orders, seized the capital, and later entered top central government. The reviewed evidence supports multiple Person→Yuan relation phases; it does **not** yet require a distinct territory-owning Bolad Polity.

Decision:

- keep Yuan as the current political context
- split `serves / governs / conflict` phases as research supports
- **do not create a separate Bolad Temur Polity without additional territorial evidence**

Primary source:

- *History of Yuan*, biography of Bolad Temur, Chinese Text Project digital edition.  
  https://ctext.org/wiki.pl?chapter=649331&if=gb

---

## 10. Result of the final ten structural-model rows

The machine-readable decision builder classifies all ten exact current Activity UUIDs.

Expected classification:

- reviewed remaining structural-signal rows: **10**
- model-classified rows: **10**
- unresolved structural-model classification rows: **0**
- source-named dependent kingdom: **1** — Ying Bu / Huainan
- central-parent-Polity context without new regional Polity: **3** — Tao Qian, Liu Yu, Bolad Temur
- regional-authority target/phase research required: **6** — Liu Yan, Yuan Shao, Ma Teng, Liu Biao, Lü Bu, Fang Guozhen
- `nominally_subordinate_to` candidate rows: **6**
- fabricated regional Polity names: **0**

This means the original 18 source-reviewed `polity_relation_model` signals are now completely **classified at the model level** when combined with:

- Japan layered authority: 4 rows
- modern dependent/union model: 4 rows
- this regional-authority cluster: 10 rows

`4 + 4 + 10 = 18`

That does **not** mean all eighteen can be immediately backfilled. The six regional-authority targets still require historical identity/phase research, and source-backed structural-relation intervals must be established before Production inserts.

---

## 11. Production boundary

No Production write is authorized.

Remaining work before application includes:

- find/reuse or create the exact Huainan Polity UUID through reviewed authoring;
- research exact regional-authority identities and phases for Liu Yan, Yuan Shao, Ma Teng, Liu Biao, Lü Bu, and Fang Guozhen;
- research the exact intervals during which `nominally_subordinate_to` is justified;
- prepare source-linked Polity-relation assertions;
- prepare Person Activity split/relink/retire manifests;
- never derive regional direct-control geometry merely from the Person Activity;
- complete the Stage 2 semantic-key/replay/merge cutover before Production application.

## Conclusion

The final structural-model queue confirms that ATLAS needs to represent three separate layers cleanly:

1. **formal office / service to the parent dynasty**;
2. **nominal superior-subordinate political relationship**;
3. **effective regional territorial political authority**.

Keeping these separate prevents both major map errors: coloring the parent empire as a warlord’s personal territory, and inventing a new state whenever a powerful provincial commander appears.
