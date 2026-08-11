# ATLAS Stage 2 R1 — Correction Decision Ledger (2026-08-12)

> Status: DECISION LEDGER — NO PRODUCTION DB MUTATION
>
> Purpose: convert Stage 1 / Wave 13–15 high-confidence findings into execution classes. This document deliberately separates (a) historically certain error, (b) exact replacement semantics, and (c) current schema capability. A row is not correction-ready merely because the current value is wrong.

## R1 execution rule

A correction may enter a Production change set only when all three are true:

1. **historical error is source-resolved**;
2. **the reviewed after-state is unambiguous at ATLAS map semantics**;
3. **the correction engine can preserve provenance and represent the after-state without lossy workarounds**.

If any one fails, the row stays deferred even when the current row is known to be wrong.

---

## A. READY AFTER R0 — current semantic model is sufficient

### A1. Benjamin Franklin — remove the back-projected United States alternative

Current rows:

- `5f8351b5-6a9e-56f4-b2d8-afbe83d42ef5` — Province of Pennsylvania — 1757–1776
- `2a749964-c057-5671-bdaa-8388099b871d` — United States — 1757–1790 **(invalid back-projection)**
- `8bcf4f15-65a5-5ce6-8ba3-e538fd0dca49` — United States — 1776–1790

Decision: `R1_READY_REMOVE_BACKPROJECTED_ALTERNATIVE`

Reviewed target:

- retain Pennsylvania 1757–1776;
- retain United States 1776–1790;
- retire/reconcile the overlapping U.S. 1757–1790 row only after source links on the dropped row are inventoried and preserved.

Evidence:

- Continental Congress appointed Franklin as a commissioner from the United States in September 1776; his December 1776 diplomatic letter explicitly identifies the commissioners as empowered by the Congress of the United States of America.
- Source: https://founders.archives.gov/documents/Franklin/01-23-02-0038
- Source: https://founders.archives.gov/documents/Jefferson/01-01-02-0218

Required correction capability: source-preserving `retire_activity` / redundant-alternative removal. Do **not** model this as a blind DELETE.

### A2. Otto von Bismarck — Prussian Minister-President continues through 1890

Current relevant rows after R0 dedupe:

- `6bac2b6f-ebf0-5131-bbf2-7fa524bcfae8` — Kingdom of Prussia — 1862–1871
- one retained German Empire Chancellor row — 1871–1890 (R0 chooses representative UUID `1ff585a7-c481-5d38-98ff-38381c81d961`)

Decision: `R1_READY_UPDATE_ACTIVITY_END`

Reviewed target:

- Kingdom of Prussia / Minister-President: **1862–1890**;
- German Empire / Chancellor: **1871–1890**;
- these are legitimate simultaneous relations from 1871 onward, not competing alternatives.

Evidence:

- Bismarck's resignation of 18 March 1890 explicitly asks dismissal from the offices of Reich Chancellor, Prussian Minister-President, and Prussian Foreign Minister.
- Source: https://germanhistorydocs.org/en/forging-an-empire-bismarckian-germany-1866-1890/bismarck-s-letter-of-resignation-march-18-1890

Required correction capability: `update_activity` with exact before-state and postwrite duplicate check.

### A3. Muhammad — remove the 610–632 Medina back-projection

Current relevant rows:

- `e4b374f5-ee25-5c12-80bf-5b7b1d2d149c` — Medina — 610–632 **(invalid back-projection)**
- `fc68a326-f59f-5780-a6f0-c5206d9ceba3` — Medinan Polity — 622–632

Decision: `R1_READY_REMOVE_BACKPROJECTED_ALTERNATIVE`

Reviewed target:

- retain Medinan political authority from 622–632;
- retire/reconcile the 610–632 Medina polity row;
- preserve Muhammad's 610–622 Meccan religious/preaching biography later through Person–Place/Event / `active_in` semantics rather than pretending Medina was his polity before the Hijra.

Evidence:

- Cambridge scholarship treats the Hijra in 622 as the decisive move from Mecca to Yathrib/Medina and the beginning of Muhammad's leadership of the Medinan community.
- Sources:
  - https://www.cambridge.org/core/books/abs/new-cambridge-history-of-islam/rise-of-islam-600705/597D4B95CB90B058D31415DF6CC272FB
  - https://www.cambridge.org/core/journals/international-journal-of-middle-east-studies/article/constitution-of-medina-a-sociolegal-interpretation-of-muhammads-acts-of-foundation-of-the-umma/244CE1507A7C425A388949E545C1F019

Required correction capability: source-preserving alternative retirement. No replacement polity should be fabricated for 610–622.

---

## B. HISTORICALLY RESOLVED, BUT BLOCKED BY MISSING ATLAS SEMANTIC LAYER

These rows are known to need correction, but applying the correction before the missing semantic layer exists would throw away useful historical meaning.

### B1. Charles de Gaulle — Fifth Republic is regime context, not primary polity identity

Current:

- `4ac4c38c-6d8b-55ce-b999-b0639e67eb22` — French Fifth Republic — 1959–1969 — President

Decision: `R1_BLOCKED_REGIME_LAYER`

Historical conclusion:

- de Gaulle was President of the French Republic from 1959–1969;
- the Fifth Republic is the constitutional regime under which that office existed.

Reviewed future shape:

- primary Polity: France / French Republic (exact canonical identity must be resolved/reused once inventory confirms it);
- Role: President;
- Regime context: Fifth Republic.

Evidence:

- Élysée records de Gaulle as President of the Republic and lists his presidency as 1959–1969.
- Sources:
  - https://www.elysee.fr/en/charles-de-gaulle
  - https://www.elysee.fr/la-presidence/proclamation-des-resultats-du-scrutin-du-21-decembre-195

Do not relink until Regime/Government context has a durable place to go. Storing `Fifth Republic` only in free-text notes would be a lossy workaround.

### B2. Mahatma Gandhi — British Raj ends in 1947, but post-independence relation is not `rules`

Current:

- `7a89364b-dacf-5798-9a6d-dd312cbbee4d` — British Raj — 1915–1948

Decision: `R1_BLOCKED_RELATION_SEMANTICS`

Historical conclusion:

- Gandhi remained politically active after Indian independence in August 1947 and died in January 1948;
- British Raj therefore cannot remain his only polity/context through 1948.

Reviewed future shape:

- British Raj context through 1947;
- independent India context from 1947 through his death in 1948;
- relation must be `active_in` / political movement leadership, not territorial `rules`.

Evidence:

- Gandhi Heritage chronology records 15 August 1947 and continued activity through his assassination on 30 January 1948.
- Government of India Gandhi Smriti records his residence in Delhi from September 1947 through 30 January 1948.
- Sources:
  - https://www.gandhiheritageportal.org/eventcontentdetail/OA%3D%3D/NzQxOQ%3D%3D
  - https://gandhismriti.gov.in/gandhi-smriti

Do not create a ruler-like India relationship before Person–Polity relation semantics exist.

### B3. Aung San Suu Kyi — 1988–2021 conflates opposition career with State Counsellor office

Current:

- `e5337054-ff56-58fd-a105-ea6d71d4ef33` — Myanmar — 1988–2021

Decision: `R1_BLOCKED_RELATION_AND_ROLE_SPLIT`

Historical conclusion:

- opposition/NLD leadership begins in the late 1980s;
- the State Counsellor office was created in April 2016;
- she was detained during the 1 February 2021 coup.

Reviewed future shape:

- pre-2016: opposition / NLD political leadership relation to Myanmar;
- 2016–2021: State Counsellor / government leadership relation;
- after the coup must not be silently extended as continuous office-holding.

Evidence:

- Myanmar Digital News states that the State Counsellor law was enacted on 6 April 2016.
- UN records her capacity as State Counsellor in 2016 and records her detention at the 2021 coup.
- Sources:
  - https://www.mdn.gov.mm/en/mosco-working-national-tasks-coordinating-policies-envisioned-state-counsellor-pursue-goal-peace
  - https://digitallibrary.un.org/record/857300
  - https://www.un.org/sg/en/content/sg/statement/2021-01-31/statement-attributable-the-spokesperson-for-the-secretary-general-myanmar

Do not encode the 1988–2016 opposition era using the same office relation as 2016–2021.

### B4. Shigeru Yoshida — current year-only interval cannot represent the actual gap cleanly

Current:

- `0c084a88-58be-52e8-81bb-b73bf0a11bb1` — Japan — 1946–1954 — Prime Minister

Decision: `R1_BLOCKED_SUBYEAR_PRECISION`

Historical conclusion:

- first premiership: 22 May 1946–24 May 1947;
- later premierships resume 15 October 1948 and continue through 10 December 1954.

Evidence:

- Prime Minister's Office of Japan lists Yoshida as the 45th PM in 1946–47 and again as 48th–51st PM beginning October 1948.
- Sources:
  - https://japan.kantei.go.jp/past_cabinet/index.html
  - https://japan.kantei.go.jp/past_cabinet/045.html
  - https://japan.kantei.go.jp/past_cabinet/048.html

Important modeling result:

- with only integer `activity_start` / `activity_end`, splitting into 1946–1947 and 1948–1954 does **not** encode the actual May-1947 to October-1948 gap at day/month precision;
- do not pretend the chronology is exact merely by creating two year intervals.

Required future capability: exact date/sub-year boundary support or an explicit year-granularity convention.

---

## C. ERROR CONFIRMED, BUT EXACT REPLACEMENT POLITY STILL REQUIRES HISTORICAL/LAYERED-AUTHORITY MODEL

### C1. Rurik — `Kievan Rus' 862–879` is a back-projection

Current:

- `b651ff3e-0df1-552a-9134-56ca95e9f3be` — Kievan Rus' — 862–879

Decision: `R1_DEFER_TARGET_POLITY`

Historical conclusion:

- attaching Rurik's 862–879 career directly to Kievan Rus' is too early / retrospective;
- scholarship treats Kievan Rus' formation as later and more complex; exact replacement (`Rus'`, Ladoga/Novgorod-centered authority, etc.) should not be guessed.

Evidence:

- Oxford Research Encyclopedia describes Kievan Rus' as taking shape later under the Riurikids, with Vladimir's late-10th-century consolidation emphasized.
- Source: https://academic.oup.com/edited-volume/61799/chapter-abstract/546291388

### C2. Cao Cao — `Cao Wei 196–220` is anachronistic

Current:

- `7eefdc4d-8aec-5689-b4d8-6b1745240581` — Cao Wei — 196–220

Decision: `R1_DEFER_LAYERED_HAN_WEI_TARGET`

Historical conclusion:

- Han formally continued until 220;
- Cao Wei as the succeeding imperial state begins with Cao Pi in 220;
- Cao Cao's pre-220 power was real but layered through Han court control plus his own Wei principality/kingdom and territorial military authority.

Evidence:

- Cambridge History of China treats AD 220 as the abdication of the last Han emperor and the formal end of Han, while emphasizing that effective Han imperial authority had broken down earlier.
- Source: https://www.cambridge.org/core/books/cambridge-history-of-china/introduction/F2CE2AF802EE8E6A8EBFC60C27C7E5A6

Do not simply relink 196–220 to the whole Eastern Han polygon or leave it as Cao Wei; this needs the R3 layered-authority model.

### C3. Liu Bei / Guan Yu / Zhuge Liang — Shu Han before 221 is back-projected

Current rows:

- `f64072c1-a665-5e09-9581-ab5d8cf766a9` — Liu Bei — Shu Han — 211–223
- `df6cc626-135e-5abc-ae54-6dc1f64ac2aa` — Guan Yu — Shu Han — 211–220
- `b16e2fb0-7515-5bd6-8aa0-0f921f55b63f` — Zhuge Liang — Shu Han — 211–234

Decision: `R1_DEFER_PRE221_SHU_TARGET`

Historical conclusion:

- the later Shu-Han state should not be back-projected to 211;
- pre-221 Liu Bei authority is real but must be modeled as a regional/de facto Han-era political authority before the 221 imperial proclamation;
- Guan Yu and Zhuge Liang relations likewise need service/regional-authority semantics, not retrospective Shu-Han ownership for the entire period.

Evidence:

- Cambridge frames the Three Kingdoms as the political order succeeding the formal end of Han in 220 and distinguishes the earlier breakdown of Han authority from the later coexistent Wei, Shu-Han and Wu states.
- Source: https://www.cambridge.org/core/books/cambridge-history-of-china/introduction/F2CE2AF802EE8E6A8EBFC60C27C7E5A6

---

## R1 implementation order after R0 Production proof

1. Add correction operations required by **A only**:
   - `update_activity`;
   - source-preserving `retire_activity` / alternative-row retirement.
2. Run fresh normalized inventory for A-target rows and child references.
3. Produce a bounded R1A correction manifest with exact before-state.
4. Real rollback dry-run on exact Production SHA.
5. Apply and verify cardinality + retained UUIDs + provenance.
6. Only then design the missing semantic layers for B and C:
   - `relation_type`;
   - Regime/Government context;
   - sub-year chronology precision/convention;
   - layered Polity-to-Polity authority relations.

## Non-goals

- No global replacement of `Dynasty`, `Republic`, `Shogunate`, etc.
- No mutation of R2/R3 continuity or layered-sovereignty cases from display strings.
- No free-text-note workaround that discards regime/relation/date semantics.
- No Production writes authorized by this ledger.
