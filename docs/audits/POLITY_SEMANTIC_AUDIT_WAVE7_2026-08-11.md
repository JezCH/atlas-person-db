# ATLAS Polity Semantic Audit — Wave 7

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: re-audit of the frozen snapshot's previously accepted `normal polity transitions`.

## 1. Why the old `normal transition` category is insufficient

The frozen integrity audit grouped several pairs as ordinary transitions because one row ended when another began. Historical-map semantics show that this is not enough.

The same-looking chronology can represent very different structures:

- a true successor polity;
- a continuing polity under a new name/state form;
- a new federal/composite parent while the old polity survives as a constituent;
- a historiographic relabeling of the same state;
- parallel offices/authority levels that should overlap;
- a claimant title surviving after effective territorial fragmentation.

Therefore `end year A == start year B` must never be treated as proof of polity succession.

## 2. Frozen transition inventory

The 2026-08-05 snapshot had nine transitions previously classified as normal:

1. Vladimir Lenin — Soviet Russia -> USSR
2. Emperor Huizong of Yuan — Yuan -> Northern Yuan
3. Koke Temur — Yuan -> Northern Yuan
4. Otto von Bismarck — Prussia -> German Empire
5. Benjamin Franklin — Province of Pennsylvania -> United States
6. Peter I — Tsardom of Russia -> Russian Empire
7. Kublai Khan — Mongol Empire -> Yuan
8. Maria I of Portugal — Kingdom of Portugal -> United Kingdom of Portugal, Brazil and the Algarves
9. Hypatia — Roman Empire -> Byzantine Empire

Waves 5–6 already established that several of these are not simple successors. This wave closes the remaining transition semantics.

## 3. Yuan -> Northern Yuan, 1368

### Emperor Huizong / Toghon Temur

- `355d0cee-ee25-40b3-af55-5c1a0d57235b` — Yuan Dynasty, 1333–1368, Emperor
- `45b456d1-80ed-4b0e-b3ef-ec838ff96626` — Northern Yuan, 1368–1370, Emperor

Decision: `SAME_POLITY_CONTINUITY_RESEARCH`.

Recent Cambridge scholarship emphasizes that Great Yuan governmental institutions and sovereignty claims continued after 1368 outside the Ming-held Chinese heartland. Surviving administrative documents from Qara-Qoto demonstrate continuing Great Yuan regional governance after the loss of Dadu, and Ming diplomatic correspondence continued to address successive Great Khans as rival rulers.

`Northern Yuan` is therefore useful as a modern conventional label for the post-1368 phase, but ATLAS must not automatically make 1368 look like:

`Yuan polity dies -> unrelated Northern Yuan polity appears`.

Likely final model:

- continuing Great Yuan political identity across 1368;
- drastic Territory History contraction/reorientation after the Ming conquest;
- time-indexed conventional display label `Northern Yuan` for the post-1368 phase if useful;
- Ming and Yuan coexist as rival Polities after 1368 rather than one mechanically succeeding the other everywhere.

### Koke Temur

- `18ac966d-fe39-40cc-83ec-3b2ab125c6b6` — Yuan Dynasty, 1355–1368, General
- `072a5290-dca8-4c37-8afb-dfb10932e763` — Northern Yuan, 1368–1375, General

Decision: `SAME_POLITY_CONTINUITY_RESEARCH` + future `RELATION_FIX=serves`.

The clean 1368 split appears to reflect the database's label change rather than an actual change of employer to an unrelated state. If Great Yuan continuity is adopted, these rows should either be merged chronologically or retain a display-phase split while pointing to one underlying Polity UUID.

Do not merge until the temporal Polity-name/state-form layer exists.

Confidence: high that 1368 requires continuity semantics; medium/high on one-UUID implementation pending the wider Yuan map model.

## 4. Prussia -> German Empire, 1871

### Otto von Bismarck

- `7d8a9076-5222-43cc-b77a-d2dcda3c8a6b` — Kingdom of Prussia, 1862–1871, Minister President
- `6770ab36-d2c1-4364-9cab-67200f7f7e16` — German Empire, 1871–1890, Chancellor

Decision: `NEW_COMPOSITE_PARENT + OVERLAP_CORRECTION`.

The 1871 Imperial Constitution explicitly lists Prussia as one of the federal states forming the German Reich. Prussia therefore did not cease to exist when the German Empire formed.

Bismarck's own 1890 resignation asks to be discharged simultaneously from the posts of Reich Chancellor, Prussian Minister-President and Prussian Foreign Minister. His Prussian minister-presidency thus continued after 1871 alongside his Reich chancellorship.

The current data is materially wrong because it encodes:

`Prussian office ends 1871 -> German office replaces it`

The historically faithful model is overlapping relationships:

- Bismarck -> Kingdom of Prussia -> Minister President -> 1862–1890 -> `serves/governs` at constituent-state level;
- Bismarck -> German Empire -> Chancellor -> 1871–1890 -> `serves/governs` at federal-imperial level;
- Prussia -> German Empire -> `federal_member/constituent` from 1871.

Map consequence:

- Prussia remains a child/constituent territorial Polity inside the German Empire;
- the German Empire is a new higher-level federal Polity;
- Runtime must be able to show both without double-counting them as two mutually exclusive world territories.

Confidence: very high.

## 5. Province of Pennsylvania -> United States, 1776

### Benjamin Franklin

- `31f92f81-58e1-459d-a9bb-83e35a1ccf8a` — Province of Pennsylvania, 1757–1776, colonial agent
- `bb21742e-02d1-4b11-ba6e-d44eccf9d02d` — United States, 1776–1790, statesman/diplomat

Decision: `KEEP TRANSITION`, but classify the relationship as `REVOLUTIONARY_NEW_PARENT / SUCCESSOR_CONTEXT`, not a polity rename.

Wave 6 established the Province of Pennsylvania as a defensible subordinate colonial Polity and Franklin's role as an institutional colonial agent. The United States is a new national/federal political actor emerging through the Revolution and independence process, not a renamed Province of Pennsylvania.

The current 1776 boundary is therefore conceptually defensible because the **role and political authority context change together**.

Future model still requires:

- Province of Pennsylvania / later Pennsylvania state identity continuity research;
- Pennsylvania -> United States constituent/federal relationship after independence;
- Franklin's U.S. relation as `serves`, not `rules`.

No correction is required merely because both rows meet in 1776.

Confidence: high.

## 6. Mongol Empire -> Yuan, 1271

### Kublai Khan

- `243cbb98-4550-4e6a-a700-aeb5704831c7` — Mongol Empire, 1260–1271, Khagan
- `2fd20ec6-0ff7-4ae7-a538-3dcd5b07dd6e` — Yuan Dynasty, 1271–1294, Emperor and Khagan

Decision: `PARALLEL_CLAIM_AND_DOMAIN_RESEARCH`; current clean transition is oversimplified.

Cambridge scholarship makes two points that must coexist:

1. by the mid-1260s the former unified Mongol Empire had fragmented into increasingly independent regional khanates, so Kublai's effective administrative authority did not cover a single undivided empire;
2. Kublai continued to assert sovereignty as Great Khan over the wider Chinggisid empire while formally naming his own territories/government `Great Yuan` in 1271.

Therefore 1271 is not best represented as:

`Mongol Empire disappears -> Yuan starts`.

A more faithful model will likely require:

- Yuan as Kublai's principal territorial Polity/domain from 1271;
- a distinct Great Khan / wider Mongol imperial claim relation, probably `claims_rule` or an overlordship/claim authority layer;
- the other khanates as separate Polities after fragmentation;
- no giant direct-control Mongol Empire polygon attributed to Kublai merely because he held the qaghan title.

The pre-1271 `Mongol Empire` row also needs re-evaluation for effective-vs-claimed authority during the Toluid civil-war fragmentation.

Confidence: very high that the current binary switch is too simple; medium on final schema representation.

## 7. Kingdom of Portugal -> United Kingdom of Portugal, Brazil and the Algarves, 1815

### Maria I of Portugal

- `45ad2db1-7a58-431e-b23a-757ed85bb055` — Kingdom of Portugal, 1777–1815, Queen
- `5bc98161-7324-4636-bb28-1245de42f1d3` — United Kingdom of Portugal, Brazil and the Algarves, 1815–1816, Queen

Decision: `NEW_COMPOSITE_PARENT + CONSTITUENT_CONTINUITY_RESEARCH`.

Cambridge scholarship describes the 1815 creation of the United Kingdom as a political reconfiguration that elevated Brazil to a kingdom/equal status with Portugal. The new union therefore should not be treated as proof that Portugal itself vanished as a historical territorial identity.

Likely model:

- Kingdom of Portugal continues as a constituent kingdom/territorial Polity;
- a new composite United Kingdom becomes the higher-level monarchical Polity in 1815;
- Maria's royal title/authority acquires the new union-level form while her relationship to Portugal does not necessarily cease in the map ontology;
- Brazil's pre-1815 colonial and post-1815 constituent-kingdom status must be modeled separately in the polity hierarchy.

Therefore the current exact replacement at 1815 is probably too simple and may eventually require overlapping parent/child relations.

Confidence: high on composite-parent formation; medium/high on exact one-UUID/overlap implementation for Portugal pending full Portuguese-state audit.

## 8. Previously reviewed transitions incorporated from Wave 5

### Peter I — Tsardom of Russia -> Russian Empire

`SAME_POLITY_NAME_STATE_FORM_RESEARCH`.

Likely one continuing Polity identity; Activity split remains because `Tsar -> Emperor` role changes.

### Vladimir Lenin — Soviet Russia / RSFSR -> USSR

`NEW_COMPOSITE_PARENT + OVERLAP_RESEARCH`.

RSFSR continues as a constituent republic; USSR is a new union parent. Current clean replacement is oversimplified.

### Hypatia — Roman Empire -> Byzantine Empire at 395

`PARTITIONED_CONTINUITY / IDENTITY_MODEL_RESEARCH`.

395 is not a clean birth of an unrelated Byzantine state; Hypatia's intellectual `active_in` relation should not be split solely because modern historiography changes labels.

## 9. Result: only one of the nine old transitions survives unchanged at the semantic level

The old integrity audit correctly detected chronological boundaries, but it was not designed to answer polity ontology.

Current reclassification:

- Lenin: revise
- Yuan -> Northern Yuan: revise/research continuity
- Koke Temur Yuan -> Northern Yuan: revise/research continuity
- Bismarck: **definite correction required**; Prussian office must overlap German office
- Franklin: current transition broadly defensible
- Peter I: revise identity continuity
- Kublai: revise/authority overlap research
- Maria I: revise composite-parent semantics
- Hypatia: revise Roman continuity semantics

Thus `transition detected` and `transition historically correct` must be separate validation concepts.

## 10. Correction-engine implication

A safe correction manifest needs operations beyond simple `relink_activity`:

- `extend_activity_period`
- `split_activity`
- `add_parallel_activity`
- `relink_activity`
- `set_relation_type`
- `link_polity_parent_child`
- `record_polity_continuity`
- `record_temporal_polity_name_or_state_form`

These are design requirements from historical evidence, not approval to implement every operation immediately.

The first actual corrections should be restricted to cases that the present/forthcoming schema can represent without information loss. Bismarck is a strong future test case once parallel activities and parent/child polity relations are supported.

## 11. Correction gate

No Production mutation is authorized.

The nine frozen transition cases must be rechecked against a fresh Production snapshot before any change set is generated.
