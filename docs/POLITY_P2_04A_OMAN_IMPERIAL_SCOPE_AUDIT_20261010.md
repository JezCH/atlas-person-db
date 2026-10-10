# POLITY-P2-04A — Oman / Omani Empire historical-scope and duplicate-reign audit

**2026-10-10 | HISTORICAL JUDGMENT COMPLETE / CANONICAL OMAN MERGE RECOMMENDED / REVIEW_REQUIRED (EXECUTION APPROVAL GATE) / NO PRODUCTION MUTATION.**

## 1. Exact read-only Production authority

Source: live production deployment `https://atlas-person-db.vercel.app`, API `/api/atlas-read?__atlas_read_surface=polity` and individual `person` details, 2026-10-10 KST. The runtime identity endpoint confirmed Vercel `production` on `main`. These are observed live records, not inferred from authoring request filenames.

| Current live Polity | Canonical UUID | Activities | Observed Persons |
| --- | --- | ---: | --- |
| Oman (오만) | `ac7279b2-da5c-42df-a217-ac60f16106ff` | 1 | Said bin Sultan |
| Omani Empire (오만 제국) | `68c83ef6-0023-5af9-a6e8-26ccf5b8e116` | 2 | Saif bin Sultan; Said bin Sultan |
| Sultanate of Zanzibar (잔지바르 술탄국) | `54dd3191-c2b3-4a84-9ee2-5dd2191715ea` | 1 | Barghash bin Said (1870–1888) |

The unrelated Zanzibar (1984–1985, Ali Hassan Mwinyi) is a distinct later identity, not evidence for a pre-1856 sovereign Zanzibar polity.

### Exact Person–Polity conflicts

- Saif bin Sultan, Person `40801d66-965d-42cc-b24c-41e1f484220c`: **one** `rules/reign/Imam` Activity `747c2472-b051-4412-8f7b-51f551a1ec17` on Omani Empire, **1692 approximate–1711**. Two source links; no duplicate activity on Oman.
- Said bin Sultan, Person `0fe2761a-d0b6-5428-b732-8c93d80e1b0d`: **two concurrent `rules/reign/Sultan` activities representing the same 1806–1856 reign**:
  - Omani Empire: Activity `f8108b3a-2f67-526f-b996-30d8b8e91f7d`, years **1806–1856**, `legacy_asserted`, `exact_as_recorded`, Gregorian detail unspecified, 1 repository_dataset source (`pending-records-supplement-8.json`).
  - Oman: Activity `d9b4af96-24a6-4a0a-86d4-c0092500118b`, **1806 through 1856-10-19**, `well_established`, `reviewed`, Gregorian/day precision at reign end, **four** official/academic/primary-source links. The approved existing request `authoring/requests/said-bin-sultan-oman-1806-1856.json` explicitly describes **one continuous sovereign reign bound to Oman**, not a separate Zanzibar reign.

Both Person details were read from `runtime-person-politics-v1`; `runtime-publication/v1` simultaneously reported Authoring 2,523 = Runtime 2,523, `publication_current=true`. Runtime parity **does not mean** the duplicated reign is historically correct.

## 2. Source-based historical identity ruling

1. Omani sovereign institutions and maritime operations grew under the **Ya'ariba** imams before Al Bu Said. Jones and Ridout, *A History of Modern Oman*, chapter 1, explicitly describe Ahmad bin Said's rise as resuming prior political/economic patterns rather than inventing wholly new structures. This supports a historical Oman continuity model while acknowledging dynastic change; it is not proof of a never-interrupted territorial government.
2. The same historians' chapter 2 characterizes the 1792–1856 Muscat/Zanzibar expansion as a **maritime and commercial sphere** variously called an 'empire' or 'thalassocracy'. The Omani Foreign Ministry likewise describes **Oman's** East African expansion, Zanzibar as a temporary center of the **same** sultan's rule, and continuing Omani sovereignty. `Omani Empire` is therefore not evidence of a second, parallel sovereign office held by Said in 1806–1856.
3. At Said's **1856** death, a real succession partition emerged; the U.S. State Department's historical briefing identifies the **1861** Canning Award as formalizing separate Zanzibar and Muscat/Oman principalities. Do **not** retroject Zanzibar's later independent sovereignty into 1806 or merge Zanzibar Sultanate into Oman.

**ATLAS recommendation:** preserve **Oman** `ac7279b2-da5c-42df-a217-ac60f16106ff` as the canonical sovereign identity for the reviewed activities; retain Omani Empire as an evidenced historical *imperial territorial/political scope* (e.g. source-linked historical designation or annotation if compatible with the current schema), rather than keep both IDs as independent synchronous sovereign states. No arbitrary beginning or ending day for the imperial designation is asserted.

This is a **reviewed merge recommendation, not a completed physical merge**. The family must remain `REVIEW_REQUIRED` until the exact repair and read-back complete, not `FIXED` or `KEEP_SEPARATE` by paperwork alone.

## 3. Proposed minimum mutation set — NOT AUTHORIZED OR EXECUTED

1. With fresh exact expected-before-state and source/Activity inventory, **preserve Said's reviewed Oman Activity** `d9b4af96-24a6-4a0a-86d4-c0092500118b` and its day-level end, all four source links, role, relation and notes.
2. Review non-destructive **relink** of Saif's Activity `747c2472-b051-4412-8f7b-51f551a1ec17` from Omani Empire to Oman, keeping original Person UUID, `rules` relation, Imam role, exact period semantics, approximate start, original notes and two source links. Check no new unique-key collisions.
3. Preserve the obsolete Said Empire Activity `f8108b3a-2f67-526f-b996-30d8b8e91f7d`'s repository source attribution in the reviewed Oman record or archived audit *before* any physical retirement. Its time span must **not** overwrite the higher-precision existing Oman activity.
4. **Require separate explicit user approval** before retirement/deletion of that obsolete Said Activity and of the now-unreferenced Omani Empire Polity; never infer permission from this audit or proposed identity recommendation. Designate the historical imperial name/scope with vetted sources only; do not invent date bounds.
5. Following any approved canonical writer transaction, independently verify authoring person+polity detail, source links, precise temporal fields, latest Runtime compile and both family UUID inventories; update registry to terminal `FIXED` only upon a verified consistent final disposition.

These steps should be combined into the smallest safe reviewed transaction sequence, not run piecemeal so as to leave contradictory intermediate states. This audit intentionally creates **no** Correction manifest or Production write because the destructive approvals have not been granted. No other family, Zanzibar Polity, historical geometry or user-parked P14 change is in scope.

## 4. Sources

- Jones & Ridout, *A History of Modern Oman* (Cambridge University Press, 2015), chapter 1, `Oman and the Al Bu Said`: https://www.cambridge.org/core/books/abs/history-of-modern-oman/oman-and-the-al-bu-said/883ADF91B35D6E7ABD74B6F5C0F2F2AA
- Jones & Ridout, chapter 2, `Oman, Zanzibar and Empire`: https://www.cambridge.org/core/books/abs/history-of-modern-oman/oman-zanzibar-and-empire/1593B4DC97F85ECC97177DFA5F0417F9
- Oman Ministry of Foreign Affairs, *History*: https://www.fm.gov.om/en/about-oman/state/history/
- Oman Ministry of Information, *History and Geography*: https://www.omaninfo.om/en/pages/161/show/572
- U.S. Department of State, historic *Oman Background Note* (2005): https://2009-2017.state.gov/outofdate/bgn/oman/47528.htm
- Preexisting approved authoring requests: `authoring/requests/said-bin-sultan-oman-1806-1856.json`, `authoring/requests/saif-bin-sultan-omani-empire-1692-1711.json`.

**Current registry totals are unchanged:** 75 seeds, 52 terminal, 23 `REVIEW_REQUIRED`, including this one. The next independent historical-family seed is `saudi-third-state-nejd`; starting it requires a separate user-selected instruction.
