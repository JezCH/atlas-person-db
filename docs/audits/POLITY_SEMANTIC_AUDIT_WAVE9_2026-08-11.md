# ATLAS Polity Semantic Audit — Wave 9

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: city-polity/local territorial authority validation + Shu-Han chronology correction.

## 1. Why this wave exists

Two opposite errors must be avoided:

1. rejecting a valid Polity merely because its name is also a city/region name;
2. keeping a valid Polity label attached to a person during years when that Polity did not yet exist or did not continuously exist.

For ATLAS, a city, domain, province, or regional label may be a Polity when it represented a meaningful territorial political authority/jurisdiction at the relevant time. Polity validity and Activity chronology are separate verdicts.

## 2. City-polity / local authority decisions

| Activity UUID | Person | Current Polity | Period | Role | Decision | Reason / map semantics |
|---|---|---|---:|---|---|---|
| `bfddca79-9443-40b8-abbe-0ad45e08d989` | Pericles | Athens | -461–-429 | Strategos and statesman | `KEEP` + `RELATION_REVIEW` | Athens was an autonomous polis and imperial political power. Polity is valid; Pericles was a dominant statesman/strategos, not a hereditary territorial monarch, so relation semantics must avoid implying sole personal ownership of Athenian territory. |
| `587b0467-d7c0-40b5-bf82-4b246c82d647` | Plato | Athens | -387–-348 | Philosopher and founder of the Academy | `KEEP` + `RELATION_FIX` | Athens is a valid polis. Plato did not rule or serve as territorial executive; this should become `active_in` or an equivalent intellectual/civic activity relation. |
| `93b50bf5-9468-41ea-93a4-12510b9ed0c4` | Gorgo | Sparta | -490–-480 | Queen | `KEEP` + `RELATION_REVIEW` | Sparta/Lacedaemon was an autonomous Greek polis. Polity valid; queenly status requires relation semantics distinct from sole rule. |
| `b04112e0-7ddb-45ad-a6ad-f8f9b083b3de` | Gorgo of Sparta | Sparta | -490–-480 | Queen and royal adviser | `KEEP` + `DUPLICATE_PERSON_REVIEW` | Same valid Sparta context, but this appears to be a second Person identity for the same historical Gorgo. Polity audit keeps Sparta; Person duplicate system must resolve identity separately. |
| `58c4e286-e94a-42df-8129-954dc53ca7dc` | Wak Chanil Ajaw | Naranjo | 682–741 | Ruler and dynastic founder | `KEEP` | Current scholarship explicitly treats Naranjo as a Classic Maya polity with its own royal family/domain, even when subordinated within Kaanu'l hegemony. Subordination does not erase Polity identity; model Kaanu'l relation separately. |
| `f3d3f275-62c4-464d-959d-0f4c98dd8685` | Chan Imix Kʼawiil | Copán | 628–695 | Ajaw | `KEEP` | Copán was a dynastic Maya political center/kingdom with territorial authority; Chan Imix Kʼawiil is attested as its 12th ruler for 628–695. Map should attach territory to Copán polity, not merely to the archaeological place. |
| `308ac997-4de9-4b9d-add3-855333809c58` | Sayyida al-Hurra | Tetouan | 1515–1542 | Queen and corsair leader | `KEEP` + `CHRONOLOGY_REVIEW` | Research describes Tétouan as a highly autonomous city-state and Sayyida as its governor/ruler pursuing an independent policy. `Tetouan` is therefore defensible as a territorial Polity. Sources differ on whether her sole governorship begins 1515 or c.1519, so dates should be reviewed separately. |
| `138e07f9-ae76-4901-85e0-debab7b82b1a` | Amina | Zazzau | 1576–1610 | Queen and military leader | `KEEP` + `CHRONOLOGY_RESEARCH` | Historical scholarship treats Zazzau as one of the Hausa territorial states; therefore the Polity label is structurally valid. Amina's exact dates and even details of her reign are much less secure than the existence of Zazzau, so chronology remains research-grade rather than silently asserted. |
| `449aaf08-dce3-4d94-926a-3a81c07c9f46` | Lakshmibai | Jhansi | 1853–1858 | Queen and military leader | `KEEP_POLITY` + `SPLIT` | Jhansi was a princely/kingdom-level territorial authority and is a valid Polity. However, the East India Company annexed Jhansi under the Doctrine of Lapse in 1854; Lakshmibai later reassumed administration during the 1857 revolt. A single uninterrupted 1853–1858 `rules` Activity is historically false and must be split/reconstructed. |

## 3. Shu-Han chronology — current 211 start is anachronistic

Frozen rows:

| Activity UUID | Person | Current Polity | Period | Current role | Decision |
|---|---|---|---:|---|---|
| `38b1d562-f9d8-4290-9bdc-9f48da1e4cca` | Liu Bei | Shu Han | 211–223 | Founder, ruler and emperor | `SPLIT` + `RELINK_PRE_221` |
| `99e6c5a0-06c7-4a72-9393-877b6bd5b9a0` | Guan Yu | Shu Han | 211–220 | General and governor of Jing Province | `RELINK` + `RESEARCH` |
| `50b0c668-515e-46bb-85bb-20f6171906dc` | Zhuge Liang | Shu Han | 211–234 | Strategist, chancellor and regent | `SPLIT` + `RELINK_PRE_221` |

### Historical boundary

- The Later/Eastern Han formally ended in 220 when the last Han emperor abdicated to Cao Pi, founder of Wei.
- Liu Bei controlled major territories before 221 and became King of Hanzhong in 219, but he proclaimed himself emperor and established the state conventionally called Shu-Han in **221**.
- Guan Yu was captured and executed during the loss of Jing Province in **219** (some chronology conventions spill the event into the 219/220 boundary), therefore he cannot historically have served a Shu-Han imperial polity founded in 221.

### Required correction semantics

#### Liu Bei

Do not simply change `211` to `221` and discard the decade.

The current row conflates at least:

1. Liu Bei's pre-imperial territorial/political authority while the Han imperial order still nominally existed and he consolidated Yi/Hanzhong;
2. his 221–223 imperial rule of the state conventionally called Shu-Han (which itself claimed continuity with Han).

Therefore:
- **221–223 -> Shu-Han -> rules** is defensible;
- the pre-221 period requires its own historically named authority/context and exact territorial chronology before correction.

#### Guan Yu

The current `Shu Han 211–220` relation is anachronistic as written.

Guan Yu's valid historical activity belongs to Liu Bei's pre-221 political/military authority and to his command in Jing; he died before the Shu-Han imperial state was founded.

Therefore:
- remove/relink the Shu-Han association only after a defensible pre-221 authority model exists;
- do not invent a new `Guan Yu polity` or retroactively extend Shu-Han to 211 merely for convenience.

#### Zhuge Liang

His career spans the boundary and should be split:

- pre-221: service to Liu Bei's pre-imperial authority;
- 221 onward: Shu-Han state service, later as chancellor/regent.

The exact start of the pre-221 Activity and office changes need chronology review; the key point for this semantic audit is that `Shu Han 211–234` is too coarse.

## 4. Jiaozhou / Shi Xie — deliberately not closed

| Activity UUID | Person | Current Polity | Period | Role | Decision |
|---|---|---|---:|---|---|
| `97177ae5-8658-4abd-a0a6-5339e2e5f791` | Shi Xie | Jiaozhou | 187–226 | Governor | `RESEARCH` |

`Jiaozhou` was an imperial administrative jurisdiction, while Shi Xie's long regional power developed amid the collapse of Han authority. ATLAS may legitimately model important dependent/administrative territorial jurisdictions, but this row cannot be closed until we determine whether `Jiaozhou` should be:

- a dependent territorial Polity/jurisdiction under Han and later southern powers;
- merely an administrative Place/Region;
- or a temporal de facto authority attached to Shi Xie's family regime.

Do not conflate later Tang-era Jiaozhou administrative structures with the late-Han/Three Kingdoms situation.

## 5. Source basis

### Greek poleis
- Metropolitan Museum of Art, *Greek Art in the Archaic Period*: the Greek world consisted of numerous autonomous city-states/poleis.
- Metropolitan Museum of Art, *The Art of Classical Greece*: Athens became an imperial power; the Peloponnesian War was Athens against a league of allied city-states led by Sparta.

### Maya
- Tokovinine, Estrada-Belli, Fialko, *Ancient Mesoamerica* (2024), “The team for a new age: Naranjo and Holmul under Kaanu'l's sway”: explicitly discusses Naranjo and Holmul as Maya polities/domains within larger hegemonic networks.
- Mesoweb ruler record for Lady Six Sky / Wak Chanil Ajaw: reign at Naranjo 682–741 and dynastic relationship to Kaanu'l.
- Metropolitan Museum of Art material on Copán and specialist ruler chronologies: Copán possessed a dynastic sequence and regional overlord/vassal relationships; Chan Imix Kʼawiil ruled 628–695.

### Tetouan / Zazzau / Jhansi
- Cambridge, *International Theory*: Sayyida al-Hurra was governor of Tétouan; current scholarship additionally describes Tétouan as a city-state with unusually autonomous policy.
- Journal of African History scholarship: Kano, Zazzau and Katsina consolidated as territorial states in Hausaland.
- Government of India, Ministry of Culture, “The Doctrine of Lapse: The Case of Jhansi”: Jhansi was annexed after the 1853 succession dispute; this breaks any naive continuous 1853–1858 sovereign-rule row.

### Late Han / Shu-Han
- *The Cambridge History of China*: the last Han emperor abdicated in 220 and the old empire split into Wei, Shu-Han, and Wu.
- J. Michael Farmer, “Shu-Han,” *The Cambridge History of China* (2019), treats Shu-Han as one of the post-Han political states.
- Chinese Text Project historical reference: Liu Bei proclaimed himself emperor and established Shu Han in 221; Guan Yu had been captured and executed before this imperial foundation.

## 6. Structural conclusions

1. **City name != mere Place.** Athens, Sparta, Naranjo, Copán, Tétouan and Zazzau can name genuine Polities.
2. **Valid Polity != valid Activity chronology.** Jhansi proves that a correct Polity can still require a split.
3. **Later state labels must not be back-projected.** Shu-Han cannot be stretched backward to 211 because Liu Bei's eventual state is convenient for the database.
4. **Hegemonic subordination does not erase local Polity identity.** Naranjo can remain a Polity even while subordinate to Kaanu'l; the relation belongs in Polity-to-Polity data.
5. **Administrative jurisdictions require a separate rule.** Jiaozhou remains open rather than being auto-promoted or auto-deleted.

## 7. Coverage increment

New exact frozen Activity UUIDs covered by this Wave: **12**

- 9 city/local-authority rows (including both frozen Gorgo person identities)
- 3 Shu-Han rows

`Shi Xie -> Jiaozhou` is researched and explicitly deferred, so it is also considered **audited coverage** even though the final Polity verdict remains `RESEARCH`.

Including Shi Xie, Wave 9 closes audit coverage on **13 UUIDs**.

Previous covered total: **167 / 309**

New covered total: **180 / 309 = 58.25%**

Frozen rows remaining without any audit decision: **129**

No Production mutation is authorized by this document.
