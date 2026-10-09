# POLITY-P2-03H — Brazil 1968 official-title transition and current Production Source-alias census

**Scope status:** P2-03H historical boundary investigation + Production Source metadata audit **CLOSED**. Parent `brazil-regime-family` remains **REVIEW_REQUIRED**, no canonical writes, no Polity consolidation or retirement.

## A. Historical primary evidence: 1968, not solely 1967 or 1969

**Decisive documentary find:** Brazilian **Law No. 5.389, dated 1968-02-22**, published in the *Diário Oficial da União* on **1968-02-23**. [Original law via Chamber of Deputies](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html), [Chamber legal metadata confirming the DOU date](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-norma-pl.html), [Senate independent text](https://legis.senado.gov.br/norma/547253/publicacao/15715169).

- **Art. 1º, items 2–3:** expressly orders changing the state coat of arms legend `Estados Unidos do Brasil` to `República Federativa do Brasil`; likewise for the national seal's longer old-republic name.
- **Art. 3º:** characterizes these changes as resulting from a change in Brazil's **official designation** (`mudança da denominação oficial do Brasil`).
- **Art. 4º:** law enters into force on its **publication date**, DOU 1968-02-23.
- This law was later revoked by Law No. 5.700 of 1971 **for the national symbols**, which is NOT evidence that the country's name reverted to `Estados Unidos do Brasil`.

The official [Chamber historical outline of the Fifth Republic](https://www2.camara.leg.br/a-camara/conheca/historia/a5republica.html) independently identifies official country-name change in 1968 using **Law No. 5.389** and Consultoria Geral da República **Opinion H-733 of 1968-09-14**. The full primary text of H-733 was **not retrieved**, so its conclusions must not be quoted or invented. Another Chamber historical chronology [5ª República](https://www2.camara.leg.br/a-camara/conheca/historia/Ex_presidentesCD_Republica/republica5.html) contains a conflicting year-internal **22.08.1968** dated entry beside `Lei 5.389`. That cannot displace the authenticated **1968-02-22 signing / 1968-02-23 DOU publication** shown by the law and statutory metadata; record this discrepancy rather than silently rewriting a source date.

Relevant historical controls:
- [1967 Constitution as originally promulgated](https://www2.camara.leg.br/legin/fed/consti/1960-1969/constituicao-1967-24-janeiro-1967-365194-publicacaooriginal-1-pl.html): expressly headed `CONSTITUIÇÃO DO BRASIL`; Art. 1 describes `O Brasil é uma República Federativa`. **Constitution effective 1967-03-15** but a form-of-state phrase alone is not an exclusive legal proper-name change.
- [1969 Constitutional Amendment No. 1](https://www2.camara.leg.br/legin/fed/emecon/1960-1969/emendaconstitucional-1-17-outubro-1969-364989-publicacaooriginal-1-pl.html): later constitution text expressly displays `CONSTITUIÇÃO DA REPÚBLICA FEDERATIVA DO BRASIL`, with effect 1969-10-30. Hence it **confirms** later wording but **did not originate** the 1968 already documented national-symbol name replacement.
- [1889 Decree No. 1](https://legis.senado.leg.br/norma/385329/publicacao/15772955) / 1891–1946 Constitutions: old `Estados Unidos do Brasil` republican historical title. Empire→Republic is a substantive 1889 break; the 1968 *name update alone* does not evidence formation of a different sovereign state.

**Review-only chronology candidate, NOT a Production interval assertion:**
- Early republican name `Estados Unidos do Brasil` plausibly valid **1889-11-15 through 1968-02-22**.
- Later title `República Federativa do Brasil` plausibly valid **from 1968-02-23**.
- The proposed exclusive boundary is strongly corroborated by the law's publication and force date plus Art 3's phrase but still needs explicit handling of the September 1968 H-733 opinion, law-date conflicts, title-name semantics, and `designation_type` before immutable canonical `polity_designations` are asserted. Distinguish statutory change on state symbols versus exhaustive legal analysis of full country proper name.
- Both names should eventually be **temporal names of one reviewed republican identity**, not two states; this is a reviewed hypothesis, not permission to move Activity or retire a UUID.

## B. Exact current Production Source identity census

**Code:** [PR #2298](https://github.com/JezCH/atlas-person-db/pull/2298), merge SHA `9f20916756c7c6f638cc85d219eba4f3f2d2bb4d`, Integrity #37919930191 SUCCESS.

**Live audit:** [ATLAS Audit Inventory run #37920065332](https://github.com/JezCH/atlas-person-db/actions/runs/37920065332), job `113785586996` success at **2026-10-09 10:51 UTC / 19:51 KST**. Vercel Production for exact SHA `9f20916756c7c6f638cc85d219eba4f3f2d2bb4d` READY, deployment `dpl_4XvZ7DDszsojA7HiujkWM2xDZcpJ`. OIDC authenticated, repeatable-read, READ ONLY, committed=false. No canonical mutation.

**Exact result:** `brazil_source_aliases.total_metadata_matches=0`, `returned_count=0`, `complete=true`, `truncated=false`. Sources table filter scanned metadata fields `source_key`, `title`, `canonical_url`, `citation_text` for 1889/1891/1934/1946/1967/1969/1988 constitutions and specific statutory patterns `5389`, `5.389`, `H-733`, `Estados Unidos do Brasil`, `República Federativa do Brasil`, official legal catalog URL components. All matching rows were counted, up to 100 returned, with explicit truncation guard. **Zero matches** makes it plausible that no Source row is already *discoverably labeled* as those government legal texts. It **does not** exhaust bibliographic semantics under generic title/key or guarantee absence of an embedded legal reference in an external payload.

The earlier [P2-03G exact Production audit](POLITY_P2_03G_BRAZIL_LIVE_PRODUCTION_PREFLIGHT_20261009.md) reported 7 exact canonical URL matches **0**, Activity UUID before-state **10/10 unchanged**, Person-Activity Source links **17**, Runtime reference counts 2/1/7, existing retired identity links **0**. P2-03H did not create Source IDs or update any of those records.

## C. Source and Temporal Designation writer-ready review constraints

Machine-readable companion: `docs/audits/P2_03H_BRAZIL_OFFICIAL_NAME_SOURCE_REVIEW_20261009.json`.

To turn this into actual canonical facts using the existing `server/atlas-correction-v2-stage2-assertions.js` contract, later bounded work must:
1. Determine actual Source IDs and potential collisions through approved Source writer exact-before. Each `assert_source` demands actual `source_key`, `source_type`, title, https `canonical_url`, `citation_text`, no faked `sha256` or bytes. Primary documents here are *candidates*, not already-registered `Source` UUIDs. Recheck Source catalog before write.
2. Confirm name date/review precision under H-733 and legislated symbols vs proper legal denomination. Approve exactly **one nonoverlapping time interval per applicable Activity**; a gap must result in stable-name fallback rather than fabricated designation.
3. `assert_polity_designation` requires real designation UUID, reviewed `designation_type`, date granularities/certainty, localized names and at least one real Source link with exact `source_locator_key`.
4. Do not apply later-republic temporal designation only to 1969–1995 while silently leaving 1930–1964 Vargas/Goulart with wrong anachronistic names after any future Polity unification. Check all ten original Activity IDs and Source locators, exact Runtime row payload and the other linked Polity reference surfaces before any merge/relink.
5. **Do not delete or retire** `United States of Brazil` or any other Polity without explicit user approval. Preserve separate imperial sovereign identity. No automatic jump to Oman.

**P2-03H review and Production metadata audit CLOSED.** Parent status `brazil-regime-family=REVIEW_REQUIRED`, overall **51 terminal/75 total; 24 pending**. **NEXT exact unit: POLITY-P2-03I — convert authenticated legal evidence and the now-verified Source-collision scope into a reviewed, non-destructive Source assertion proposal with correct bibliography, exact-before, title intervals and temporal-display test; no automatic canonical merge or retirement.**
