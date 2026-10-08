# POLITY-P2-01 — France regime-family authority and Activity census (2026-10-08)

**Status: BOUNDED FAMILY CENSUS COMPLETE / FRANCE SEED STILL REVIEW_REQUIRED / CORRECTION NOT YET APPLIED.**
**Work unit:** first carried historical-family seed `france-regime-family` in `atlas-polity-review-registry.js`, not the already terminal historical `france-duplicate-fixed` case. **Scope boundary:** France proper. East Francia, Frankish Kingdom, New France, French Guiana, Napoleonic Italy and the Kabyle resistance have different territorial/identity meanings and were excluded; broad all-Production discovery remains deferred.

## 1. Authoritative current evidence

Fresh read-only connected Supabase `wfrbxltvpmlprgwfysxq`, canonical `atlas_v2.polities`, `person_politics_v2`, `runtime_person_politics_v1`, `polity_designations`, `polity_governance_periods`, retirements, and normalized source joins.

| Current canonical key | Live Polity UUID | Authoring / Runtime | Observed Activity window | Direct Polity Sources | Designations |
|---|---|---:|---|---:|---:|
| Kingdom of France | `7e090994-f196-4957-8295-dcfa08c53fba` | 5 / 5 | 1180–1785 | 0 | 0 |
| France | `1eaa48b6-dc60-49d6-91c4-49db556f4ddf` | 32 / 32 | 1226–1957 | 0 | 3 |
| French First Republic | `24c975e9-f93c-548b-bfcb-60043d9e6c4f` | 4 / 4 | 1793–1804 | 1 | 0 |
| First French Empire | `3ff63558-6761-5585-9dcf-f9a6da53606a` | 5 / 5 | 1804–1815 | 1 | 0 |
| French Second Republic | `fdb99251-0df5-4c6b-9ca0-c1ce51ae1578` | 1 / 1 | 1848–1852 | 0 | 0 |
| Second French Empire | `4f473a9c-4aab-4668-8092-8b370f8d4990` | 2 / 2 | 1852–1870 | 0 | 0 |
| French Third Republic | `3d72277f-c92e-476c-8174-804f700d10cc` | 2 / 2 | 1910–1920 | 0 | 0 |
| stage2:french-republic (preferred **French Republic / République française / 프랑스 공화국**) | `b138f5e4-ff83-40f6-bdb1-83b08c0256cb` | 14 / 14 | 1878–1969 | 0 | 0 |

**Checksum: 8 live Polities / 65 Authoring Activities / 65 Runtime Activities / 0 identity-date/role/person mismatches** across all 65 matching Activity IDs, Person IDs, Polity IDs, Role IDs, PeriodBasis IDs, RelationType IDs, and start/end date year/month/day/granularity/certainty/calendar. No live↔retirement collision exists among these eight UUIDs. Direct Polity Source counts are 0 for six, 1 each for First Republic and First Empire; this must not be confused with existing normalized Activity source links (all eight have Activity sources).

No first-class `polity_identity_relations` or `polity_relations` connect the eight French live identities. Only one governance period was found in this set: Fifth Republic 1958→open on the generic `stage2:french-republic` UUID. Its note explicitly ties the period to the Constitution of 4 October 1958.

## 2. Existing completed precedent versus regression

**Already completed and do not replay:** merged #1357 relinked **21** earlier `Kingdom of France` Activities into stable `France` while preserving Activity UUID/date/normalized sources; it introduced reviewed `state_form` designations on the stable France UUID. #1378 retired the now-empty **old** Kingdom UUID `2fcc634c-9806-5fe8-96fe-e4310124908a` on 2026-09-21, with no survivor redirect. Registry `france-duplicate-fixed` is terminal for this earlier operation. Current retirements include this old Kingdom row and a separate retired `French Fifth Republic` UUID `524642ff-33fb-52f3-8623-e4a877b1997a`.

**Later new live Kingdom identity:** currently a *different* UUID `7e090994-f196-4957-8295-dcfa08c53fba` has five Activities:
- Philip II of France, King, **1180–1223**, Activity `2b038365-e813-49d9-96f5-b205aa6dc65f`;
- Jacques Cartier three historically discrete crown-service voyages **1534**, **1535–1536**, **1541–1542**; Activity IDs `e905e9ac-93f5-4344-aaca-0988d38cbd39`, `1ae0c204-97ad-4e5b-aa80-8e39394c43a3`, `15d08c77-e784-4695-8951-c62c2757df1b`;
- Jacques-Louis David, painter, **1785**, Activity `10d804aa-dd44-44d2-b83d-3dfea8c21482`.

Merged #1905 registered the three Cartier voyages as reviewed, preserving their intervals and provenance but **reusing the live Kingdom of France canonical name**, which in hindsight conflicts with the earlier stable-France state-form-only decision. Philip II / David belong to the same reconsideration set. The cause/transaction that originally introduced the new UUID is not proven by #1905 alone; do not attribute it definitively.

**France's reviewed `state_form` designations are already present:**
- `70124d31-f22b-4715-bfd8-99cadc18badb`: Kingdom of France / 프랑스 왕국 **1226–1792** (modeled period; 1180–1223 Philip II is before this modeled floor);
- `719fa6e7-2053-4f81-9d75-e4cabf29dc55`: first Bourbon Restoration **1814–1815**;
- `21d2913e-c71a-40e9-865c-2d8a3a421b15`: second Bourbon Restoration **1815–1830**, with the Hundred Days imperial interlude preserved.
These are **distinct temporal intervals**, not evidence for merging the revolutionary First Republic or Napoleonic Empire into the royal designation.

## 3. Further current boundary ambiguity

- **Third Republic duplicate track:** canonical `French Third Republic` stores Coco Chanel (1910) `6b528503-9cb7-4015-8c0d-b89b8cfe7fff` and President Raymond Poincaré (1913–1920) `93bace7c-b31e-494e-ac60-a5d173659b1d`. Meanwhile the generic `stage2:french-republic` has third-republic figures Louis Pasteur, Vincent van Gogh, Gustave Eiffel, Alfred Dreyfus, Marie Curie, Georges Clemenceau (1906–1909, 1917–1920), Marcel Proust and Salvador Dalí (1878–1931, nine individual Activities). Coexistence requires an explicit **generic Republic vs Third-Republic state-form** decision; no safe name-only consolidation exists.
- **Across rupture windows:** `stage2:french-republic` also has Charles de Gaulle as head of provisional government (1944–1946), Simone de Beauvoir (1949), de Gaulle as Prime Minister (1958–1959), de Gaulle as President (1959–1969), and Michel Foucault (1966). The 1958–1959 activity straddles adoption of the Fifth Republic constitution and inauguration; distinguish actual cabinet office from state identity. The generic Republic already has one 1958→open **Fifth Republic governance context**, indicating its creators explicitly modeled the Fifth as a regime of that live Republic; this is *not* a mandate to blindly split into new UUIDs.
- **Country-umbrella mixed representation:** canonical `France` has legitimate broad `active_in` cultural/intellectual anchors and monarchical, ministry and revolutionary examples; 32 Activities range from Louis IX (1226) to Albert Camus (1957), including post-1814 royal Bourbon ministries. `France` and named Republic/Empire identities overlap in chronology, so user-facing entity semantics (stable country/location vs sovereign government polity) must be made explicit before bulk rerouting.
- **Already unambiguous boundaries:** reviewed First Republic→First Empire constitutional boundary (18 May 1804) is reflected in Napoleon's First Consul and Emperor Activities and Talleyrand's split Foreign Ministry Activities, with his original 1797–1799 Directory ministry separate. Napoleon's 1815 Hundred Days are again attached to the First Empire, not wrongly modeled as uninterrupted Restoration monarchy. Napoleon III's 1848–1852 presidency and 1852–1870 empire are independently linked. Preserve these work products unless contradicting source evidence emerges.

## 4. Historical regime chronology — direct external check

Official French National Assembly / Ministry of Interior materials distinguish the 1792 republic, the 1799–1804 Consulate, 1804 empire, first Restoration, the Hundred Days, second Restoration, July Monarchy, Second Republic, Second Empire, Third Republic, wartime/Vichy and provisional government, Fourth Republic, and Fifth Republic. The detailed 1792–1959 transition list is given in the Assemblée nationale parliamentary/government database:
- https://www.assemblee-nationale.fr/gouv_parl/regimes.asp
- https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/revolution-francaise
- https://formation-civique.interieur.gouv.fr/fiches-par-thematiques/histoire-geographie-et-culture/les-regimes-politiques/

**Important interpretation limit:** these primary sources establish constitutional/government regime dates; they do **not** independently decide the ATLAS entity model (one UUID per regime, or one persistent country UUID plus temporal designations). A shift of regime alone does not license destructive merge or reverse an earlier reviewed rupture rule. Calendar/day-level corrections demand separate Activity evidence before any write.

## 5. Scoped correction work and exact bounded next step

The **single review seed remains `REVIEW_REQUIRED`**, not a false terminal `FIXED` or `HOLD_UNRESOLVED`. Completing this audit makes the defect set concrete; it is **not completing the France identity family correction**. Decreasing the active review count from 25 to 24 would be inaccurate until a reviewed disposition resolves the identified live conflicts.

**P2-01A — NEXT smallest executable unit: reverse the reintroduced Kingdom-of-France duplicate against the prior stable `France` model**, only after exact 5-Activity review and one-time correction authority:
1. Preflight exact 5 Activity UUIDs, sources, references and existing 1226–1792 `state_form` interval. Decide how to represent **1180–1223 Philip II** (extend the Kingdom designation's reviewed floor only with evidence or create a separate gap-safe designation; do not silently revise `1226`).
2. Prepare a canonical Correction manifest for exact Polity UUID relinks of those **five** Activities to existing France UUID (never create a Person/Activity, never merge distinct Cartier voyage periods). Check source/role/period-basis match. Because deletion requires explicit user approval, **do not retire or delete** new Kingdom Polity `7e090994-f196-4957-8295-dcfa08c53fba` automatically; after all refs clear, document approval gate for its independent retirement.
3. Run authenticated Correction preflight/apply/Runtime compile and exact postwrite verification only when current canonical contract supports it and protected concurrency permits. No ad-hoc SQL mutation.
4. Revalidate the remaining French family. **P2-01B** then reviews `French Third Republic` vs generic `French Republic` (two vs fourteen Activities), and **P2-01C** handles country umbrella, 1940–1959 Fourth/Fifth/provisional representation and family closure. Each is a separate turn-sized authorized work unit; **no parallel mutation**.

The other **24** seeded `REVIEW_REQUIRED` cases remain untouched. Root #1895 stays OPEN. The P1-02 Japan stale-tombstone (three rows, explicit deletion approval) and P1-03R missing canonical Place authority are independent final-acceptance blockers. P14 historical Territory Geometry stays **PARKED_BY_USER / DO_NOT_AUTO_RESUME**.

**Conservation contract:** current France family census=65 Activities with exact Authoring/Runtime parity=65 and zero mismatches. Any future mutation must retain every reviewed Person, Activity UUID, role, chronology and normalized provenance except independently evidenced precise corrections.
