# POLITY-P2-01C — France 1940–1958 legal sovereignty, de facto authority and Republic regimes

**Date:** 2026-10-08
**Unit disposition:** BOUNDED AUDIT COMPLETE / SOURCE-BACKED MODEL DECISION / CANONICAL COVERAGE GAP CONFIRMED / NO PRODUCTION MUTATION / FRANCE FAMILY REVIEW_REQUIRED.

## 1. Exact connected Production census (not a claim of completeness)

Connected Supabase project `wfrbxltvpmlprgwfysxq`, `atlas_v2` on 2026-10-08, after applied P2-01A/#2157 and P2-01B/#2166, and completed Runtime Projection Compile #37775750359:

| Currently live canonical Polity | UUID | Authoring Activities | Runtime |
|---|---|---:|---:|
| `France` — persistent country/political-identity anchor | `1eaa48b6-dc60-49d6-91c4-49db556f4ddf` | 37 | 37 |
| `stage2:french-republic` — historical French Republic political authority | `b138f5e4-ff83-40f6-bdb1-83b08c0256cb` | 16 | 16 |
| `French Third Republic` — now-empty historic polity identity, preserved | `3d72277f-c92e-476c-8174-804f700d10cc` | 0 | 0 |
| `Kingdom of France` — now-empty historic polity identity, preserved | `7e090994-f196-4957-8295-dcfa08c53fba` | 0 | 0 |
| `French First Republic` | `24c975e9-f93c-548b-bfcb-60043d9e6c4f` | 4 | 4 |
| `First French Empire` | `3ff63558-6761-5585-9dcf-f9a6da53606a` | 5 | 5 |
| `French Second Republic` | `fdb99251-0df5-4c6b-9ca0-c1ce51ae1578` | 1 | 1 |
| `Second French Empire` | `4f473a9c-4aab-4668-8092-8b370f8d4990` | 2 | 2 |

**Full family conservation: 65 Authoring / 65 matching Runtime / 0 mismatches** on normalized Person, Polity, Role, PeriodBasis, Relation Type and all year/month/day/granularity/certainty/calendar components. None of the eight family Polities holds an Activity spanning any portion of **1940–1943**. This is an **observed lack of records**, not evidence of an empty historical government/sovereignty.

- `France`: 37 Activities from Philip II 1180–1223 through Albert Camus 1957, including monarchic `rules` and post-monarchic/representative `active_in` records (e.g. Camus's 1957 literary Nobel milestone). Four historical royal `state_form` rows exist: 1180–1225, 1226–1792, Bourbon restorations 1814–1815 and 1815–1830. `France` does **not** presently hold a Fifth Republic Governance Context; hence do not collapse it with the other entity by matching territory/name.
- `stage2:french-republic`: 16 Activities from 1878–1969: **eleven** currently fall between 1870 and 1940 (nine older + two relinked in P2-01B) and **five** in 1944–1969. Third Republic sourced `state_form` 1870-09-04→1940-07-10 exists. **One** separately typed Fifth Republic `governance_context` UUID `078c50b9-4a15-46b4-9181-567cf07ee838` and period UUID `9c3d4f6a-1478-4b10-a15d-893822fbf38c` begins **1958-10-04**, open-ended in the model (open is not a prediction).
- No connected-Production canonical Polity or Governance Context record matched `Vichy`, `French Fourth Republic`, or a French `Provisional Government`. There is **no** Fourth Republic temporal designation. No separate `France`/French Republic identity relation exists. These are specific **coverage gaps**, not grounds to fabricate their history or label historical states non-existent.

## 2. Five postwar Activities individually audited

| Activity and stored UUID | Exact stored interval | Relation / interpretation | Source links (current) | Decision |
|---|---|---|---:|---|
| Charles de Gaulle provisional-government head `0d0d6e81-cbc6-448a-921b-b0d94896473a` | 1944-09-09→1946-01-20, daily | `governs` **French Republic**; a provisional **government office**, not a new sovereign state established on 9 September | 1 Élysée | **KEEP**; no identity rewrite |
| Simone de Beauvoir `c3d4d252-8c9a-44b6-871d-2c9a25648ff5` | 1949, year | `active_in` the French Republic, historical Fourth-era publication; no constitutional-office claim | 1 Stanford Encyclopedia | **KEEP**; no fabricated cabinet office |
| Charles de Gaulle President of Council/prime minister `1b422123-3271-4a28-aa98-6cff776418b5` | 1958-06-01→1959-01-08, daily | One **continuing governmental tenure** straddling **4 October 1958**, not two sovereign Polity identities or two noncontinuous terms | 2 Élysée | **KEEP**; do not force a date split |
| Charles de Gaulle President `4ac4c38c-6d8b-55ce-b999-b0639e67eb22` | 1959-01-08→1969-04-28, daily | `governs` same French Republic in established Fifth context, subsequent distinct presidential office | 3 incl. 2 Élysée + 1 internal repository | **KEEP** distinct from prime minister |
| Michel Foucault `5594f656-19c2-49e2-bf72-d091f9e8e76e` | 1966, year | `active_in` the French Republic cultural sphere, not a head of state | 1 Stanford Encyclopedia | **KEEP** |

A sixth late record, Albert Camus `3576b9fd-4c46-4aae-a642-8598fdfe7ee8` (1957), is attached to `France` with `active_in`, not the generic French Republic. Different activities under **country umbrella** versus **political-period authority** are not duplicate Activity identities solely because their dates and territories overlap. No name- or date-driven 37↔16 bulk relink is supported.

## 3. Independent historical/constitutional primary evidence and precise judgment

1. **1940 rupture and wartime actual power**: French National Assembly historical history documents the **10 July 1940** plenary powers voted to Marshal Pétain at Vichy, the suspension of the representative national institutions, and the reinstatement of deliberative structures with Liberation. Source: https://www.assemblee-nationale.fr/histoire/7da.asp . **Result:** a distinct de facto governmental regime existed; do **not** annotate the years 1940–44 as ordinary operational Third/Fourth/Fifth Republic cabinet tenure.
2. **Republican juridical continuity despite Vichy**: France's **ordinance of 9 August 1944** formally states in Article 1 that the Republic never legally ceased; Articles 2–3 invalidate the Vichy legislative/constitutional acts as specified; Article 7 recognizes actions of the de facto `gouvernement de l'Etat français` as a distinct legal-administrative category with provisional effects for some acts. Official current authoritative source: https://www.legifrance.gouv.fr/affichTexte.do?cidTexte=LEGITEXT000006071212 . **Result:** `French Republic` is defensible as continuing higher-order legal identity; **Vichy is neither erased as de facto authority nor blindly identified as legitimate Republican government**. Model separately with a source-backed `governance_context` or reviewed factual-authority construct if/when in-scope Persons/activities are authoritatively registered. No unseen Persons or Vichy Polity fabricated in P2-01C.
3. **1944–1946 Provisional Government vs Fourth Republic**: French National Assembly states the **1946 Constitution was promulgated 27 October**, while the provisional government continued until **24 December 1946** as institutions were installed. https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/quatrieme-republique/la-constitution-de-1946-et-l-instauration-de-la-ive-republique . **Result:** an institution's formal constitutional promulgation and the practical end of a provisional cabinet are not the same timestamp. The existing de Gaulle 1944→January 1946 `governs` Activity is valid and must not be stretched to 24 December (other provisional cabinet holders covered the remainder). The Fourth is a distinct constitutional regime of the French Republic, NOT proven to be a new sovereign Polity solely because the constitution changed.
4. **1958 Fourth→Fifth and cabinet transition**: French National Assembly confirms the **4 October 1958** constitution created the Fifth Republic; official 1 June 1958 investiture history confirms de Gaulle retained the head-of-government office through the **8 January 1959** presidential inauguration. https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/cinquieme-republique and https://www2.assemblee-nationale.fr/15/evenements/2018/1er-juin-1958-declaration-d-investiture-du-general-de-gaulle . **Result:** keep the already-reviewed Fifth `governance_context` starting 1958-10-04 on the existing French Republic. **Do not** split de Gaulle's one continuous 1958-06→1959-01 cabinet term, or manufacture a Fourth/Fifth sovereign boundary at 1959-01-08.
5. **Caveat on legal conclusions:** 1944 Ordinance provides French Republic's own continuity doctrine; this does not by itself erase the occupation, French State regime, resistance government/Free France, or all contested international-state succession debates. Legal sovereign continuity and de facto political-power succession must be represented **on distinct relation types/context axes**, not one Polity-name equivalence rule.

## 4. Scoped decision, non-mutation and exact next frontier

**Reviewed this turn:** No direct 1940–43 historical Activity row or Vichy/GPRF/Fourth typed governance context currently exists to rehome or source-link. The five postwar existing Activities are not historically inconsistent: **5/5 KEEP_UNCHANGED**. Country `France` versus political-authority `French Republic` does not justify bulk identity collapse. P2-01C therefore has **NO justified canonical Activity mutation**. No speculative Fourth `state_form` invented without an operationally and constitutionally periodized source-backed Governance Context. No Polity or name rows deleted, and no P14 Geometry mutation.

**Actionable confirmed coverage deficit:** Only `stage2:french-fifth-republic` constitutional Governance Context has been registered and attached on this French Republic UUID. To model the missing regimes without encoding Vichy as legitimate Third Republic:
- create/reuse proper typed and source-backed **GPRF government** context, and **Fourth Republic constitutional** context with verified transition dates (1946 constitutional promulgation versus December institutional formation must be recorded distinctly);
- if Vichy has no registered leader Activity in currently scoped Production, keep its de facto authority as a reviewed **future candidate / no fabricated Activity** rather than automatically inserting a sovereign Polity;
- examine existing `France` country-umbrella scope as separate higher-order geographical/political anchor, with no forced relink of `active_in` cultural records;
- use the **current authenticated writer** for any future canonical context/source additions, exact-before guards and a subsequent Runtime read-back; do not manufacture no-op `rewrite_activity` operations simply to trigger the correction workflow.

**Exact next bounded unit: `POLITY-P2-01D` — reviewed authority/coverage preflight for source-backed GPRF and Fourth-Republic Governance Contexts and actual eligible current writer; only apply if supported.** This is a **reconciliation blocker within the original single `france-regime-family` seed**, not a new 26th review seed. The v3 France family review remains `REVIEW_REQUIRED`; **75 total / 50 terminal / 25 pending** must not be changed merely because P2-01C's evidence audit is complete. Previously terminal `france-duplicate-fixed` remains terminal. The now-zero-Activity Kingdom and Third Republic Polities remain live; deletion/retirement requires explicit user authorization. P1-02 Japan stale tombstones, P1-03R Place backfill are separate final-acceptance blockers. P14 Territory Geometry remains user-PARKED and must not auto-resume.
