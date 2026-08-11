# ATLAS Polity Semantic Audit — Wave 10

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Scope: Late Eastern Han fragmented authority and warlord-era Person × Polity semantics.

## 1. Problem

The frozen database often maps late-Han regional rulers to a single `Later Han` Polity. That is legally understandable but insufficient for ATLAS map semantics.

During the terminal Han crisis:

- the Han emperor and formal imperial state continued until 220;
- provincial governors, military governors and warlords exercised increasingly autonomous territorial power;
- some still accepted Han titles and nominal allegiance;
- some controlled the imperial court itself;
- some established dependent fiefs/kingdoms before a later successor dynasty formally existed.

Therefore one edge such as `Yuan Shao -> Later Han` cannot simultaneously mean both:

1. nominal constitutional allegiance to Han; and
2. the actual territory that Yuan Shao governed.

For the map project, those meanings must be separated.

Preferred future model:

`Person -> regional territorial Polity/jurisdiction -> rules/governs`

plus, where historically appropriate:

`regional Polity -> Later Han -> constituent_of / nominally_under / formally_under`

and independent Person relations to the imperial center only when needed.

This is preferable to painting the entire Later Han polygon as a warlord's personal territory.

## 2. Individual Activity decisions

| Activity UUID | Person | Current Polity | Period | Role | Decision | Map-semantic diagnosis |
|---|---|---|---:|---|---|---|
| `91f48f05-08b7-47be-ba88-fdfa7eef5878` | Yuan Shao | Later Han | 189–202 | Warlord | `SPLIT` + `RELINK` + `RESEARCH` | Yuan Shao held Han titles but built an autonomous northern territorial power, beginning from Bohai and taking Ji Province, later expanding farther. One `Later Han` row hides the territory he actually governed. Exact temporal Polity slices should be reconstructed rather than inventing a static `Yuan Shao State`. |
| `556f4f15-1681-4203-863a-a9709ea923cd` | Liu Yao | Later Han | 194–198 | Warlord | `RELINK` + `CHRONOLOGY_REVIEW` | Appointed by the Han court to Yang Province but able to exercise authority only over part of the jurisdiction amid Yuan Shu/Sun Ce competition. The regional jurisdiction/actual controlled territory is the map-relevant unit; the current end date also needs review. |
| `340c7738-b7e7-4cea-9acf-b65d73865290` | Lü Bu | Later Han | 192–198 | Warlord | `SPLIT` + `RELINK` | One row conflates changing allegiances and, later, Lü Bu's seizure/control of Xu Province. His territorial rule was not stable across the whole 192–198 interval. Do not paint all Later Han as his territory. |
| `afbcb4cb-57e8-4da1-ab72-57ba0a746dc1` | Ma Teng | Later Han | 189–212 | Warlord | `SPLIT` + `RELINK` | Ma Teng was a major Liang-region power whose relationship with the Han court shifted between autonomy, conflict and acceptance of office. Regional authority and nominal Han relationship need separate temporal records. |
| `3b29002c-3cdf-420b-ba1b-86bade94dc33` | Sun Ce | Later Han | 194–200 | Warlord | `RELINK` + `RESEARCH` | Sun Ce created an independent power base in Jiangdong that became the territorial foundation of the later Wu state. `Later Han` can describe the formal imperial background but not his actual map territory. Do not back-project Eastern Wu itself before its later formal state development. |
| `111c9db3-8cba-43e0-8d41-8e70b01aa072` | Tao Qian | Later Han | 188–194 | Warlord | `RELINK` | Tao Qian's meaningful territorial authority was Xu Province under nominal Han legitimacy. For map semantics, Xu regional jurisdiction should be represented separately from the whole Han empire. |
| `51e3e3dd-d54d-4c40-8349-0520c4b01d3f` | Gongsun Zan | Later Han | 191–199 | Warlord | `RELINK` + `RESEARCH` | Gongsun Zan exercised substantial military/political authority in the northeast and competed with the Han governor Liu Yu and later Yuan Shao. Current Han-only relation loses de facto regional rule. Exact regional Polity boundaries/labels require research. |
| `4e20ee58-e9f0-4235-a18c-db391a073d9a` | Liu Yan | Later Han | 188–194 | Governor / regional ruler | `RELINK` | Liu Yan was sent to Yi Province and established a strongly autonomous territorial base there; sources describe ambitions for independence. `Yi Province` or a historically normalized Yi territorial jurisdiction is the relevant map object, with Han as formal parent/context. |
| `1b532f7a-38e9-4a61-9ef7-2fc1a9fc47fc` | Liu Yu | Later Han | 189–193 | Governor | `RELINK` + `RELATION_REVIEW` | Liu Yu remained notably loyal to the Han court while exercising governorship/oversight in You Province and nearby northern jurisdictions. This is the clearest example that a person can `govern` a dependent territorial jurisdiction without being an anti-Han sovereign. |
| `f417c93a-8d9c-4d61-b4b3-66527d83de24` | Sun Jian | Later Han | 184–191 | Warlord / general | `KEEP_POLITY` + `SPLIT_RELATION_REVIEW` | Sun Jian served in Han military campaigns and later operated within the anti-Dong Zhuo coalition and under Yuan Shu. Unlike Sun Ce, the current period does not clearly support treating all of his activity as a durable independent regional polity. `Later Han` remains valid context, but relation/phase should be split rather than read as personal rule over Han. |
| `0dbbcfca-c3d6-4391-9d4a-19058fe829d7` | Gongsun Du | Liaodong | 190–204 | Warlord | `KEEP_POLITY` + `RELATION_FIX` | Liaodong was an imperial commandery/jurisdiction, but under Gongsun Du and his family it became a durable, strongly autonomous regional authority. For ATLAS, retaining Liaodong as a dependent/de facto regional Polity is useful; model its formal relationship to Han and later northern states separately. |
| `af9c68cc-0809-43c7-a4e8-525e275e4675` | Dong Zhuo | Later Han | 189–192 | Warlord | `KEEP_POLITY` + `RELATION_FIX` | Dong Zhuo controlled the imperial court and emperor rather than personally controlling every territory conventionally belonging to Later Han. `Later Han` is valid as the central state he dominated, but relation semantics must be `controls central government`/de facto ruler rather than simple whole-territory ownership. |
| `b9eed3a3-40f1-428f-95a7-246dfca968ee` | Liu Biao | Later Han | 190–208 | Warlord | `RELINK` | Liu Biao's durable authority was centered on Jing Province, which he governed as a regional ruler while nominally within the Han order. The map should show Jing territorial authority, not all Later Han. |
| `d9986413-f549-4be1-866d-51282e0dfcd6` | Cao Cao | Cao Wei | 196–220 | Chancellor and de facto ruler | `SPLIT` + `RELINK` — **high-priority anachronism** | Cao Wei as an imperial state was founded by Cao Pi after Cao Cao's death in 220. Cao Cao controlled the Han central government from 196, became Duke of Wei in 213 and King of Wei in 216, but never reigned as emperor of Cao Wei. The current `Cao Wei 196–220` row retroactively projects the son's dynasty/state onto the father's entire rise. |

## 3. Cao Cao correction requirement

The current Activity must not be fixed merely by changing its start year.

At least three historical layers matter:

1. **196–213** — Cao Cao dominates the Han imperial government while holding Han offices and territorial/military power.
2. **213–216** — Duke of Wei: a formally enfeoffed Wei territorial authority exists within the Han imperial framework.
3. **216–220** — King of Wei: the Wei kingdom/fief becomes a stronger dependent political authority while Cao Cao remains formally a Han subject and de facto controller of the imperial center.
4. **late 220 onward** — after Cao Cao's death, Cao Pi accepts Emperor Xian's abdication and establishes the imperial state conventionally called Cao Wei.

Therefore:
- `Cao Cao -> Cao Wei 196–220` is historically invalid;
- the eventual Cao Wei imperial polity must not be back-projected over Cao Cao's lifetime;
- the pre-220 Wei duchy/kingdom may deserve a separate temporal state-form/jurisdiction model, but it should not be silently equated with the post-abdication imperial Cao Wei UUID without a continuity decision.

## 4. General late-Han rule derived from this wave

ATLAS needs at least two political layers in fragmented empires:

### Formal sovereignty / constitutional layer

Example:

`Jing regional authority -> formally_under -> Later Han`

### Effective territorial authority layer

Example:

`Liu Biao -> Jing regional authority -> governs/rules`

The map renderer can then choose:

- state/imperial layer: show nominal Han framework;
- effective-control layer: show actual regional authorities;
- both: visually nest or overlay them.

This prevents two opposite errors:

- falsely treating every late-Han governor/warlord as ruler of the whole Han empire;
- falsely declaring each regional warlord fully sovereign from the first moment of local control.

## 5. Relation vocabulary implication

The existing provisional five relations remain useful but may be insufficient for this cluster.

Potential additions or derivations:

- `governs` / `governs_jurisdiction`
- `de_facto_rules`
- `controls_government`
- `formally_serves`

However, do **not** expand the production enum/schema yet. First finish the frozen audit and count how often each semantic distinction is actually needed.

A cleaner alternative may be to keep Person relations small (`rules`, `serves`, etc.) and express much of the nuance through time-indexed Polity-to-Polity relations (`constituent_of`, `formally_under`, `vassal_of`, `nominally_under`) plus Territory control type.

## 6. Source basis

- Rafe de Crespigny, *Fire over Luoyang* and *Imperial Warlord*: final Eastern Han political collapse, rise of regional military powers, and Cao Cao's Han-era career.
- *The Cambridge History of China*: Eastern Han formally ended in 220 with Emperor Xian's abdication to Cao Pi, founder of Wei.
- *Journal of Chinese History* scholarship on Emperor Xian/Cao Cao: the powerless emperor ennobled the de facto ruler Cao Cao as King of Wei while Han constitutional forms persisted.
- Chinese Text Project historical reference pages and transmitted-history summaries used to cross-check appointments and regional bases for Yuan Shao, Liu Biao, Liu Yan, Liu Yu, Ma Teng, Sun Ce, Tao Qian, Gongsun Zan, Gongsun Du and Cao Cao.

## 7. Separate deferred row

`Meng Huo -> Nanzhong, 225` (`cdc102da-63ab-47f7-b9ea-a8de1746fea2`) is **not** included in this wave's coverage count.

Reason:
- `Nanzhong` is primarily a macro-regional designation;
- the exact historicity and political status of Meng Huo require a dedicated source review;
- automatically turning `Nanzhong` into a polity would contradict the audit's own anti-place-name heuristic.

## 8. Coverage increment

New exact frozen Activity UUIDs audited in this Wave: **14**

Previous covered total: **180 / 309**

New covered total: **194 / 309 = 62.78%**

Frozen rows remaining without any audit decision: **115**

No Production mutation is authorized by this document.
