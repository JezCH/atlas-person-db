# ATLAS Polity Semantic Audit — Wave 4

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: rebel states, warlord authorities, state-in-exile claimants, and pseudo-polities created from events or loose social formations.

## 1. Derived rule

Origin in rebellion does not determine Polity status.

ATLAS must distinguish:

- **rebellion / movement only** — an event or mobilization, not itself a Polity;
- **territorial rebel authority** — organized political authority controlling territory, potentially a Polity;
- **rival / successor claimant state** — a Polity even if short-lived or ultimately defeated;
- **government-in-exile / provisional claimant state** — may be a Polity if it acts as a distinct political claimant with government, diplomacy, armed force and/or claimed/nominal territory;
- **loose social population / network** — not a Polity merely because later popular history calls it a “republic”.

Short duration does not disqualify a Polity. Failure does not disqualify a Polity. Lack of modern international recognition does not by itself disqualify a Polity.

## 2. Ming-Qing transition rival states

| Activity UUID | Person | Current Polity | Period | Decision | Audit conclusion |
|---|---|---|---:|---|---|
| `f2be8c04-9e04-4bb4-95ab-87b01664daf5` | Li Zicheng | Shun Dynasty | 1644–1645 | `KEEP` | Scholarship explicitly treats Li as founder of the Shun dynasty, a rival claimant regime/state controlling major Ming territory including Beijing. |
| `1d3fac68-2875-4e70-afd5-6fae0546ac3e` | Zhang Xianzhong | Great Western Kingdom | 1644–1647 | `KEEP` + chronology/name review | Scholarship treats Zhang's Xi/Western regime as a rival political claimant in the multi-sided Ming-Qing transition. The exact conventional English canonical name and endpoint should be normalized separately. |

The Ming-Qing transition was not a one-step `Ming -> Qing` handoff. Multiple political claimants controlled territory simultaneously. ATLAS should preserve these rival Polities and represent their overlapping/contested Territory Records.

## 3. Yuan-Ming transition breakaway states

| Activity UUID | Person | Current Polity | Period | Decision | Audit conclusion |
|---|---|---|---:|---|---|
| `f2b030bd-0055-4819-99d6-fd0d1e29d808` | Chen Youliang | Chen Han | 1360–1363 | `KEEP` | Academic histories explicitly describe Chen's Han as a rival Chinese breakaway state with its own military and territorial control. |
| `5e4d4e82-9ac6-47f6-a4a6-cbc51d3708f6` | Zhang Shicheng | Great Zhou | 1354–1367 | `KEEP` + canonical-name research | Zhang held and administered a durable territorial power center around Suzhou during Yuan collapse. Preserve as a political authority; confirm preferred state name/title separately. |
| `70fc9703-8119-4315-a5c7-3868e9897eaa` | Ming Yuzhen | Ming Xia | 1362–1366 | `KEEP` + canonical-name research | Ming Yuzhen's Xia was one of the regional breakaway political authorities during Yuan collapse. Preserve identity; verify naming/chronology in dedicated source pass. |

These are not equivalent to a generic `Red Turban Rebellion` event. Once a movement produced an organized rival state with independent government/territorial authority, that state becomes a defensible Polity even if the originating movement remains an Event.

## 4. Late Han religious rebellion and autonomous polity

### Zhang Jue

- Activity UUID: `d004105a-b5c8-4829-8990-b128769d2c72`
- Current: Zhang Jue -> Later Han, 184, Religious leader and rebel commander

Decision: `KEEP` Polity entity + future `RELATION_FIX`

The Later Han is a valid Polity, but Zhang Jue was leading an organized Yellow Turban rebellion against Han authority. The relationship is therefore not `serves` or `rules`; it should become `opposes` (and eventually link separately to the Yellow Turban movement/event).

Do **not** invent a Yellow Turban territorial state unless evidence demonstrates an actual durable political authority distinct from the movement.

### Zhang Lu

- Activity UUID: `6cdbc259-3d46-4257-a33e-98b2f21cf48c`
- Current: Zhang Lu -> Hanzhong, 191–215, Theocratic ruler

Decision: `KEEP political authority` + `RELABEL/RESEARCH canonical identity`

Recent academic synthesis describes Zhang Lu's Hanzhong/Hanning community as an autonomous territorial entity with its own theocratic institutions, refusal of imperial magistrates and independent role in the increasingly polycentric late-Han order. This clearly passes the ATLAS Polity test.

However, `Hanzhong` alone is also a geographic name. Before correction, determine whether the canonical Polity should be `Hanning`, `Hanzhong theocracy`, or another source-supported conventional label while retaining geographic aliases.

## 5. Other late-Han warlord rows

Representative frozen rows include:

- Gongsun Zan -> Later Han, 191–199, Warlord (`51e3e3dd-d54d-4c40-8349-0520c4b01d3f`)
- Liu Yu -> Later Han, 189–193, Governor (`1b532f7a-38e9-4a61-9ef7-2fc1a9fc47fc`)
- Sun Jian -> Later Han, 184–191, Warlord (`f417c93a-8d9c-4d61-b4b3-66527d83de24`)

Decision: `RESEARCH relation/authority scope`, not automatic Polity replacement.

A warlord could remain formally an officer of Han while exercising increasingly autonomous territorial power. The current `Later Han` entity can therefore be historically relevant, but the future `relation_type` and any separate warlord territorial-authority layer require person-specific research.

## 6. Taiping Heavenly Kingdom

- Hong Xiuquan -> Taiping Heavenly Kingdom, 1851–1864
- Activity UUID: `ef09a0bc-0b29-4496-bf3c-986933fb0ef3`

Decision: `KEEP`

Academic sources describe the Taiping as attempting to establish a theocratic Heavenly Kingdom in place of Qing rule and, from Nanjing, ruling a very large territory for years with government, military and social institutions.

Therefore `Taiping Heavenly Kingdom` is not merely the name of the Taiping Rebellion event. The rebellion is an Event; the territorial rival state it produced is a Polity.

Map consequence:

- direct Taiping-held territory -> Polity Territory Record;
- active fronts -> contested;
- raid/military penetration without durable rule -> occupation/campaign layer, not automatic direct territory.

## 7. Provisional Government of Free India / Azad Hind

- Subhas Chandra Bose -> Provisional Government of Free India, 1943–1945
- Activity UUID: `832f0675-0a18-4afa-ad49-af71de75cdf6`

Decision: `KEEP` + territory-status research

Sources describe Bose deliberately establishing the Provisional Government of Azad Hind so that the independence movement could act diplomatically as a government, claim allegiance, declare war, obtain foreign recognition and function alongside the INA. Contemporary wartime diplomacy treated Bose as head of state of the provisional government.

This therefore passes the political-actor test even though it was a claimant/provisional state operating under Axis sponsorship rather than an uncontested territorial sovereign.

Map consequence:

- do not color all British India as direct Azad Hind territory;
- distinguish `claimed`, `nominal/transferred`, `military occupation`, and actual administrative control;
- claimed national scope and effective territorial control must remain separate.

## 8. Nassau Pirate Republic

- Edward Teach -> Nassau Pirate Republic, 1716–1718, Pirate captain
- Activity UUID: `b4c0eacf-5dc5-4977-bd28-872af31942f1`

Decision: `OUT_OF_POLITY_MODEL` + `RESEARCH`

Recent Cambridge scholarship explicitly problematizes the popular `pirate republic` framing. Nassau's pirate population consisted of self-interested crews that banded and disbanded, lacked unified long-term objectives and showed weak broader social cohesion. Other scholarship describes the Bahamas as having gone years without functioning colonial governance before Woodes Rogers re-established crown government in 1718.

This is insufficient evidence for treating `Nassau Pirate Republic` as a state-like territorial Polity comparable to Venice, the Taiping Heavenly Kingdom or the Republic of Ezo.

For Edward Teach specifically, the row more plausibly represents:

- activity in/around Nassau as a pirate base / place;
- membership in a loose pirate network;
- maritime operational range.

Preserve the record until Place/Network/Event modelling can absorb it; do not blindly relink Teach to the British Bahamas as if he served that government.

## 9. Key result

The audit now has a robust test for revolutionary/transitional cases:

### Valid Polity examples

- Shun dynasty/state
- Zhang Xianzhong's Xi / Great Western regime
- Chen Han
- Zhang Shicheng's territorial regime
- Ming Xia
- Zhang Lu's Hanzhong/Hanning theocracy
- Taiping Heavenly Kingdom
- Provisional Government of Free India / Azad Hind (claimant/provisional polity; territorial status qualified)

### Not automatically Polity

- Yellow Turban Rebellion as an event/movement
- Dutch Revolt as an event/process
- Jiaozhi resistance as a resistance event label
- Nassau `Pirate Republic` as a popular shorthand for a loose pirate population/network unless stronger state-level evidence emerges

The decisive test remains actual political organization and authority, not whether a label contains `kingdom`, `government`, `republic`, `rebellion`, or `dynasty`.

## 10. Correction gate

No Production mutation is authorized.

The next phase is to combine Waves 1–4 into a coverage matrix against the frozen 309-row snapshot, identify all rows that are already safely `KEEP`, and isolate the remaining unreviewed semantic clusters. Only after coverage is complete and current Production is reconciled should a correction engine be implemented.
