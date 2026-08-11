# ATLAS Polity Semantic Audit — Wave 3

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: composite monarchies, crown-polities, dynasty-state labels, and polity-identity continuity.

## 1. New distinction discovered in Wave 3

Two independent questions must be answered for every suspicious label:

1. **Entity validity** — does this term refer to a real historical political actor / territorial authority?
2. **Identity continuity** — even if both labels are valid, do they represent different Polity UUIDs, or different time-indexed names/forms of the same continuing Polity?

This distinction prevents two opposite errors:

- deleting valid composite or dynastic states just because their English names contain `Monarchy`, `Crown`, or `Dynasty`;
- splitting a continuous political actor into fake successive states merely because its official title/state form changed.

ATLAS therefore needs, conceptually, a future `Polity Name / State Form History` layer separate from Polity identity.

Example:

`Polity UUID: continuing Russian political state`

- before 1721 display/state form: `Tsardom of Russia`
- from 1721 display/state form: `Russian Empire`

This is different from a true succession/conquest case such as Ming -> Qing, where separate political actors are historically defensible.

## 2. Composite monarchy / crown decisions

| Activity UUID | Person | Current Polity | Period | Role | Decision | Audit conclusion | Map / model consequence | Confidence |
|---|---|---|---:|---|---|---|---|---|
| `f14fb8c7-b291-4624-8792-9a4ddebd8e46` | Maria Theresa | Habsburg Monarchy | 1740–1780 | Archduchess of Austria and Queen of Hungary and Bohemia | `KEEP` | `Habsburg Monarchy` is a standard scholarly designation for the composite political entity of Habsburg lands. Its constituent lands, especially Hungary, retained significant distinct constitutional/state status. | Keep the high-level composite Polity. Future hierarchy should allow constituent polities/lands and overlapping territorial authority rather than flattening the monarchy into modern `Austria`. | very high |
| `56ec9e4a-33a0-4922-8619-70f7565c8bb6` | Charles V | Spanish Monarchy | 1516–1556 | King | `KEEP` | There was no single legal `Kingdom of Spain` in Charles/Philip's sixteenth-century composite monarchy; scholarship explicitly describes the collection of Iberian and overseas crowns/territories as the Spanish Monarchy/composite monarchy. | Keep `Spanish Monarchy` as a defensible high-level composite Polity; preserve constituent crowns/kingdoms as child/overlapping Polities. | very high |
| `3373433e-d600-48b2-9639-79e08f4589f4` | Charles V | Holy Roman Empire | 1519–1556 | Holy Roman Emperor | `KEEP` | Charles simultaneously held the imperial office and the Spanish composite monarchy. These are not duplicate labels for one polity. | Keep simultaneous relationship. Territory rendering must distinguish HRE constitutional authority from Charles's hereditary/composite monarchical possessions. | very high |
| `c2bf3f5f-d7ff-408f-9778-19e94ab4d7a4` | Philip II of Spain | Spanish Monarchy | 1556–1598 | King | `KEEP` | The Spanish Monarchy remained a composite collection of crowns and territories under Philip II; a single unitary Kingdom of Spain did not yet replace those legal-political structures. | Keep composite Polity. | very high |
| `af6cb560-64d9-4540-9f58-07ac2880a26c` | Philip II of Spain | Kingdom of Portugal | 1580–1598 | King | `KEEP` | Portugal remained a distinct crown/kingdom under the Iberian Union even while Philip ruled it alongside his other crowns. | Keep simultaneous child/constituent Polity relation rather than absorbing Portugal into one hard Spanish polygon. | very high |
| `a1d81b84-d5d7-483c-83f2-e5447b0e40c9` | Isabella I of Castile | Crown of Castile | 1474–1504 | Queen | `KEEP` | The Crown of Castile was itself a historical state/crown polity comprising Castile-Leon and conquered territories. Isabella's marriage to Ferdinand did not legally dissolve Castile into a unitary Spain. | Keep Crown of Castile. The personal/dynastic union with the Crown of Aragon should be expressed through shared rulers / composite-monarchy relationships, not by replacing Castile with modern Spain. | very high |

## 3. Chinese dynasty-state decisions

`Dynasty` in an English conventional name is not a semantic type declaration.

Academic histories routinely discuss Sui, Yuan, Ming and Qing as states/empires/polities with territory, administration, rulers and external relations. Their ruling houses and their political states overlap in terminology, but that does not make the Polity invalid.

Representative frozen-baseline rows:

| Activity UUID | Person | Current Polity | Period | Decision | Audit conclusion |
|---|---|---|---:|---|---|
| `24a376d6-d559-4e96-8d99-d9a11f0136ef` | Emperor Wen of Sui | Sui Dynasty | 581–604 | `KEEP` | The Sui was a reunified imperial state, not merely a family label. |
| `888a8e91-084b-4d83-af58-1114c95ae04b` | Emperor Yang of Sui | Sui Dynasty | 604–618 | `KEEP` | Same Polity identity remains defensible. |
| `45f4c83e-edad-4be1-ab57-16979b0c89d3` | Emperor Taizu of Ming | Ming Dynasty | 1368–1398 | `KEEP` | Ming is a territorial imperial state/polity in the historiography. |
| `762cfe1a-ff0a-41ae-931a-525144b54dc0` | Zheng He | Ming Dynasty | 1405–1433 | `KEEP` + future `RELATION_FIX` | Polity is correct; Zheng He served the Ming state rather than ruled it. |
| `d44706a8-8239-42f9-b871-a9db6be26e95` | Yongzheng Emperor | Qing Dynasty | 1722–1735 | `KEEP` | Qing scholarship explicitly treats the Qing as a polity/empire/state. |
| `0b94ab53-47dc-4ecf-90f2-e9ee77cf8604` | Ching Shih | Qing Dynasty | 1807–1810 | `KEEP` entity + `RELATION_FIX` review | Qing is a valid Polity, but a pirate leader's relationship to Qing is not `rules/serves`; this demonstrates why Polity validity and Person–Polity relation are independent. |
| `2fd20ec6-0ff7-4ae7-a538-3dcd5b07dd6e` | Kublai Khan | Yuan Dynasty | 1271–1294 | `KEEP` + `RESEARCH` relation overlap | Yuan was a real imperial polity. Kublai also retained claims/status as Great Khan, so the transition from `Mongol Empire` to `Yuan` should not be treated as a simple mutually exclusive nationality switch without further authority-layer review. |

### Chinese-state rule

Do not replace Sui/Tang/Ming/Qing/Yuan automatically with a timeless `China` Polity.

A dynastic transition can represent real conquest, state destruction, civil war, regime-state replacement, territorial restructuring, or competing claims. Whether two dynastic states share a deeper civilizational continuity does not make them one unchanged map-level political actor.

Polity continuity must be judged at the political-actor level, not the civilization-name level.

## 4. Russia 1721 — identity continuity candidate

Frozen rows:

- `32e33450-e22a-4a5e-b4d2-b64eaa0b62a6` — Peter I -> Tsardom of Russia, 1682–1721, Tsar
- `203f8649-582e-4bdf-8a30-ad5084fe3303` — Peter I -> Russian Empire, 1721–1725, Emperor

### Decision: `IDENTITY_CONTINUITY_RESEARCH` (do not mutate yet)

Cambridge histories describe Peter as transforming the traditional Russian tsardom and formally proclaiming/constituting the imperial form under the same reign. There is no obvious sovereign rupture in 1721 comparable to conquest by a new political actor.

For ATLAS map identity, it is therefore probably misleading to make 1721 look like:

`Tsardom of Russia dies -> unrelated Russian Empire is born`

The more robust model is likely:

- one continuing Polity identity;
- time-indexed official/conventional name and state form;
- territorial history continues across 1721;
- ruler's role changes `Tsar -> Emperor`;
- 1721 remains a major constitutional/title/state-form event.

However, the current schema does not yet have time-indexed Polity names/state forms, so these two UUIDs must not be merged until that representation exists and all other references are audited.

Confidence: high that continuity must be reviewed; medium/high that one Polity identity is the eventual correct model.

## 5. Revised Polity audit decision model

Every candidate now receives two axes:

### Axis A — semantic entity type

- political actor / territorial authority -> Polity candidate
- government/regime only -> not Polity by itself unless scholarship demonstrates broader political-actor identity
- dynasty/house only -> not Polity
- event/process -> not Polity
- people/culture only -> not Polity

### Axis B — identity continuity

- `SAME_POLITY_NAME_CHANGE` — same political actor, different title/name/state form
- `SUCCESSOR_POLITY` — new political actor succeeds prior one
- `PARALLEL_POLITY` — overlapping political actors coexist
- `COMPOSITE_PARENT_CHILD` — composite monarchy/confederation and constituent polity coexist at different authority levels
- `UNCERTAIN_CONTINUITY` — scholarship/model not sufficient yet

This second axis is required before any future Polity merge or relink engine is implemented.

## 6. Key results

- `Habsburg Monarchy` -> valid high-level composite Polity, not a dynasty-only error.
- `Spanish Monarchy` -> valid high-level composite Polity for Charles V / Philip II; do not invent a unitary sixteenth-century Kingdom of Spain.
- `Crown of Castile` -> valid crown/state Polity.
- `Ming/Qing/Sui/Yuan Dynasty` -> valid state-polity names in context; no lexical purge.
- `Tsardom of Russia -> Russian Empire, 1721` -> likely identity continuity/name-state-form issue rather than true Polity succession; requires a temporal naming/state-form layer before correction.

## 7. Architecture implication before correction engine

The correction system should not only support `relink_activity` and `split_activity`.

Before any Polity-level consolidation, the model needs a safe representation for:

- Polity parent/constituent or overlapping authority relationships;
- time-indexed preferred/conventional Polity names;
- state-form/regime history;
- Polity identity continuity/succession evidence.

This does **not** mean building every future ontology table now. It means the audit must distinguish these semantics so the eventual correction cannot destroy real historical distinctions.

## 8. Correction gate remains unchanged

No Production mutation is authorized by this file.

Fresh Production reconciliation, exact UUID before-state verification, reviewed correction manifests, dry-run, bounded change sets and map-semantic post-verification remain mandatory.
