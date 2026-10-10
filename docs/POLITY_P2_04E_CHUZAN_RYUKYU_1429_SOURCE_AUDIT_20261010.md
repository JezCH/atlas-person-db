# POLITY-P2-04E — Chūzan and Ryukyu Kingdom, 1429 source-critical chronology

**2026-10-10 KST | SCOPED SOURCE REVIEW COMPLETED | REVIEW_REQUIRED (date/identity evidence) | NO PRODUCTION WRITE.**

## 1. Exact current Production

Live deployment: `https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=polity` and exact Shō Hashi Person `63ae502c-cc46-4f04-8c7b-1be1be9b613b` details.

| Polity | UUID | Person–Activity | Current data |
| --- | --- | --- | --- |
| Chūzan / 중산왕국 | `9860fc4b-feb8-491b-acdb-97d37bae6fcb` | Shō Hashi / `d4503fea-545e-4c72-b398-f6075c2987cf` | 1422–1429, rules/reign/King, reviewed |
| Ryukyu Kingdom / 류큐 왕국 | `701a8b03-5ba6-5ce6-a698-128944fec079` | Same Shō Hashi / `432b442f-d2a7-42c2-9ec7-c159fe88e402` | 1429–1439, rules/reign/King, reviewed |
| Ryukyu Kingdom | same | Shō Shin / `353086c5-76e7-5b9c-b7b8-3c4f39398841` | 1477–1526, separate legacy_asserted activity |

Shō Hashi's two activities both contain the **Japan Tourism Agency Ryukyu chronology** Source, use year-granularity, calendar `unspecified_historical`, chronology_status `reviewed`, confidence `well_established`, and start/end certainty `exact`. They are **sequential**, not competing simultaneous personal reigns. None of these stored fields is silently changed by this audit.

## 2. Historical evidence and the essential caveat

**Conventional official interpretation:** Okinawa Prefecture, Naha City History Museum, and Okinawa Prefectural Archives give the standard 1429 account: Shō Hashi defeated Nanzan and brought Hokuzan, Chūzan and Nanzan into a unified Ryukyu Kingdom. The Naha museum also dates the Hokuzan defeat to 1416. It is reasonable to distinguish pre-1429 Chūzan and the enlarged post-unification kingdom as *historical phases* for an atlas, provided the source basis is disclosed.

**Contemporary-source critical interpretation:** Ikuta Shigeru, “The so-called ‘Unification of the Three Kingdoms’ in Ryukyu History,” *Tōyō Gakuhō* 65(3–4), 1984, pp. 341–372 (online repository posting 2018), critically compares the later Ryukyuan chronicle tradition with *Ming Shilu* and Korean records. In the surviving Ming annals, separate tribute missions decline/disappear, but no independent contemporary entry directly documents the conquest/unification in the familiar narrative. His article argues that later unification accounts may reflect retrospective political construction and explores an alternative explanation of the tribute pattern. This is specialist historical disagreement, **not proof that Shō Hashi or Ryukyu Kingdom were fictional.**

**Consequence for ATLAS:** The separate Polity UUIDs can remain as a **provisional phase distinction**, but the 1422 accession and **precise historical reality/confidence of the 1429 transition** cannot be marked indisputably proven solely from the conventional public-history chronology. An exact day of unification is not established. Existing year-level `certainty=exact` and `confidence=well_established` should undergo a focused Source/certainty review before any mutation.

## 3. Verdict and safeguarded next step

`chuzan-ryukyu`: `reviewed_decision=provisional_keep_both_verify_1429_contemporary_evidence`; `suggested_action=repair`; **`status=REVIEW_REQUIRED`; `terminal_status=null`**.

The reviewed scope is specifically historical date confidence/identity boundaries, not a permission to merge or retire either UUID. Keep existing 1422–1429 and 1429–1439 activity IDs, person, names, sources and calendar semantics pending a separately authorized canonical correction with a fresh exact expected-before-state and readback.

**No Production/Runtime mutation, retirement, deletion, speculative boundary, source removal or P14 geometry activation.** Registry remains **75 tracked / 54 terminal / 21 pending**; independent next seed is `massylii-numidia`.

## 4. Sources

- Okinawa Prefecture government history (conventional unification): https://www.pref.okinawa.jp/kyoiku/kodomo/1002705/1002706.html
- Naha City History Museum, Ryukyu Kingdom chronology: https://www.rekishi-archive.city.naha.okinawa.jp/en/history
- Okinawa Prefectural Archives (1429 kingdom formation): https://www.archives.pref.okinawa.jp/event_information/past_exhibitions/10811
- Ikuta Shigeru, *琉球国の「三山統一」*, *Tōyō Gakuhō* 65(3–4), 1984 (repository entry): https://toyo-bunko.repo.nii.ac.jp/records/5524
- Existing Person Source, Japan Tourism Agency: https://www.mlit.go.jp/tagengo-db/en/R1-00872.html
