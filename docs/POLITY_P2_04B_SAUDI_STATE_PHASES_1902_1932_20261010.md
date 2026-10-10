# POLITY-P2-04B — Third Saudi State / Nejd / Hejaz / Saudi Arabia historical identity review

**2026-10-10 KST | RESULT: KEEP_SEPARATE (source-backed existing phase/jurisdiction identities) | NO Production mutation.**

## 1. Scope and authoritative live snapshot

Read-only Production source: `https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=polity` and `person&person_id=87eff9f3-3b7b-4532-913e-db51a7b272d7`. The direct `runtime-identity` endpoint confirmed Vercel Production `main` and SHA `e9f14e1bd2d37ca854b62c27b4557a965ee6d7e2`; current Authoring 2,523 = Runtime 2,523 and `publication_current=true`. This is current read evidence, **not** proof that every Saudi/Hejaz ruler has been registered or every date is day-exact.

| Existing Polity (preserve UUID) | Existing scope | Exact current Activity UUID / role |
| --- | --- | --- |
| `aa38d04d-532d-4851-8e05-27d0614fb9c0` Third Saudi State | 1902–1921, Abdulaziz, Emir | `359ff20a-2a3f-4021-a08a-499a838f8d72` |
| `dfea8994-f42d-4b3b-99ac-e3c2b4a1cada` Sultanate of Nejd | 1921–1927, Abdulaziz, Sultan | `bb9d4eb6-7bb4-4808-b12a-7cceb1903bef` |
| `a05dce0f-1d35-4858-8d61-7a8da3a6e5ab` Kingdom of Hejaz | 1916–1924, Hussein bin Ali; 1926–1927, Abdulaziz, King | Hussein: `e6288de0-fa36-4197-bf16-5f89a675486b`; Abdulaziz: `cf01e13d-e8e4-41c8-9816-81f03f64e6a1` |
| `0fbb1e5b-4661-4696-9d1f-ec77bbe2d75a` Kingdom of Hejaz and Nejd | 1927–1932, Abdulaziz, King | `391957ce-1264-4083-ae9d-2f8655c69aa8` |
| `769b9646-457c-4a45-b7af-76b0141c2c8e` Saudi Arabia | 1932–1953, Abdulaziz, King; 1964–1975, Faisal, King | Abdulaziz: `7b9eaee4-b72e-458c-9473-04599e66fdfd`; Faisal: `464bb4de-6c70-4827-995f-b619cf87896c` |

Abdulaziz Person UUID: `87eff9f3-3b7b-4532-913e-db51a7b272d7`. The 1902 Activity records day-level 1902-01-15 as reviewed; no date precision has been altered in this unit. Other phases have year-granularity endpoints. Hejaz's 1916–1924 Hussein and 1926–1927 Abdulaziz are **different rulers of a historically distinct Hejaz jurisdiction**, not aliases for one authority.

## 2. Historical reasoning by administrative/government boundary — not names alone

- **1902 state formation → 1921 Nejd Sultanate:** King Abdulaziz recovered Riyadh in 1902 and adopted the Sultan of Nejd title in 1921. The Ministry of Foreign Affairs treats them as successive titles of the same state-building ruler. The label *Third Saudi State* in the current Activity notes is a historiographical stage descriptor **1902–1921**, not a claim that a modern Saudi kingdom formally bore that name throughout 1902. **Dynastic and governing continuity is supported; distinct modeled emirate-versus-sultanate phase identity is not false duplication by itself.**
- **1926 Hejaz kingship in parallel with Nejd:** The British Library India Office cable of 11 January 1926 (Qatar Digital Library, `IOR/L/PS/10/1165/1`, folio 149r) records Ibn Saud taking the titles *King of Hejaz* and *Sultan of Nejd and its dependencies* **simultaneously**, and specifically declares Hejaz administration was to remain **separate** from Nejd. Thus overlapping 1926–1927 Activities are **two contemporaneous jurisdictional offices** rather than duplicate registration of one reign. Do not collapse or silently relink the pre-conquest Hashemite Hejaz monarchy into the Najdi Saudi polity.
- **1927 composite monarchy:** The official title became King of Hejaz and King of Nejd and its Dependencies in 1927, following elevation of Nejd from sultanate to kingdom. Existing current Person Activity sources include the 1927 Treaty of Jeddah. `Kingdom of Hejaz and Nejd` is a reviewed composite/state-form phase under the same monarch, **not proof that the separately administered Hejaz vanished in 1926**.
- **1932 unified Kingdom:** The Saudi MFA records the 19 September 1932 royal decree and 23 September effective unified name `Kingdom of Saudi Arabia`. It represents actual nationwide political unification and formal sovereign designation, not an evidence-free continuation of a modern kingdom under a 1902 name. The present model distinguishes that 1932 boundary while retaining the uninterrupted Al Saud governing project from the 1902 restoration.

**Judgment:** `KEEP_SEPARATE / keep_both` for these present five legally/administratively meaningful phase and jurisdiction UUIDs **while explicitly recognizing the continuity of the Al Saud ruling project**. This does not assert that all five were mutually unrelated, fully internationally separate states at every date. The names and jurisdiction/time evidence justify preserving the phase model at the current project boundary, rather than a mass physical merge that would erase multiple offices and the Hejaz regime transition. The source-backed 1926 overlap is **intentional**, not a duplicate defect of the same role in the same polity.

This is intentionally **not** the Oman case: that family contains two competing records of a single 1806–1856 Said reign on parallel Oman/Empire identities, whereas the Saudi series records contemporaneous **different jurisdictions** and successive documented title/state-form changes. No Saudi Activity row must be deleted merely to eliminate timeline overlap.

## 3. What was changed, and what remains

- No Production Person, Polity, Activity, Source, PolityDesignation or Place record was inserted, changed, merged or retired; no Runtime compile or deployment requested.
- Registry seed `saudi-third-state-nejd` moves from `REVIEW_REQUIRED` to terminal `KEEP_SEPARATE` with exact five Polity and seven Activity UUIDs preserved. Review source URLs and approved Person notes remain untouched.
- The next independent historical-family seed in registry order is `liberia-commonwealth-republic`; Oman, France, Japan and Place acceptance blockers remain separately OPEN. The Saudi completion is **not** final acceptance of all Saudi historical rulers or forms.
- If a later new source directly contradicts these legal/administrative boundaries, reopen only this specific identity seed with new current evidence, not a general historical batch.

## 4. Source references

1. Saudi Ministry of Foreign Affairs, *Kingdom of Saudi Arabia: History*, successive official titles and the September 1932 proclamation: https://mofa.gov.sa/en/ksa/Pages/history.aspx
2. Saudipedia, *List of Titles of King Abdulaziz* (24 August 2026): https://saudipedia.com/en/list-of-titles-of-king-abdulaziz
3. Qatar Digital Library / British Library India Office, *File 87/1926 Pt 1*, folio 149r, distinct Hejaz administration alongside Nejd government: https://www.qdl.qa/archive/81055/vdc_100079351205.0x000067
4. Saudipedia, *Unification of Saudi Arabia*, historical phases and 1932 declaration: https://saudipedia.com/en/unification-of-saudi-arabia
5. Current Person Activity source for the 1927 treaty: UK Treaty Series, 20 May 1927: https://treaties.fcdo.gov.uk/data/Library2/pdf/1927-TS0025.pdf (cited via current Person Source; **not independently PDF-analyzed in this work unit**).

**Close boundary:** one independent historical-family review closed by source-backed terminal `KEEP_SEPARATE`. No follow-up unrelated family was started.
