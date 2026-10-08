# POLITY-P2-01B — French Third Republic: stable Republic identity and temporal historical designation

**2026-10-08 | Status at request stage: REVIEWED_EXACT_PREFLIGHT / CORRECTION_APPLY_PENDING / NO_DELETION.**

## Bounded identity decision

Connected Production Supabase `wfrbxltvpmlprgwfysxq`, `atlas_v2` read-only exact census: **French Third Republic** canonical UUID `3d72277f-c92e-476c-8174-804f700d10cc` has 2 reviewed Activities, while already-established persistent **French Republic** (canonical key `stage2:french-republic`, UUID `b138f5e4-ff83-40f6-bdb1-83b08c0256cb`) has 14 Activities. **Nine** generic Activities occur in the Third Republic years (1878–1931); **five** occur in 1944–1969. The generic Republic already holds a separately typed `French Fifth Republic` constitutional Governance Context starting 1958-10-04. This later Governance Context is not a basis for assigning every French century one undifferentiated regime; it is evidence of a stable Republic Polity + temporal regime modeling rule.

The named Third Republic row's two Activities are not a second simultaneous French sovereign authority; they overlap the ordinary Third Republic of the generic Republic. Retain their exact history, normalize them to the existing French Republic identity and preserve the precise **Third Republic** name as a **bounded, sourced historical `state_form` designation** on that identity. `state_form` is a supported temporal-name primitive; this unit does not assert a new separately created Governance Context (the current Correction contract only supports a Governance Context period with a pre-existing Context UUID). P2-01C separately examines 1940 legal/war rupture and Provisional/Fourth/Fifth governance; **no silent wartime continuity verdict**.

## Exactly two before Activities

| Person / role | Activity UUID | Dates | Normalized source |
|---|---|---|---|
| Coco Chanel, fashion designer | `6b528503-9cb7-4015-8c0d-b89b8cfe7fff` | 1910 (representative fashion milestone, not office) | 1, Metropolitan Museum of Art |
| Raymond Poincaré, President of French Republic | `93bace7c-b31e-494e-ac60-a5d173659b1d` | 1913–1920 (year-level representation of 18 February 1913–18 February 1920) | 1, Élysée |

All two have their own precise Activity UUID, Person UUID, Role, Relation Type, PeriodBasis, dates, note text, and normalized Source link. **The existing 14 generic Republic Activities and its 1958 Fifth governance context are untouched**. Origin Third Republic Polity has two preferred EN/KO names but **zero** other direct source/designation/governance/relationship/territory/place/context/retirement links. Its UUID/2 name rows must remain live unless the user separately explicitly approves deletion/retirement.

## Constitutional chronology from primary records

- Official Assemblée nationale page [1870–1940 Third Republic](https://www2.assemblee-nationale.fr/decouvrir-l-assemblee/histoire/le-suffrage-universel/la-republique-et-le-suffrage-universel/1870-1940-la-iiieme-republique-ou-l-avenement-du-suffrage-universel-masculin) describes its proclamation on **4 September 1870** and parliamentary-democracy collapse on **10 July 1940**. It establishes the bounded historical label, **not** the future legal status of constitutional continuity during Vichy.
- Élysée [Raymond Poincaré](https://www.elysee.fr/en/raymond-poincare) confirms Republic presidency **18 February 1913–18 February 1920**. Do not invent this daily precision in the current year-granularity activity.
- Existing normalized Coco Chanel activity Source: Metropolitan Museum of Art's Chanel record `https://www.metmuseum.org/exhibitions/listings/2005/chanel`, retained as-is.

## Reviewed canonical Correction

`corrections/plans/polity-french-third-republic-state-form-20261008.v1.json`:
1. Exact-before guard for **only 2** existing Activities, change only `polity_id` to stable French Republic, preserve 2 linked Sources, notes, role, temporal granularity, dates and identities. No changes to other 14 Activities.
2. Introduce one reviewed National Assembly governmental reference Source, protected by absent UUID and uniqueness checks.
3. Introduce an additive three-locale `French Third Republic / Troisième République / 프랑스 제3공화국` historical `state_form`, **1870-09-04 to 1940-07-10**, on existing French Republic UUID; link both National Assembly source and existing Élysée Poincaré source. Time window is deliberately **not** extended past the 1940 rupture.
4. Atomic dry_run + apply through existing authenticated Production Correction workflow, exact checks and independent Runtime read-back; no raw SQL write and no Polity retirement, no P14 geometry.

Expected: Third Republic direct 2→0, French Republic direct 14→16, French family total 65 maintained, Authoring=Runtime=65, zero identity/date parity differences. New designation 1 with 3 preferred names and 2 sources. Former Third Republic UUID stays live, deletion requires user approval. France family review remains **REVIEW_REQUIRED**, 25 seeded pending case count unchanged.

**If Correction fails, this unit remains APPLY_PENDING and P2-01C must not begin.** After verified postwrite closure, next independent work unit is **POLITY-P2-01C — 1940 wartime/provisional/Fourth/Fifth and France-country umbrella**, not a second simultaneous mutation. Japan P1-02 stale-tombstone and Place P1-03R remain separate acceptance blockers; P14 Geometry parked.
