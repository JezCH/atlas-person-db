# POLITY-P2-D07-A — UAR (1958–61) vs post-secession Egypt (1961–71)

**Date:** 2026-10-11 KST  
**Unit status:** REVIEW COMPLETE / CANONICAL REPAIR OPEN  
**Scope:** historical identity adjudication and exact Production-before inventory; **NO Production mutation, retirement, deletion, Activity split or Runtime publication**.  
**Parent seed:** `uar-post1961-egypt` in `atlas-polity-review-registry.js`, retained `REVIEW_REQUIRED`.

## 1. Authoritative current-data basis

Protected full-DB OIDC read-only snapshot: [run #38128160741](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741); exact deployment/workflow SHA `8a54de696d0a257a9a8a2a060994509376a39c97`; [artifact #11697859340](https://github.com/JezCH/atlas-person-db/actions/runs/38128160741/artifacts/11697859340), archive SHA256 `92bfb11dec48bdfa54d967d94763aac931e667001e6f0ed2b03fbb303685b253`. The original Activity/Source and Polity census were inspected directly, not inferred from name similarity. Snapshot: 1,158 live Polities / 2,523 original Activities / 2,523 compiled Activities, exact UUID/semantic parity at this baseline. This is a dated authenticated snapshot; mutation still requires a fresh before-state.

| Polity | UUID | Relevant Activity ID, historical subject and exact current interval |
| --- | --- | --- |
| United Arab Republic / 아랍 연합 공화국 | `a602213a-dccb-4a23-96c3-e91dfc300a9f` | `e65edaa4-645a-479f-be81-6414ff2f71ba` — Nasser, **1958-02-22→1970-09-28**; `e100c855-4559-5431-8c72-61909a8da746` — Sadat, **1970-10-15→1971-09-01** |
| Egypt / Arab Republic of Egypt / 이집트 아랍 공화국 | `8c25246a-3d73-4df9-8e4a-b0c5ca97c241` | `cb057be7-43fe-4c0f-921d-1ab41bdcb634` — Sadat, **1971-09-02→1981-10-06** |
| Republic of Egypt / 이집트 공화국 (pre-union) | `b0996783-df13-4b40-baa5-d5864af3c5f5` | `038210f2-1f0d-4158-8940-a094a2dcfd8d` — Nasser, **1956-06-23→1958-02-21** |
| Syrian Arab Republic / 시리아 아랍 공화국 | `c4fbb704-8265-4af9-aeca-ec9f23e05b92` | `e19f28f3-5bfe-453e-bc1a-df02703df2c7` — Hafez al-Assad, 1971–2000; this is **not** evidence of full coverage of Syria's 1961 re-independence |

The UAR Nasser Activity preserves two original Egyptian government Sources `41947aa9-0fe1-4c86-b953-176c0c2c93f3` and `b395e7d4-a7e3-40a2-a2cd-22f921107799`. The UAR Sadat Activity preserves `5f87d882-42d0-4f1a-ba63-267796d3da56` and `ada1dd54-29eb-4d43-ac83-5c6fbc665b13`, shared with the post-1971 Sadat fragment. Existing source links, original dates and identifiers are not safe to delete or casually recreate. Snapshot has **no** direct Polity Source pair or temporal designation attached to the above three Egypt/UAR Polities.

## 2. Primary historical evidence

1. [United Nations Treaty Collection — United Arab Republic historical information](https://treaties-prod.un.org/Pages/HistoricalInfo.aspx?clang=_en): foreign-ministry notifications identify Egypt/Syria as one State from 1958-02-22, Syria's resumed independent UN membership in October 1961, and Egypt's 1971-09-02 notification of the replacement official name **Arab Republic of Egypt**. The UN describes subsequent treaty actions by the UAR/Egypt as linked to Egypt.
2. [UN Digital Library subject authority — UNITED ARAB REPUBLIC](https://digitallibrary.un.org/record/1284346): indexes the **actual bilateral union as 1958–1961**, and for **1961–1971 recommends EGYPT** even while Egypt used the UAR name.
3. [UN Digital Library name authority — United Arab Republic](https://digitallibrary.un.org/record/3815821): explicitly distinguishes the **22 February 1958–27 September 1961** Egypt/Syria union from Egypt's subsequent use of the name through 1 September 1971.
4. [United States Department of State, Office of the Historian — Syria](https://history.state.gov/countries/syria): 1958 union recognized; Syrian secession **28 September 1961**; the Egyptian state continued using the official UAR designation until 1971.
5. [UN Member States — Syrian Arab Republic](https://www.un.org/en/about-us/member-states/syrian-arab-republic): Syria resumed its separate UN membership on 13 October 1961, while UAR/Egypt's 1971 name change is recorded.

**Distinguish dates:** 1961-09-27 is the last day of the bilateral union in the UN authority note; 1961-09-28 is the Syrian secession date in US diplomatic history; 1961-10-13 is Syria's separate UN membership resumption; 1971-09-02 is the Egyptian official name change. They are different event types; never substitute one for another.

## 3. Historical identity decision — reviewed, NOT yet applied

**Positive finding:** the UAR's actual **Egypt–Syria bilateral operational polity** ceased in September 1961. The subsequent Egyptian-only government did not retain political control of Syria, even though Egypt maintained the UAR **official name** and UN/treaty continuity. That is a major territorial and operational discontinuity, not a trivial textual rename. ATLAS should distinguish the historically effective **union** from the **post-1961 Egypt-only governing polity**; dynastic/diplomatic/legal continuity is recorded separately from operational-geographic identity.

**Non-finding:** this historical distinction does **not** by itself authorize immediate creation of a fourth Egypt UUID, a physical polity merge/retirement, or arbitrary new day-level Activity records. The existing modern Egyptian Polity (`8c25246a...`) is a candidate to represent the Egyptian-only post-1961 phase with reviewed temporal official-name designation, but its full identity scope and existing writer contract must first be verified. The existing pre-1958 Republic of Egypt is also a separate reviewed period and must not be merged just for name similarity.

**Proposed least-destructive repair:**

1. Preserve the existing UAR UUID as **union-specific historical Polity** (1958–1961) after review of all attached references; do not retire it.
2. Decide, with exact current authoring and Source review, whether the existing Arab Republic of Egypt UUID is the stable survivor for Egyptian-only government **1961 onwards**. If yes, represent “United Arab Republic” **1961–1971** as a Source-backed `official_name` designation of this Egyptian government, with `Arab Republic of Egypt` beginning in 1971. Avoid asserting current database already has these designation rows.
3. Review a source-preserving split of Nasser's original 1958–1970 Activity at the union/secession boundary; ensure his union phase remains UAR and Egyptian-only phase belongs to the approved post-1961 Polity. Correct Sadat's 1970–71 UAR-labelled phase accordingly; coalesce with the already linked 1971–81 Egyptian phase **only** if the current writer's semantic and Source contracts allow it.
4. Require exact-before Activity IDs, interval/precision/source-link preservation, no invented historical dates, no loss of existing evidence, canonical correction Apply, Runtime Compile, and independent Person/Polity/source readbacks. The original 2,523-Activity count is a **before-state**, not a mandated post-split invariant.
5. If identity relation-type vocabulary remains empty, do not invent a continuity edge or abuse a dependency/tributary relation. A reviewed temporal/name representation and plain-English provenance can be used until a proper controlled identity relation is separately designed.

## 4. Closure boundaries

- **This unit:** the initial generic rupture probe is resolved to a **source-backed repair requirement** and exact four-Polity/two-Person scope. Read-only review completed.
- **Parent seed:** stays `REVIEW_REQUIRED`; it is **not FIXED** until actual Authoring/Runtime correction or a separately justified no-mutation resolution passes live acceptance.
- **Production impact this unit:** **zero**. No new Polities, no changed Activities, no deletions, no fabricated lineage facts.
- **Exact next continuation:** `POLITY-P2-D07-B` — same-day reviewed canonical before-state plus current writer-safe correction manifest for Nasser/Sadat and Egypt temporal official name; continue only with controlled owner, fresh state and one postcondition verification.

This preserves the global [#1895](https://github.com/JezCH/atlas-person-db/issues/1895) acceptance boundary and does not resume parked P14 historic Territory Geometry.
