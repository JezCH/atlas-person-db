# POLITY-P2-04J — Indonesia 1945→1949 RIS→1950 unitary: missing constituent RI and Acting President Assaat

**2026-10-10 KST | historical conclusion resolved at sovereignty/regime level; canonical data recovery NOT complete. Remain `REVIEW_REQUIRED` / `suggested_action=repair`. NO PRODUCTION WRITE.**

## 0. Global task acceptance remains binding

The #1895 task is not a 75-checkbox sprint. After the remaining tracked historical-polity seeds, the final gate requires **fresh all-Production source/UUID census and new-defect discovery, exact-before non-destructive authoring corrections, Authoring→Compile→Runtime semantic verification, and closure of authorized retirement/authority blockers** (Oman, Liberia, France, Japan, Place). User-selected Person registration authority must be respected. P14 geometry is excluded and user-parked.

This scoped work unit determines what happened in 1949–1950 and whether existing live data reflects it. Do not close the registry seed simply because two nominal top-level sovereign phases are correctly separated.

## 1. Live Production baseline (read-only, exact UUIDs)

Queried Vercel Production `/api/atlas-read` polity list **1158 rows**, exact Polity details, Sukarno Person detail, Person list **2145 entries**, `runtime-publication` and `runtime-identity` (Production/main SHA `2a44c586d23dad5e1a350dacfefbb159e25cb518` at inspection).

| Existing Polity | Exact UUID | Person and Activity | Current exact boundaries |
| --- | --- | --- | --- |
| Republic of Indonesia / 인도네시아 공화국 | `2682c74a-3404-42be-93ae-9bcc5875a3b0` | Sukarno `7ef3851e-3927-4600-9953-bc03c15d08f7` Activity `d27b3368-00ec-442a-9639-df45d4a2898c` | **1945-08-18 → 1949-12-27**, President, `governs/term`, reviewed, well-established, day/exact/gregorian |
| United States of Indonesia / 인도네시아 합중국 (RIS) | `a0e85099-3cb0-4b9d-94bb-234ae8fcb232` | SAME Sukarno Activity `9de8fc17-e187-46f7-8896-82e41cc8233e` | **1949-12-27 → 1950-08-17**, federal President, same review/precision |
| Republic of Indonesia / 인도네시아 공화국 (reused same UUID) | `2682c74a-3404-42be-93ae-9bcc5875a3b0` | SAME Sukarno Activity `b8a6196b-fecc-4689-85c7-193efb2b2dfc` | **1950-08-17 → 1967-03-12**, post-federal unitary President, same review/precision |

Each of Sukarno's three original Activities carries a linked **Indonesian Ministry of Education** historical resource book Source. **Preserve all three exact original Activity UUIDs/Source links**; do not infer three simultaneous independent head-of-state reigns.

**Missing in observed data:** 1158-name-based Polity census found `Republic of Indonesia` and `United States of Indonesia`, but **no distinct name/label representing the 1949–1950 federal member Republic of Indonesia (Yogyakarta)**. 2145 Person rows matched **no `Assaat`/`Asaat` exact or known-name alias**. Neither original polity has a visible 1949–1950 `Acting President of the constituent Republic of Indonesia` Activity. This is a bounded negative enumeration, not a cryptographic proof that no differently labeled person/entity could exist in hidden authoring surfaces.

Publication check: **2523 Authoring Activities = 2523 Runtime Activities, publication_current=true**. This only establishes projection freshness, NOT that all historical offices exist.

## 2. Authoritative historical evidence and 4 different event types

### 1945 Republic vs 1949 federation

17 August 1945 was independence proclamation, and Sukarno's pre-federal president Activity correctly begins **18 August 1945** (office selection, different event). At **27 December 1949**, Dutch sovereignty recognition/transfer established a **federal-level RIS authority** while the prior Yogyakarta Republican administration became one of **sixteen constituent states** in RIS.

The **ANRI (National Archives of Indonesia)** 2017 *Inventory of the RIS Ministry of Justice*, Introduction `Sejarah Organisasi`, p. iv (PDF p. 5), explicitly says RIS was founded 27 Dec 1949, RI became one of sixteen RIS federated states, Sukarno served as RIS President, and **Mr. Assaat** was appointed `Pejabat Presiden RI` **in Yogyakarta**. It also records 17 Aug 1950 as the RIS terminal boundary.

This is a **constitutional and concurrent-jurisdiction distinction**, not one same individual arbitrarily carrying two alternate full-national sovereign titles. Federal RIS and constituent RI **were simultaneous but on different jurisdictional levels** and must never be auto-merged into a single sovereign identifier.

### 1950 national state continuity and unitarization

**Federal Law No. 7/1950**, primary text hosted by Indonesian Ministry of Finance JDIH and BPK official metadata, is a **constitutional amendment** of the RIS provisional constitution. Its preamble explicitly describes the Indonesian nation-state proclaimed 17 August 1945 that moved unitary → federal → unitary, and formal negotiation between the **RIS Government and the Government of its RI constituent** (Charter 19 May 1950). Enacted/promulgated **15 August 1950**, it takes effect **17 August 1950**, replacing the federal constitution with the unitary 1950 provisional constitution.

Therefore the 1950 unitary state is **not** a foreign colonial successor to an extinct Indonesian nation; the legal text itself asserts continuity. Conversely **continuity of the Indonesian national state is not equivalent to identity of the RIS federal government with the Yogyakarta RI constituent state**. Different jurisdictional levels are both real.

### Sukarno↔Assaat role handover — ceremony/term/effect distinguished

ANRI's public photo exhibition records a **20 December 1949 handover ceremony** at Yogyakarta: Sukarno yielded his RI presidential duties to KNIP Chairman Mr. Assaat ahead of his **27 December federal inauguration**. Another ANRI official portrait caption lists Assaat as acting President RI **27 December 1949 – 15 August 1950**, while the exhibition also describes transfer of office from December 20 to August 15. These dates denote possibly **different legal term, ceremonial handover, and constitutional system milestones**.

This is critical: do NOT silently change Sukarno's existing pre-federal President Activity end from **27 Dec** to **20 Dec** solely based on a handover ceremony; do NOT guess a 20 Dec beginning for a newly registered Assaat office when ANRI's term summary gives 27 Dec; do NOT force Assaat to have held a sovereign federal Presidency until **17 Aug** merely because the unitary-state statute took effect then. Separate the **office handback on 15 Aug** from **new law's constitutional start on 17 Aug**.

Additional primary institutional verification: the **Indonesian Ministry of Religious Affairs** records **RI Education Act No 4/1950 signed at Yogyakarta on 2 April 1950 by Acting President RI Mr. Assaat**. That is a concrete **effective constituent-state government act** under federation, independent of Sukarno's federal presidency.

The **Indonesian Ministry of Defense** (state-education manual) records the RIS Constitution applying nationwide except the **Yogyakarta RI constituent**, which retained the 1945 Constitution; avoid attributing federal constitutional law as the constituent's law. Indonesian Constitutional Court 2014 judicial record describes Assaat delivering the presidency back to Sukarno on **15 August 1950** before 17 August effective unitary state transition. Preserve provenance and legal status separately: parties' submissions in judicial decisions are NOT automatically the court's own endorsed historical findings.

## 3. Correct identity-model disposition (NO EXECUTION until prerequisites)

**Historical conclusion:** retain the two pre-existing national-level Polity UUIDs as distinguishable **unitary vs federal regime phases** with continuous Indonesian national sovereignty; do not merge/delete either. But the existing `Republic of Indonesia` UUID used for 1945–1949 and post-1950 **does not itself explain the simultaneous lower-tier constituent RI government**, its narrower territory, and interim president. The 1950 constitutional law expressly requires the concurrent federal and constituent governments to be distinguishable.

**Required before terminal classification — dedicated scoped repair owner:**

1. **Identity/jurisdiction decision:** determine whether `Republic of Indonesia (RIS constituent, Yogyakarta; 1949–1950)` merits a separate phase-Polity UUID or existing `Republic of Indonesia` may safely express a 1949–1950 subordinate-government temporal designation with **unambiguous federal-state hierarchy**; verify canonical Polity schema/authoring writer supports the chosen jurisdiction and no duplicate entity already exists under a different name. Preserve 1945–1949 and 1950-onwards national sovereign Person links. If a new normalized row is justified, create via authorized writer with no copied historical/source IDs and no collision.
2. **Person-authority decision:** Assaat is missing from **current live 2145-person names/aliases**; route as a **candidate for user-selected registration** under existing #1374/#1375 policy. Do NOT silently register a new Person in a polity-audit no-write PR or commandeer another lane's user-driven registration scope.
3. **Office activity design:** only after Person/Polity resolution, prepare exact-before `governs` / *Acting President of the constituent Republic of Indonesia* `term` with institutional ANRI sources, track contested/ceremonial December 20 vs December 27 as **separate event metadata**, and the August 15 office handover vs August 17 constitutional end separately. Do not assert Assaat was President of the RIS federal sovereign.
4. **Existing Sukarno date check:** inspect actual transfer of legal title to RIS and ceremonial handover before proposing an exact source-backed `rewrite_activity` to `d27b3368-00ec-442a-9639-df45d4a2898c`. Existing `9de8fc17-e187-46f7-8896-82e41cc8233e` (RIS) and `b8a6196b-fecc-4689-85c7-193efb2b2dfc` (post-unitary) remain protected.
5. **Safe execution/acceptance:** approved minimal writer manifest with exact Person/Polity/Activity before-state, registered sources, fail-closed idempotency, reviewer provenance, successful canonical commit, Authoring readback, projection compile, fresh Runtime readback for **all four stage slots** and no duplicate presidency; update registry to terminal only when records satisfy temporal/jurisdiction rules. Handle any newly uncovered temporal designation separately.

**No current Production Authoring, Runtime, Person, Polity, Source, law/date, Place or P14 geometry mutations.** Status `REVIEW_REQUIRED`, `suggested_action=repair`, reviewed decision `retain_RI_RIS_distinction_repair_federal_constituent_RI_and_Assaat_1949_1950`; **do not mark `KEEP_SEPARATE` terminal yet**.

Seed ledger remains **75 / 58 terminal / 17 pending** (historical-family **5**). Next independent nonconflicting seed is `russia-temporal-designation`, since remaining historical-family cases France/Oman/Liberia/Chuzan and this repair are approval, evidence or writer-gated. Resume this Indonesia repair through the same registry seed, not a duplicate alias-only task.

## 4. Credible institution and primary-source references

1. National Archives of Indonesia (ANRI), *Inventaris Arsip Kementerian Kehakiman RIS (1946) 1949–1950* (2017), Introduction p. iv (PDF p.5): https://anri.go.id/download/inventaris-arsip-tekstual-kementerian-kehakiman-ris-1946-19491950-1613534790
2. Republic of Indonesia Ministry of Finance JDIH, original **Federal Law No 7 of 1950**, constitutional recitals and Aug 17 effect: https://www.jdih.kemenkeu.go.id/api/download/fullText/1950/UUDSTAHUN~1950UUDS.HTM
3. Republic of Indonesia BPK law portal metadata, **UU No. 7/1950** 1950-08-15 enactment, 1950-08-17 effect: https://peraturan.bpk.go.id/Details/38102/uu-no-7-tahun-1950
4. ANRI, *Arsip Hari Ini / Pameran Virtual*, page 18, public exhibit captions of December 20 1949 ceremonial transfer and Assaat Acting President 1949-12-27–1950-08-15: https://anri.go.id/publikasi/pameran-virtual?page=18
5. Republic of Indonesia Ministry of Religious Affairs, *Undang-Undang Sistem Pendidikan Nasional, Sejarah dan Maknanya*, historic **Act No. 4/1950** signed by Assaat 2 Apr 1950 in Yogyakarta: https://kemenag.go.id/en/opini/undang-undang-sistem-pendidikan-nasional-sejarah-dan-maknanya-uGdGp
6. Indonesian Ministry of Defense, *UUD RIS historical instruction*, constituent RI retains the 1945 Constitution: https://www.kemhan.go.id/ropeg/wp-content/uploads/2018/09/Modul_Udin_KPPI_2018.pdf
7. Indonesia Constitutional Court official archive of 2014 case evidence re 15 Aug Assaat→Sukarno handover; individual party legal argument not necessarily final court ruling: https://s.mkri.id/public/content/persidangan/putusan/putusan_sidang_1664_63_PUU_2013-telahucap-27Maret2014_FINAL.pdf
8. Republic of Indonesia National Archives presidential archive database, Assaat President RI 1949–1950 and later Natsir Interior Minister: https://pusdipres.anri.go.id/presidenpedia
