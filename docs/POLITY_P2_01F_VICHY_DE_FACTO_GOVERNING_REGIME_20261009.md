# POLITY-P2-01F — Vichy `État français` as de facto governing regime, not Republican legitimate government

**9 October 2026. Status at submission: source/subject/relation semantics REVIEWED, canonical assertion-only Correction prepared; Production apply / exact Runtime read-back PENDING.**

## 1. Historical sovereignty and de facto authority are separate axes

Official French sources distinguish a recognized, real **Vichy governing authority** from the French Republic's juridical continuity:

- [French National Assembly — 10 July 1940 Pétain full-powers law](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/deuxieme-guerre-mondiale/des-decrets-lois-du-gouvernement-daladier-au-vote-par-la-chambre-des-deputes-et-le-senat-des-pleins-pouvoirs-au-marechal-petain): Pétain succeeds Paul Reynaud as President of the Council **16 June 1940** by the existing Republican mechanism; the National Assembly grants constitutional full powers **10 July 1940**. These are *not the same authority transition*. The Vichy constitutional acts followed **11 July**; neither 16 June nor 11 July replaces the July 10 vote milestone as the source-defined political regime-start convention.
- [Ministry of Armed Forces / Chemins de mémoire — 20 August 1944 Vichy regime end](https://www.cheminsdememoire.gouv.fr/fr/1944-08-20-fin-du-regime-de-vichy): explicit official history-calendar endpoint for the Vichy regime **20 August 1944**. This was neither the full liberation of metropolitan France nor the extinction of the German-controlled Sigmaringen puppet aftermath; different instruments might have different last-cabinet dates.
- [Légifrance — Ordinance 9 August 1944, Art. 7](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006530181) names Vichy the `autorité de fait` claiming to be government of the `État français`. [Art. 1](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006530175) states the Republic had never legally ceased to exist; [Art. 3](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000006530177) expressly invalidates the July 1940 constitutional measure and discriminatory wartime acts. Art. 7 also provisionally preserves certain administrative effects, making it false to say the Vichy government was historically nonexistent merely because its constitutional legitimacy was denied.
- [French National Assembly — restoring republican legitimacy](https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/deuxieme-guerre-mondiale/gouvernement-provisoire-de-la-republique-francaise-et-restauration-de-la-legalite-republicaine) confirms wartime conflict of authority, occupation and Liberation. Vichy collaboration/persecution and administration are real historical facts; official sources are not interpreted as retrospective ethical approval.

**Decision:** `Vichy regime (de facto French State) / Régime de Vichy (État français, autorité de fait) / 비시 정권(사실상 프랑스국 정부)` must be represented as a **real, temporally bounded `governing_regime` Context** on the historical higher-order **`France` country-umbrella**; not on the legally continuing `stage2:french-republic` political-authority Context, and **not** as an extra sovereign Polity. `governing_regime` is a preexisting **schema-supported type**, currently used for the Toyotomi regime on Japan; the schema enum allows only `government`, `constitutional_regime` and `governing_regime`. We do not invent a new enum value or a made-up Person.

The 10 July 1940 to 20 August 1944 inclusive scope is sourced as a regime chronology and **does not** assert one Vichy administration maintained uninterrupted exclusive control of every French region/colony. It overlaps Free France/CNF/CFLN rival governmental authority on a *different Polity subject* and is not a historical contradiction. Government claims are distinct from occupation and district-specific `territory geometry`, which this user has PARKED.

## 2. Live Production preflight / alternative schema review

Supabase Production project `wfrbxltvpmlprgwfysxq`, read-only, exact 2026-10-09:

| Existing entity and purpose | Canonical key / UUID | Direct Activities |
|---|---|---:|
| country-umbrella historical France | `France` / `1eaa48b6-dc60-49d6-91c4-49db556f4ddf` | 37 |
| legally continuous French Republic polity authority | `stage2:french-republic` / `b138f5e4-ff83-40f6-bdb1-83b08c0256cb` | 16 |
| all eight France-family live Polities | existing reviewed exact UUIDs | **65 Authoring / 65 Runtime / 0 drift** |

Production `atlas_v2.governance_contexts` has **no Vichy/de facto context** or official Source URL colliding with the new requested sources. The sole country-umbrella has 4 historical Kingdom state-form designations, **no governance periods** before this correction. The French Republic holds reviewed CNF (1941–43), CFLN (1943–44), GPRF (1944–46), Fourth (1946–58), Fifth (1958→) contexts and Third Republic temporal designation, all to be preserved.

**Relational type gate**: `polity_relation_types` currently has **only** constituent/dependency relationships (`constituent_of`, `colonial_dependency_of`, `dominion_of`, `nominally_subordinate_to`, `vassal_of`). `polity_identity_relation_types` has **zero** registered types. None encodes *same nation / higher-order country umbrella / juridical Republic political authority*, or historical rival-de-facto-government legitimacy and jurisdiction. Therefore **no `polity_identity_relation` or `polity_relation` between France and the Republic is invented**: forcing a `vassal_of` or historic predecessor relation would be a category error. These semantic edges remain an explicit future bounded architecture/typed-relation task, not an undocumented false merge.

Bounded normalized Person/name census found the existing Charles de Gaulle with 3 1944–69 French Republic Activities, but no exact registered Philippe Pétain or Pierre Laval; Pétain's June 1940 legitimate Council presidency, July de facto regime, and subsequent actions cannot be honestly represented by a fabricated or relinked Person record. **Zero added Person/Activity UUIDs**, no removal/retirement.

## 3. Exact supported canonical Correction scope

`corrections/plans/polity-france-vichy-de-facto-governing-regime-20261009.v1.json`:

1. `operations:[]`. Assert **3** documentary Sources: National Assembly 10 July 1940, Ministry of Armed Forces 20 August 1944, and Légifrance Article 7 (the article's link to Article 1 explicitly retained in citation/period notes). All were absent in exact preflight; unique source keys and URLs.
2. Assert exactly **1** new `governing_regime` Context `be34df5e-f43f-4645-bf04-1aaf4b213867`, key `stage2:vichy-etat-francais-de-facto-regime-1940-1944` with **3** preferred EN/FR/KO names explicitly labeling it *de facto*.
3. Assert exactly **1** period `2e71211b-94e2-405e-82d9-88394f2f8bad` on historical **France country-umbrella UUID** `1eaa48b6-dc60-49d6-91c4-49db556f4ddf`, reviewed Gregorian day bounds **1940-07-10→1944-08-20** with **3 normalized Source links**. Precise notes prohibit any implication of exclusive territorial sovereignty, legitimate constitutional authority or new independent statehood. Another regime's overlapping dates do not create a duplicate source row.
4. Use current tested **assertion-only** Correction-v2 writer: OIDC GitHub Actions, read-only preflight, digest, fail-closed exact assertions, serializable atomic Production apply, immutable ledger, Runtime compile and independent matched-identity/time read-back. No direct Supabase write.
5. Existing Free French CNF/CFLN, GPRF, Fourth and Fifth exact Context periods and every one of the **65 existing Person Activities** remain untouched. No territorial geography edits, user-protected deletion or unapproved identity edge.

**Expected live state:** 1 new typed governing-regime, 3 names, 1 period, 3 official Sources and 3 source joins; France umbrella **37**, Republic **16**, family **65 Authoring /65 Runtime /zero drift**, existing five French Republic governance contexts untouched. No new sovereign `Vichy French State` Polity record is inferred from a government name.

## 4. Open identity-edge contract and safe next frontier

Once the new Context is verified, the **remaining France umbrella ≠ Republic identity semantic question** is whether `France` is a perennial state identity, country-level activity anchor or geographical scope, and what exact non-succession **country-umbrella-to-constitutional-political-identity relation** is supported without collapsing earlier 18th/19th governments into an unhistorical all-era `French Republic`. This is NOT solved by attaching a de facto regime to the country umbrella. Registered current relationship vocabulary does not encode it; adding a new normalized relation type potentially affects every civilization family's taxonomy and requires a separately bounded schema/contract approval.

**Next independent bounded unit: POLITY-P2-01G — evaluate typed historical `country umbrella` versus `French Republic` authority relation and validate canonical contract, with no automatic 37↔16 Activity rewrites or empty-Polity retirement.** Keep France `france-regime-family` **REVIEW_REQUIRED**, original registry 75 seeds /50 terminal /25 pending. Japan P1-02 and Place P1-03R remain separate acceptance blockers, P14 Territory Geometry parked. The now-empty Kingdom and Third Republic Polity UUIDs remain live; deletion/retirement requires explicit user authorization.

**Apply proof must be written only after authenticated Production ledger, exact new rows, existing period conservation and 65/65/0 after Runtime compile are verified. Before those gates, this remains a reviewed plan, not a claim of committed Production data.**
