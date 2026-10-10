# POLITY-P2-04C — Liberia Commonwealth → independent Republic authority-boundary and canonical-identity audit

**2026-10-10 KST — BOUNDED HISTORICAL JUDGMENT COMPLETE / CANONICAL REPAIR REQUIRED / FAMILY STILL `REVIEW_REQUIRED` / NO Production mutation.**

## 1. Current live Production scope

Direct read-only authority: `https://atlas-person-db.vercel.app/api/atlas-read?__atlas_read_surface=polity`, exact `polity_id` reads, and Person detail reads for Joseph Jenkins Roberts and William V. S. Tubman. `runtime-identity` returned Vercel `production`, `main`, SHA `58073cc63a58d1c0967a24341271da2d8bb24849` at the time checked. `runtime-publication`: 2,523 Authoring = 2,523 Runtime and `publication_current=true`. These verify what the current public service returned, **not** internal Admin/Source-table identities or an independent SQL reconciliation.

| Live Polity UUID | Name / source-backed jurisdiction | Current Person-Activity UUIDs |
| --- | --- | --- |
| `5643400c-880b-45f2-8d32-7ad64bf91391` | `Commonwealth of Liberia`, American Colonization Society (ACS)-administered Commonwealth, before 1847 independence | Joseph Jenkins Roberts `7bad68a3-7af2-4946-82c1-34d555acfb91`, Governor `c6fbf7e8-8447-4425-b026-5f4994bea79f`, **1841-09-03 → 1848-01-03**, both day-granularity |
| `2ca2fd4c-1d68-4771-beb7-706e4f53370b` | `Republic of Liberia`, formally independent 1847-07-26 onward | Roberts, President `c0c2816a-3955-4244-9c02-142fde048a01`, **1848-01-03 → 1856-01-07**; second presidency `ccb137dc-989d-47d4-b1a7-d59c997ef4b4`, **1872-01-01 → 1876-01-03** |
| `5037f747-2d30-4479-b321-6f01b5cba162` | `Liberia`, modern short name for same post-1847 independent republic | William V. S. Tubman `d7507081-3b34-4933-880a-b232e67feed4`, President `f29d9aac-03b4-4c63-94a4-c21361b1fdb8`, **1944-01-03 → 1971-07-23** |

The public rows carry `chronology_status=reviewed` and `confidence=well_established`. They have preserved day-resolution starts/ends, notes and specific source references. This audit **does not** rewrite or silently correct any of those existing assertions.

## 2. Authority and independence boundary

**Established source-backed facts:**

- The Library of Congress timeline identifies the original settlers' Commonwealth organization in **1838**, with a new constitution and ACS-appointed governor in **1839**, and Roberts's accession after the preceding governor died (1841). The ACS itself was a **private U.S. organization**, not the U.S. federal sovereign of a formally U.S.-annexed colony; describe the governance as ACS-administered rather than assuming an ordinary U.S. territorial jurisdiction.
- When British traders rejected the ACS-dependent government's right to impose customs, lack of independent international standing became a genuine legal and fiscal sovereignty problem. The colonists voted in favor of independence in **1846**; the Liberian **Declaration of Independence was adopted on 1847-07-26**, creating an independent republic. The U.S. State Department Office of the Historian emphasizes that the Republic's sovereign and commercial lawmaking powers were the reason to declare independence from ACS. The U.S. did not recognize it until **1862**, but this late diplomatic recognition **does not move the 1847 independence boundary**.
- The same Roberts is recorded as Commonwealth governor and then first President. PBS's chronological account gives his **1847-10-05 election** and **1848-01-03 presidential inauguration**. An identity change of **sovereign regime** on **1847-07-26** and an **office-holder/title transition** on **1848-01-03** are **different temporal facts**; do not force both to the same date.

**Historical identity judgment:** `Commonwealth of Liberia` and the post-independence Republic deserve distinguishable administrative/sovereign identities. They are linked by the same population and incumbent leader but undergo an evidenced external-sovereignty/constitutional rupture in **1847**. **KEEP_SEPARATE is the reviewed boundary for Commonwealth versus the sovereign Republic**; this is *not* a request to remove continuity links, split Roberts's identity or invent a July 26 governor resignation.

**Independently detected different problem:** `Republic of Liberia` UUID `2ca2fd4c-1d68-4771-beb7-706e4f53370b` and `Liberia` UUID `5037f747-2d30-4479-b321-6f01b5cba162` carry presidents of the **same independent Republic**, with no documented new sovereignty at the start of Tubman's 1944 presidency. On this evidence they are a **likely duplicate canonical identity**, even though their listed Person Activities do not overlap. This prevents a whole-family terminal `KEEP_SEPARATE` verdict; it requires a separately reviewed canonical correction.

## 3. Exact unresolved repair boundaries — not authorized or executed

1. **Canonical independent-Liberia identity:** with a fresh exact Production before-state (all direct and indirect Person/Polity/Source/designation bindings, source links and collision checks), select the canonical enduring independent Liberia UUID and the `Republic of Liberia` EN/KO name as a designation/alias where schema permits. Neither `2ca2fd4c...` nor `5037f747...` is authorized for retirement based on a name-only guess or the differing sample dates. Preserve both incumbent presidents' Activities and original Source/Role records.
2. **Roberts transition:** the existing governor Activity is attached to the `Commonwealth` Polity through **1848-01-03**, crossing the **1847-07-26** state-sovereignty change while his governor *office* itself continued. Review a continuity-preserving split, phase designation, or model-supported exact temporal linkage without fabricating an end to Roberts's term on independence day. Keep `1848-01-03` gubernatorial end and presidential start intact unless a specific source review proves otherwise.
3. **Governor title precision:** the existing Roberts governor Activity begins **1841-09-03**. A specialist governors chronology differentiates his period as *Lieutenant Governor ex officio* from September 1841 until **March 1842**, when his governor appointment became effective; the Library of Congress's historical summary uses "became governor (1841)" and PBS lists 1842. These are distinct coarse/office-level descriptions, **not grounds for an unreviewed start-date override**. Require source-level exact office/type and chronology evidence before any Activity correction.
4. Source provenance, original UUIDs, day-precision endpoints, past president term separation, and Runtime publication parity must survive any future authorized serializable canonical correction. Deletion/retirement of any legacy Polity or Activity requires explicit user approval and exact-before-state.
5. **No reactivation** of user-parked P14 geometry or historical Place backfill; `POLITY-P1-03R-A2` remains independently blocked on a trusted Production DB census.

**Resulting canonical registry status:** `liberia-commonwealth-republic` stays `REVIEW_REQUIRED` / `terminal_status=null`; `reviewed_decision=keep_separate_commonwealth_republic_and_review_republic_liberia_duplicate`, `suggested_action=repair`. This records the historical judgment and concrete data deficit without falsely closing an unresolved source/identity repair. Existing tracked totals remain **75 total / 53 terminal / 22 REVIEW_REQUIRED**.

The next untouched independent historical-family review seed is `gorkha-nepal`. This is a **resume pointer**, not authorization to perform a second independent work unit in the same turn.

## 4. Historical reference authorities

- **Library of Congress**, *History of Liberia: A Time Line*, sections 1820–1847 and 1847–1871: https://www.loc.gov/collections/maps-of-liberia-1830-to-1870/articles-and-essays/history-of-liberia/1820-to-1847/ and https://www.loc.gov/collections/maps-of-liberia-1830-to-1870/articles-and-essays/history-of-liberia/
- **U.S. Department of State, Office of the Historian**, *Founding of Liberia, 1847*: https://history.state.gov/milestones/1830-1860/liberia
- **PBS**, *Liberia Timeline, 1820–1847*: https://www.pbs.org/wgbh/globalconnections/liberia/timeline/time2.html
- **Liberian Embassy in Belgium**, *Our History*, Commonwealth founding and 1847 independence: https://embassyofliberia.be/our-history/
- **Archontology**, *Liberia: Governors 1839–1848*, explicit acting lieutenant-governor versus appointed Governor chronology: https://archontology.org/nations/liberia/00_1839_1848_s.php
- **Library of Virginia**, *Joseph Jenkins Roberts (1809–1876)*, as cited in original Person Activities: https://www.lva.virginia.gov/collections/educator-resources/online-classroom/stc/people/joseph-jenkins-roberts-%281809-1876%29

**Work-unit closeout:** source-backed read-only family audit completed; terminal *data* cleanup and any Production mutation **not** completed or claimed.
