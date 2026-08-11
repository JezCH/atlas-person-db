# ATLAS Polity Semantic Audit — Wave 2

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: ethnonym / tribal polity / confederacy candidates from the frozen 2026-08-05 baseline.

## 1. Derived rule for decentralized and Indigenous political structures

A broad ethnonym is not automatically a Polity, but an ethnonym is also not automatically disqualified.

For ATLAS, the preferred Polity grain is:

> the smallest historically evidenced political community or confederated authority that exercised collective political authority relevant to the person's role during the recorded period.

Therefore:

- broad cultural/ethnic identity alone -> not sufficient;
- historically organized territorial people/tribe with rulers/council/collective authority -> may be a valid Polity;
- band/local community may be the correct Polity when a broad people consisted of many politically distinct bands;
- a confederacy may be a valid Polity layer when it had its own council, leadership, collective diplomacy, warfare, or territorial claims;
- flexible or non-state territoriality does not disqualify a Polity, but its map geometry must not be rendered as a false modern-style hard border.

This rule is semantic, not lexical.

## 2. Wave 2 decisions

| Activity UUID | Person | Current Polity | Period | Role | Decision | Audit conclusion | Map / model consequence | Confidence |
|---|---|---|---:|---|---|---|---|---|
| `4d96f761-e799-41cc-ac21-fa47a76c02d6` | Sitting Bull | Lakota | 1868–1890 | Chief and spiritual leader | `RESEARCH` | Sitting Bull was Hunkpapa Lakota and exercised influence beyond his own local following, but Lakota political organization was divided among bands and local camps. `Lakota` may be too aggregate to represent the precise authority attached to this role. | Preserve Lakota as people-level context; determine whether Hunkpapa / a specific political following / inter-band coalition should be the Activity Polity. | high that finer grain needs review; medium final target |
| `e70e23e2-d6cf-4622-9993-a25daee4f756` | Poundmaker | Cree | 1873–1885 | Chief | `RELINK` + `RESEARCH` | Sources distinguish Poundmaker as a chief/spokesman of a particular Cree band/community rather than political ruler of all Cree peoples. The broad `Cree` label is too coarse for his specific political authority. | Identify the historically defensible band/community identity before relink; keep Cree as people affiliation. | high |
| `52e1e74f-635d-4501-83f7-915bc7357ee0` | Leftraru | Mapuche | 1541–1557 | Toqui | `RESEARCH` | `Mapuche` is a broad ethnocultural label. The toqui office was wartime leadership inside decentralized political structures, so the relevant political unit may have been a wartime coalition or a lower-level territorial community rather than all Mapuche. | Dedicated sixteenth-century political-organization research required; no automatic relink. | medium/high current label too broad; low/medium final target |
| `d80867ad-58f2-44e9-aa45-c51bb30efae1` | Sacagawea | Lemhi Shoshone | 1804–1806 | Guide, interpreter and diplomat | `OUT_OF_POLITY_MODEL` | During the recorded 1804–1806 activity Sacagawea's Lemhi Shoshone identity describes origin/people affiliation, while her actual activity was with the Corps of Discovery after years among Hidatsa/Mandan communities. This row is not a clean Person–Polity political relationship. | Preserve until Person–People / affiliation modelling exists; do not convert Lemhi Shoshone into a false political-employer relationship. | very high |
| `93e60ba9-c72e-4a66-bdda-90578eff2612` | Pocatello | Northwestern Shoshone | 1854–1884 | Chief | `RELINK` + `RESEARCH` | Historical sources distinguish Pocatello's own band from other Northwestern Shoshone bands led by other chiefs. `Northwestern Shoshone` is therefore probably too broad for his direct political authority. | Identify the exact Pocatello band / political community and map its mobile territory cautiously. | high |
| `5eb53851-1a31-4952-bf3e-a5e7dd864512` | Brennus (Senones) | Senones | -390–-387 | Chieftain | `KEEP` | Classical and modern reference works treat the Senones as a distinct Gallic people with an identifiable territorial base and collective political/military action. The name is not merely a macro-ethnicity. | Keep Polity; territory reconstruction should be time-specific and boundary confidence may be approximate. | high |
| `46fe2a2e-1e8a-405d-8439-1d6ff88e59dc` | Ambiorix | Eburones | -54–-53 | King and war leader | `KEEP` | Scholarship describes the Eburones as a territorial political community / loose federation with named rulers, making it a defensible tribal Polity for ATLAS. | Keep Polity; map as a reconstructed territorial zone with uncertainty rather than precise surveyed borders. | high |
| `d7932969-bb26-4cc1-9e9c-8fda28cdc2ef` | Tomyris | Massagetae | -530–-529 | Queen | `KEEP` | Ancient literary tradition presents the Massagetae as a people ruled by Queen Tomyris and possessing territory into which Cyrus campaigned. The political entity is usable, though the narrative and chronology depend heavily on ancient literary evidence. | Keep Polity; lower evidence/chronology confidence and reconstruct territory separately. | medium/high polity; medium narrative precision |
| `3cc44fbb-2501-42b2-89ab-b4ac1f0631f3` | Hiawatha | Iroquois Confederacy | 1450–1475 | Founder | `KEEP` + `RESEARCH` chronology | The Haudenosaunee Confederacy is clearly a supra-local political alliance with a multinational Grand Council and collective governance. The Polity is valid. The exact founding chronology and therefore Hiawatha's current 1450–1475 interval are debated. | Keep Polity identity; audit the Activity dates independently. Confederacy territory should represent member-nation/collective political geography rather than a simple unitary-state polygon. | very high polity; medium/low exact chronology |
| `5b078df5-cc1e-4d88-83c1-458de84fd7e6` | Tecumseh | Tecumseh's Confederacy | 1805–1813 | Confederacy leader and military commander | `KEEP` + `RESEARCH` chronology/territory | Tecumseh's Confederacy was a real intertribal political-military alliance with collective diplomacy, military organization, headquarters and an explicit project of Indigenous territorial resistance. It is more than an ethnicity or event label. | Keep Polity; map with coalition/control/influence semantics rather than a hard modern-state border. Recheck 1805 start against the better-attested consolidation around Prophetstown. | high polity; medium chronology/extent |
| `1755f264-2ff6-47fe-a68a-53eb09827034` | Boudica | Iceni | 60–61 | Queen / rebel leader context | `KEEP` | The Iceni were an identifiable Iron Age British political people and Boudica was their leader. The wider 60–61 revolt included other peoples, but that does not make `Iceni` invalid as her primary polity. | Keep Iceni; if the revolt coalition is later mapped, model it as a separate event/confederated authority layer rather than replacing Iceni. | high |
| `6321ecbe-79ac-4e17-9485-a1c5cff83109` | Cunobeline | Catuvellauni | 9–40 | King | `KEEP` | The Catuvellauni were a powerful south-eastern British political/territorial grouping; Cunobeline's power also extended into neighboring political structures. The current Polity is defensible. | Keep Polity; model wider hegemony/expansion in Territory History rather than changing the identity to a broad `Britain` label. | high |

## 3. Evidence summary

### Sitting Bull / Lakota

National Park Service material identifies Sitting Bull as Hunkpapa Lakota and describes Lakota society as divided into bands/camps with multiple leaders. His influence could extend across Lakota groups, but this does not make all Lakota a single unitary polity under his rule.

### Poundmaker / Cree

Canadian historical and Parks Canada material identifies Poundmaker as a Cree chief and spokesman associated with a particular following/band. During the 1885 crisis, political leadership and Plains Cree military leadership could even be institutionally distinct.

### Sacagawea / Lemhi Shoshone

National Park Service material identifies Sacagawea as Lemhi Shoshone by origin while documenting her 1804–1806 role as interpreter, mediator and guide with the Corps of Discovery. The current row therefore conflates ethnocultural affiliation with the political context of her activity.

### Pocatello / Northwestern Shoshone

Utah historical sources distinguish Chief Pocatello's band from other Northwestern Shoshone bands and chiefs. This is strong evidence that the current broad label does not identify his specific political unit.

### Senones

Oxford Classical Dictionary and Polybius treat the Senones as a distinct Gallic people occupying a recognizable territory and acting collectively in war. This supports a tribal-polity interpretation.

### Eburones

Academic work treats the Eburones as a territorial political community / loose tribal federation with kings and internal divisions. This supports keeping the Polity while representing geographic uncertainty separately.

### Massagetae

Herodotus and modern Cambridge treatments preserve a tradition in which Tomyris ruled the Massagetae and Cyrus entered their territory. This is enough to support the political identity, while evidence confidence must reflect the literary nature of the tradition.

### Haudenosaunee Confederacy

Smithsonian National Museum of the American Indian and recent academic literature describe a Grand Council with chiefs/clan mothers and a supra-local alliance among member nations. This is a clear confederated political authority. Archaeological and historical scholarship continues to debate the precise formation chronology.

### Tecumseh's Confederacy

National Park Service and academic histories describe an intertribal alliance organized around Tecumseh/Prophetstown, collective military action, diplomacy and Indigenous territorial claims. Its territory was relational and contested, not equivalent to a surveyed nation-state border.

### Iceni / Catuvellauni

Cambridge scholarship treats both as major Iron Age British political peoples with regional territorial bases and leadership structures. They therefore pass the ATLAS Polity test despite their names also being ethnonyms.

## 4. Key audit result

Wave 2 falsifies any lexical rule such as:

`ethnonym => not a Polity`

The correct rule is historical-semantic:

- `Maori` for Kupe -> too broad / people-tradition relation, not Polity Activity.
- `Cree` for Poundmaker -> too broad for the leader's actual band-level authority.
- `Lakota` for Sitting Bull -> needs finer political-grain research.
- `Senones`, `Eburones`, `Iceni`, `Catuvellauni` -> defensible political/territorial communities.
- `Iroquois Confederacy`, `Tecumseh's Confederacy` -> defensible confederated political actors even without modern-state territoriality.

Therefore all future automatic audits must only FLAG suspicious semantic categories; final `KEEP/RELINK` requires historical evidence.

## 5. Correction gate remains unchanged

No Production mutation is authorized by this file.

Before any correction:

1. fresh Production snapshot;
2. UUID + before-state match;
3. exact target Polity research where `RELINK + RESEARCH` applies;
4. relation-type schema decision based on the full audit;
5. dry-run and semantic-collision check;
6. bounded correction change set;
7. post-apply Runtime/map semantic verification.
