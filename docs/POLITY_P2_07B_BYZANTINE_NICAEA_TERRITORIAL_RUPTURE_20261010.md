# POLITY-P2-07B — 1204 Byzantine rupture / Empire of Nicaea in exile / 1261 restoration

**2026-10-10 KST | Bounded `byzantine-nicaea-rupture` review disposition: `KEEP_SEPARATE` (no canonical Production mutation).**

## Parent governance and acceptance limits

Under [#1895](https://github.com/JezCH/atlas-person-db/issues/1895), a rupture seed closes only the narrowly reviewed historical-identity distinction. This is **not** a declaration that all Byzantine/Nicaean ruler links are populated or that the 1,158-Polity Production-wide new census, Japan P1-02 tombstones, Place authority, France retirement approval, Oman/Liberia/Indonesia gates and all Authoring–Runtime acceptance are complete. No deletion/retirement, merge or Source/UUID rewrite without permission. The related earlier `nicaea-byzantine` historical-family seed is already `SUPERSEDED` by this active rupture probe; do not count twice.

## Exact live public Vercel Production evidence

`https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=polity&polity_id=...` returned:

| Polity | UUID | Production Activities | Persons | Registered Activity coverage, not polity life |
|---|---|---:|---:|---|
| Byzantine Empire / 동로마제국 | `074510f4-f2e7-5795-8cfb-2a4206fa7254` | 15 | 13 | 395–1453 |
| Empire of Nicaea / 니케아 제국 | `1868fd1e-1fb4-4cbe-b880-25b8ba8ebf8d` | 1 | 1 | 1259–1261 |

`https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=person&person_id=b6c47e76-f0ad-45ec-a8c8-c80623234a01` returned **one stable Person `Michael VIII Palaiologos / 미하일 8세`** with two independently sourced existing reign Activities:

- Nicaea: `660acd70-9516-48b9-a4a6-5037e30db555`, `polity_id=1868fd1e-1fb4-4cbe-b880-25b8ba8ebf8d`, **1259–1261**, `rules` as `Emperor`, `year/exact` start/end. One normalized source link: Encyclopaedia Britannica article `Michael VIII Palaeologus`.
- Byzantine: `60823af7-0b38-4406-9793-e0797dcc3f25`, `polity_id=074510f4-f2e7-5795-8cfb-2a4206fa7254`, **1261–1282**, `rules` as `Emperor`, `year/exact` start/end. One preserved link to the same Britannica article.

The duplicate **1261 year** is expected with separate year-granularity activities for pre- and post-capital-recovery phases; exact day-level apportionment is **not attested by those existing public bounds**. Do not force a same-year split date or create new activities.

**Data completeness issue discovered:** Existing Production has **only one** Nicaean Activity, Michael VIII 1259–1261; independent historical source [Pitamber (2015)](https://escholarship.org/uc/item/973684fr) lists Laskarid emperors Theodore I, John III, Theodore II and John IV during the 1204–1261 period. Their Nicaean linkage is not present in the *currently returned Nicaea Polity Activity collection*. This is **an unverified registration coverage gap** requiring all-Production Person/Activity authoring and source-collision audit before any creation. It does not reverse the evidence-supported Polity identity separation.

## Specialist historical authority and identity criterion

- [Angeliki Laiou, *Political-Historical Survey, 1204–1453*, Oxford Handbook of Byzantine Studies (2012)](https://academic.oup.com/edited-volume/29470/chapter-abstract/247163242): Fourth Crusade fragmented Byzantine power, leaving multiple rival claimant states including Nicaea, Trebizond and Epiros, and the restored empire under Michael VIII from 1261.
- [Mike Carr, *Byzantine Empire: 3. 1204–1461*, Wiley encyclopedia (2016)](https://onlinelibrary.wiley.com/doi/abs/10.1002/9781118455074.wbeoe234): 1204 Latin takeover caused fragmentation into at least three Byzantine successor regimes; all claimed imperial inheritance; the Nicaean emperor recaptured Constantinople in 1261.
- [Michael Angold, *Imperial authority and the orthodox church*, Cambridge (2010)](https://www.cambridge.org/core/books/abs/church-and-society-in-byzantium-under-the-comneni-10811261/imperial-authority-and-the-orthodox-church/26AE99D3E3799C14CA5675E53E8E62AA): Nicaean emperors claimed the authority of their Byzantine predecessors in exile and sustained Orthodox church legitimacy through the patriarch in Nicaea.
- [Naomi Ruth Pitamber, *Replacing Byzantium: Laskarid Urban Environments and the Landscape of Loss (1204–1261)*, University of California (2015)](https://escholarship.org/uc/item/973684fr): independent Nicaea-centered Laskarid regime, periods of Theodore I/John III/Theodore II/John IV; under Michael VIII the regime reclaimed Constantinople in 1261 and established the Palaiologan restored dynasty.
- [Michael Angold, *A Byzantine Government in Exile*, Oxford University Press (1975)](https://books.google.com/books/about/A_Byzantine_Government_in_Exile.html?id=W1iGAAAAMAAJ): classic study of the institutional continuity and separately operating government under the Laskarids, 1204–1261.

**Judgment:** Nicaea is not unrelated to the old Byzantine Empire, and 1261 is not the beginning of an unrelated new civilization or a succession devoid of imperial legitimacy. But **1204 caused a real political-government territorial rupture**, where Constantinople and existing imperial authority fragmented into multiple contending successors, and a Nicaea-based distinct state apparatus claimed and eventually restored the imperial government. It is correct **in ATLAS's currently partitioned political-entity model** to retain Nicaea as a separate historical-episode Polity and Byzantine Empire as the longer-lived empire designation that resumes in 1261, linked by the same Michael VIII Person; do not treat the Nicaean interim as a routine alias or silently merge it into a single uninterrupted territorial ruler identity. A separate explicit institutional-historical continuity link could be audited later; no relationship is invented by this task.

## Acceptance and subsequent scope

This bounded no-write decision has independent public Polity + Person readbacks and reputable scholarly historical confirmation. Record `byzantine-nicaea-rupture` as `KEEP_SEPARATE`, `locked=true`, with exact UUIDs/Activity IDs and sources; keep `nicaea-byzantine` prior duplicate seed `SUPERSEDED`. **Do not alter any Person, Activity, Source, Polity, designation, governance, boundary, or Runtime projection rows.**

Canonical tracked seed progression: **75 total / 60 terminal / 15 pending → 75 / 61 / 14**; remaining **5 historical-family / 1 Swedish designation / 2 Korean name / 6 rupture**. All-seed completion is **not** overall #1895 closure.

When the user next requests continued work, prioritize a bounded unblocked pending seed from the canonical registry, or Sweden only when exact same-SHA OIDC read has actually succeeded on current Production. Independently record/resolve missing early Nicaean ruler Activities under authoring/person coverage workflows *without inventing Persons or duplicating existing registrations*. Finish eventual new complete Production identity census and Authoring–Runtime parity proof as originally requested.
