# POLITY-P2-04G — Buyid Fars to Fars-and-Iraq political phase audit

**Date:** 2026-10-10 KST  
**Review seed:** `buyid-fars-family`  
**Bounded decision:** `KEEP_SEPARATE`, `keep_both`, locked; **no Production/Runtime mutation**.

## Scope, authority and overarching acceptance contract

This work unit is **not** a standalone data cleanup program. It belongs to the #1895 **entire seeded identity/continuity review**, then full-Production discovery and correction of stale IDs/alias merges/ruptures/naming/zero-Activity/temporal inconsistencies, with final approved disposition of destructive and authority-blocked work. Do not substitute historical seed closure for universal Polity clearance. Canonical data remains Production `atlas_v2`; Authoring → Compile → Runtime parity, source-ledger accuracy, and spatial/Place authority must be distinguished. UI #1896 and other workstreams remain separately owned. P14 geometry stays user-parked. Do not delete or retire any record without separate explicit authorization and current exact-before verification.

Production read-only `/api/atlas-read?__atlas_read_surface=polity` returned **1158 live Polities**. This unit searched the current naming fields for Buyid/Buwayh/부와이흐 and related forms and found the following **two direct names**; this is **not** a promise that all wider dynasty members, lost political entities, or third-party polity relationships have been represented.

| Exact existing Polity | UUID | Person and Activity | Boundary, role and source state |
| --- | --- | --- | --- |
| Buyid Emirate of Fars / 부와이흐 파르스 토후국 | `523a6c6a-a16a-4e40-bbdf-fc705a4f1e9d` | Adud al-Dawla `01abbb6c-8bdd-44a1-b77a-cc23f89c14cd` Activity `503f8853-f23b-4f3a-9c91-5f742c269698` | 949–977; `amir_of_fars`, `rules/reign`, reviewed, well-established, **year exact/exact**; 2 Iranica Source links |
| Buyid Realm of Fars and Iraq / 부와이흐 왕조령(파르스·이라크) | `64e303be-fcda-46e4-8779-46bcc7698946` | Same Person Activity `375b1a46-3891-41e3-909c-8dee17b11c67` | 977–983; `supreme_buyid_ruler`, `rules/reign`, reviewed, well-established, **year exact/exact**; 2 Iranica Source links |

Read-only Runtime publication at audit: `current_authoring_activity_count=2523`, `current_runtime_activity_count=2523`, `publication_current=true`; this shows projection parity, **not** correctness of centuries-old history. The Production deployment was checked through `runtime-identity` and `runtime-publication`; no data write was made.

## Historical boundary — why an operational phase split, not an accidental double

### 949–977: Fars regional principality

The Buyid dynasty was not one monolithic state from inception. Three branches governed core areas Fars, Jibal (Ray/Isfahan), and Iraq, often competing despite dynastic kinship. Shiraz was the Adud al-Dawla dynastic base after he succeeded his uncle Imad al-Dawla in **949**. His political office within Fars and the independent Iraqi branch's authority were distinct.

### 977–983: enlarged Fars + Iraq direct dominion

Encyclopaedia Iranica, “FĀRS iii. History in the Islamic Period,” **explicitly distinguishes** Adud al-Dawla's **Fars rule 949–977** and his **Fars-and-Iraq rule 977–983**. The Iranica *BUYIDS* article records his July 977 victory against his cousin Izz al-Dawla Bakhtiyar at Ahvaz and his **December 977 Baghdad entry**. The contemporaneous rival Iraqi lineage and subsequent war culminating in 978 make the political conquest a **process**, not a fictional midnight constitutional switch. The operational enlargement means there is a basis for two non-overlapping stage UUIDs if the dataset models authority scope per period.

**Important distinct 980 threshold:** the specialist Iranica synthesis dates the first brief wider integration of Buyid-ruled regions under one preeminent ruler to **980**, following expansion into Hamadan and changes in the eastern branch. This is **not** the same milestone as Adud al-Dawla's 977 **direct Fars + Iraq rule**. We must not incorrectly claim full consolidation of *all* Buyid regional authorities in 977 or backdate the expanded domain to 949.

These two existing Activity rows use the **same Person** but sequential domain and administrative roles. Their shared coarse-granularity year `977` does **not** prove two simultaneously independent sovereign offices. Exact year certainty is the stored field, not a mandate to invent calendar-day cutovers. If a future spatial mapping plots Fars/Iraq/Jibal, scope must be time-dependent and must distinguish directly ruled areas from nominal or subordinate claims. The two IDs do **not** assert that the regional Fars territorial unit physically disappeared after 977; it became part of the expanded directly controlled realm. Neither claims a formal contemporaneous state name “Buyid Realm of Fars and Iraq” was enacted that year.

### After 983 and indirect successors

Adud al-Dawla died in March 983. Branches rapidly re-divided among his successors, with distinct and intermittently independent regional principalities; Iranica reports a treaty in 986 and separately governed branches later. Current specific Production Name census identified **two exact Buyid-named Polities** for this seed, not all possible early/past/future Buyid regional sovereigns. **Do not invent UUIDs or reign periods for unregistered branches**; the final full-Production discovery gate separately tests candidate identities, and any person-registration scope requires independent source review.

## Constrained disposition

**Terminal `KEEP_SEPARATE` for the two current live UUIDs only.** This is a **sequential administrative/territorial phase distinction**, not denial of same dynasty/person, not a single-state claim for all Buyids, and not a simultaneous sovereign duplicate. Preserve 2 Person–Polity Activities, two Role entities, all 4 scholarly source links, their existing notes, timeline year precision, and current IDs unchanged.

- **No canonical Authoring mutation, compile, runtime activation, deletion, retirement, or P14 geometry.**
- Review registry and regression-test expectation update from **75 / 55 / 20** to **75 / 56 / 19** (historical-family pending **7**).
- Next independent family seed: **`gnat-turkey`**.
- Other approval-/repair-gated state-continuity issues remain unresolved, including Oman, Liberia, France, Japan retirement tombstones and Place authority.

## Public historical bibliography

1. *Encyclopaedia Iranica*, “FĀRS iii. History in the Islamic Period,” especially “338/949 to 366/977” and “366/977 to 372/983”: https://www.iranicaonline.org/articles/fars-iii/
2. Tilman Nagel, *Encyclopaedia Iranica*, “BUYIDS,” 1990, online update 2013, regionally divided Buyid principalities, 977 Baghdad acquisition and 980 fuller integration: https://www.iranicaonline.org/articles/buyids/
3. *Encyclopaedia Iranica*, “ʿAŻOD-AL-DAWLA, ABŪ ŠOJĀʿ FANNĀ ḴOSROW,” events 977–980, March 983 death, direct vs delegated jurisdiction: https://www.iranicaonline.org/articles/azod-al-dawla-abu-soja/
