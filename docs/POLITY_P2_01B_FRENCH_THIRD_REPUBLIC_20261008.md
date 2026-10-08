# POLITY-P2-01B — French Third Republic: stable Republic identity and temporal historical designation

**2026-10-08 | Final status: CORRECTION_APPLIED / AUTHORING_AND_RUNTIME_65_PARITY_VERIFIED / NO_DELETION / FAMILY_STILL_REVIEW_REQUIRED.**

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

**Correction applied and independently verified: P2-01B is CLOSED.** Next independent work unit is **POLITY-P2-01C — 1940 wartime/provisional/Fourth/Fifth and France-country umbrella**, not a second simultaneous mutation. Japan P1-02 stale-tombstone and Place P1-03R remain separate acceptance blockers; P14 Geometry parked.


## Verified Production closeout (2026-10-08 12:16:29 UTC; 21:16:29 KST)

- **PR #2166 merged** into main at `eeda9cd45c80c71f639c5d0d95b0d37be9d29748`; Integrity PR workflow `37775493240` **SUCCESS**. Authenticated **ATLAS Correction Apply run #37775652033 SUCCESS**; connected Production `atlas_v2.correction_manifest_runs` records request `polity_french_third_republic_dual_identity_relink_20261008_v1` applied `2026-10-08 12:16:29.164769+00`.
- Exact postwrite canonical count: `French Third Republic` UUID `3d72277f-c92e-476c-8174-804f700d10cc` **2→0**; existing `stage2:french-republic` UUID `b138f5e4-ff83-40f6-bdb1-83b08c0256cb` **14→16**.
- Coco Chanel Activity `6b528503-9cb7-4015-8c0d-b89b8cfe7fff` 1910 and Raymond Poincaré Activity `93bace7c-b31e-494e-ac60-a5d173659b1d` 1913–1920 now bind to the generic French Republic; the original two normalized Activity Source links (Met and Élysée), Activity UUIDs, Person/Role and temporal intervals are retained. The already-linked 14 generic activities are not rewritten.
- New `state_form` designation `0a6e5f40-1052-41fc-ba21-2c312919327b` has exact **1870-09-04→1940-07-10** bounds; all **3 preferred EN/FR/KO names** and **2 evidence links** exist. Newly sourced National Assembly URL is bound to Source UUID `7bd626d5-ccbb-4d31-bfeb-f6e4df167fa6`; existing Élysée Poincaré source `75586017-b4b5-4a93-9148-d00db06bbdc9` is reused.
- Immediately after Correction apply and before Runtime compile, the 2 rewritten Authoring rows temporarily diverged from Runtime (**65/65, drift 2**). This was not accepted as closeout. **ATLAS Runtime Projection Compile run #37775750359 SUCCESS**, and independent Production read now gives **65 Authoring / 65 Runtime / 0 drift** across Person, Polity, Role, PeriodBasis, Relation Type, and full date/granularity/certainty/calendar tuple. Exactly 2/2 rehomed target Runtime rows match after compile.
- Former Third Republic Polity UUID remains **live with 2 EN/KO preferred names**; **no deletion/retirement was performed**. Its administrative cleanup requires separate explicit user approval; current zero direct Activity is not permission to delete.
- Pre-existing Fifth Republic Governance Context on generic French Republic (1958-10-04→open) remains in place, as do the five post-1944 generic French Republic Activities. This unit does not decide whether 1940 constitutional rupture or 1944 provisional government constitutes new sovereign Polity identity.

**Closeout boundary:** P2-01B only; France regime-family `france-regime-family` remains **REVIEW_REQUIRED**, 25 seeded cases pending. Root Issue #1895 remains OPEN. Next exact one-unit frontier: **POLITY-P2-01C**. P1-02 Japan tombstones, P1-03R Place backfill and P14 Territory Geometry user-park remain unchanged.
