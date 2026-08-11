# ATLAS Polity Semantic Audit — Wave 11

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: non-ruler / intellectual / religious / activist / traveler Person × Polity semantics.

## 1. Core distinction

For non-rulers, the current `Person -> Polity` edge must never be rendered as territorial ownership merely because a valid Polity is present.

At least four meanings occur in this Wave:

- `serves` — formal service to the polity/state/jurisdiction;
- `active_in` — intellectual, religious, social, artistic or civic activity within/under the polity;
- `opposes` — political resistance/reform/opposition directed at the polity or its regime/colonial order;
- `rules/claims_rule` — exceptional nontraditional cases in which a religious/revolutionary leader also exercised political authority.

A single lifetime/activity row can still be wrong even when the Polity itself is valid. Long-distance travelers and people whose political environment changed repeatedly require multiple temporal/context relations rather than one homeland label stretched across decades.

## 2. Individual decisions

| Activity UUID | Person | Current Polity | Period | Role | Decision | Recommended semantics |
|---|---|---|---:|---|---|---|
| `36dbf6db-e39e-454d-af3e-6eae7343cb55` | Confucius | State of Lu | -522–-479 | Philosopher, educator and political thinker | `KEEP_POLITY` + `SPLIT` + `RELATION_FIX` | Lu is a valid polity and Confucius had office/strong civic ties there, but traditional and modern scholarship also describes extended travel among other states before his return to Lu c.484 BCE. Use `serves/active_in` for Lu by period and represent interstate travel separately; do not imply Lu territorial rule. |
| `53038d48-fa0e-4ffa-a6e3-b4737f6761d1` | Gilbert du Motier, Marquis de Lafayette | Kingdom of France | 1777–1830 | Military officer and statesman | `SPLIT` + `RELINK` | One Kingdom-of-France row is impossible across the American Revolution, French Revolution, imprisonment/exile, Restoration and July Revolution. Create separate U.S./French political-service and activity contexts by period; do not treat 1777–1830 as continuous service to the Bourbon/royal polity. |
| `27927c3a-9912-4f4b-a35c-698f097164c7` | Niccolo Machiavelli | Republic of Florence | 1498–1527 | Political philosopher, diplomat and statesman | `KEEP_POLITY_CONTEXT` + `SPLIT` + `REGIME_REVIEW` | Machiavelli formally served the Florentine republic 1498–1512. The Medici restoration removed him from office; later he received Medici patronage/assignments. A continuous `Republic of Florence` service Activity to 1527 is wrong. Future model should distinguish Florence polity continuity from republican/Medici regime phases. |
| `7a5e4263-d4fe-4fc9-90ab-79a9134ad1a3` | Ada Lovelace | United Kingdom | 1833–1852 | Mathematician and writer | `KEEP` + `RELATION_FIX` | United Kingdom is a valid political context, but Lovelace did not govern or serve it as a state official in the territorial sense. Relation should be `active_in`; map must not interpret UK geometry as her territory. |
| `dc9e6426-ecd9-4b2c-adf1-1bfafba8c52e` | Ibn Battuta | Marinid Sultanate | 1325–1355 | Explorer, traveler and jurist | `SPLIT` + `MULTI_CONTEXT` | He left Tangier in 1325, spent roughly twenty-four years traveling across numerous polities and served in places including the Delhi Sultanate before returning to the Marinid realm. `Marinid Sultanate 1325–1355` is valid as origin/return/court context, not as the polity of his entire active travel period. |
| `210346b0-f0b9-4804-85fb-b04a2a0730c5` | Harriet Tubman | United States | 1849–1913 | Abolitionist, humanitarian and Union scout | `KEEP_POLITY` + `SPLIT_RELATION` | United States is a valid political context, but her relationship changes: escaped slavery and resisted the slave/fugitive-slave order; later served the Union as scout/nurse during the Civil War; later remained an activist. Use temporal `opposes/active_in/serves`, never `rules`. |
| `ad5246d1-a4d6-40a3-99c8-df833c3153ed` | Jose Rizal | Captaincy General of the Philippines | 1882–1896 | Nationalist, writer and reformist | `KEEP_POLITY` + `RELATION_FIX` + `SPATIAL_CONTEXT_REVIEW` | The Captaincy General is a useful dependent colonial jurisdiction/Polity context. Rizal was a reformist subject/opponent of colonial abuses, not its ruler. He spent substantial periods abroad and was exiled in Dapitan 1892–1896, so physical activity geography belongs in Place/Event relations while political relation should be `opposes/reformist` or a later equivalent. |
| `0c5f9951-5c4a-4d41-b033-812081b9415b` | Jesus | Roman Empire | 27–30 | Religious leader and preacher | `KEEP` + `RELATION_FIX` | Roman Empire is a valid high-level political context. Relation is `active_in`, not rule/service. Local Judaean/Galilean administrative and Herodian contexts may later be added as finer geographic/political context without replacing the Roman imperial parent. |
| `6c57691c-a66f-4c73-b400-27661ad9b53e` | Gautama Buddha | Shakya Republic | -445–-400 | Religious leader and philosopher | `KEEP_POLITY` + `SPLIT/MULTI_CONTEXT_RESEARCH` | Shakya is a defensible political community associated with the Buddha's origin, but the teaching career ranged through multiple north Indian polities, especially the wider Kosala/Magadha world. Do not stretch Shakya over the whole religious activity span solely as homeland. Chronology itself remains historically debated. |
| `68dceaf4-aba6-4f06-91b3-894e97633d24` | Muhammad | Medinan Polity | 622–632 | Religious leader, statesman and military leader | `KEEP` + `RELATION_RULES` | Scholarship treats the post-Hijra Medinan community as an organized polity/confederative community under Muhammad's political/judicial authority, expanding far beyond Medina by the end of his life. Keep the polity; attach evolving Territory Records rather than replacing it with a static Medina polygon. |
| `35b64add-edda-448c-bc17-afa17bf836f5` | Sophia Duleep Singh | United Kingdom | 1907–1948 | Suffragette and social activist | `KEEP` + `RELATION_FIX` | United Kingdom is the valid political/civic context of her suffrage activism. Relation is `active_in` with opposition to specific state policies/institutions, not territorial rule and not generic state service. |
| `832f0675-0a18-4afa-ad49-af71de75cdf6` | Subhas Chandra Bose | Provisional Government of Free India | 1943–1945 | Head of State and Supreme Commander | `KEEP_CLAIMANT_POLITY` + `RELATION_RULES/CLAIMS_RULE` | Azad Hind was a provisional government-in-exile/claimant state structure led by Bose, with Japanese support and limited/contested practical authority including a formal transfer of political control over Andaman/Nicobar in 1943 while Japanese military occupation remained decisive. Keep as claimant/provisional Polity; Territory Records must distinguish claimed India from limited administered/effective control. |
| `f2d791d0-308d-43e3-a925-13c3f45c5a1b` | Leonardo da Vinci | Republic of Florence | 1472–1519 | Artist, engineer and polymath | `SPLIT` + `MULTI_CONTEXT` | Florence is valid for early and later phases, but Leonardo was principally active in Milan c.1482–1499, Florence c.1500–1508, Milan again, Rome 1513–16 and France 1516/17–1519. A single Florence Activity through death is structurally false. Use multiple `active_in/serves_patronage` contexts; do not infer territorial rule. |

## 3. Map/runtime consequences

### A. `active_in` must never paint the Polity as personal territory

Examples:
- Ada Lovelace -> United Kingdom
- Jesus -> Roman Empire
- Sophia Duleep Singh -> United Kingdom

Runtime behavior:
- optionally highlight the relevant polity as historical context;
- explicitly label the relation as activity/civic context;
- never render `territory ruled by person`.

### B. Political opposition is not the same as foreignness

Examples:
- Harriet Tubman and the U.S. slavery/fugitive-slave order;
- José Rizal and Spanish colonial rule in the Philippines;
- suffrage activists challenging British institutions.

A person can belong to/live inside a polity and oppose its regime, law or colonial system. `opposes` therefore must not mean `foreign enemy`.

### C. Travel/activity geography is not Polity identity

Examples:
- Ibn Battuta
- Leonardo da Vinci
- Lafayette
- Confucius

These demonstrate the eventual need for Person–Place/Event activity records in addition to Person–Polity political relations. Attempting to encode all movement in one Polity column creates false continuity.

### D. Claimant governments need claimed-vs-effective territory

Azad Hind shows why ATLAS Territory Records already need separate control semantics:
- `claimed`
- `effective/administrative`
- `military occupation by another polity`

A claimant/provisional Polity can be historically important without coloring its full claim as effective control.

## 4. Source basis

### Confucius
- Cambridge and Stanford scholarship: Confucius belonged strongly to Lu but also moved among states; traditional chronology places his return to Lu in 484 BCE.

### Lafayette
- Library of Congress Lafayette collections/resources: service in the American Revolution, participation in the French Revolution, imprisonment/exile, return to French politics, and role in the 1830 Revolution. This disproves one continuous `Kingdom of France 1777–1830` relation.

### Machiavelli
- *The Cambridge Companion to Machiavelli*: served the Florentine republican chancery from 1498 to November 1512; the Medici restoration removed him from office, with later Medici patronage/assignments.

### Leonardo
- Metropolitan Museum of Art: principally active in Florence 1472–c.1482 and 1500–1508; Milan c.1482–1499 and 1508–13; Rome 1513–16; France 1516/17–1519.

### Ibn Battuta
- Cambridge scholarship on the `Rihla`: left Tangier in 1325, traveled for roughly twenty-four years across the Islamicate world, returned home in 1349, traveled again, and completed the travel account at the Marinid court by 1355/56.

### Harriet Tubman
- Library of Congress: escaped slavery in 1849, repeatedly returned via the Underground Railroad, and later served as Union scout/nurse during the Civil War.

### José Rizal
- National Historical Commission of the Philippines / Dapitan official historical material: political reform writings, arrest/deportation, and exile in Dapitan 1892–1896 under Spanish colonial administration.

### Muhammad / Medinan polity
- Cambridge scholarship on the Constitution of Medina and early Islamic political organization: post-622 community/umma formed a political-confederative order under Muhammad; by c.628–632 his authority expanded through the Hijaz and wider Arabia.

### Subhas Chandra Bose / Azad Hind
- Government of India and President of India historical materials: Bose headed the Provisional Government of Azad Hind; Japan announced transfer of Andaman/Nicobar, while Japanese occupation/control remained a crucial constraint.

## 5. Structural conclusion

The audit should stop treating `Person–Polity Activity` as a universal substitute for biography.

Recommended conceptual separation:

- Person–Polity relation: political/legal/institutional relationship;
- Person–Place activity: where a person actually lived/traveled/worked;
- Person–Event role: participation in revolution, expedition, war, movement, exile, etc.;
- Person–Institution role: Academy, church, court, army, scientific institution, movement, where needed later.

Do not create all these schema objects immediately. Finish the audit first, then implement only the relation surfaces shown to be repeatedly necessary.

## 6. Coverage increment

New exact frozen Activity UUIDs audited in this Wave: **13**

Previous covered total: **194 / 309**

New covered total: **207 / 309 = 66.99%**

Frozen rows remaining without any audit decision: **102**

No Production mutation is authorized by this document.
