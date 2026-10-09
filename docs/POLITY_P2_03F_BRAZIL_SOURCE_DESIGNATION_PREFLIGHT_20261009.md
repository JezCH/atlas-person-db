# POLITY-P2-03F — Brazil republic source-backed designation review and exact non-destructive preflight

**Status:** source review and executable **READ-ONLY preflight preparation COMPLETE**; no Production mutation; `brazil-regime-family` remains `REVIEW_REQUIRED`.
**Scope:** Empire `efcd0f70-bffe-5464-86e3-b28b3658404b`, United States of Brazil `750bf6be-49e9-4215-95ff-a356ba1831cd`, Brazil `a8b27d54-b180-4d51-a664-dd40b3eed08f`.
**Last confirmed Production evidence:** [P2-03D run #37895503960](https://github.com/JezCH/atlas-person-db/actions/runs/37895503960) for exact 10 Activities/17 Person-Activity sources; [P2-03E run #37896793082](https://github.com/JezCH/atlas-person-db/actions/runs/37896793082) for **1 direct Polity Source (Empire), 0 Republican Polity Sources, 0 temporal designations, 0 identity relations and 0 governance periods**.

## 1. Independent primary-source review, with separate evidence and inference

| Primary source / provision | What text establishes | What it **does not** establish |
|---|---|---|
| 1889-11-15 Decree No. 1, Arts 1–2, [Chamber official publication](https://www2.camara.leg.br/legin/fed/decret/1824-1899/decreto-1-15-novembro-1889-532625-publicacaooriginal-14906-pe.html) | Proclamation of republican federal rule and `Estados Unidos do Brazil` on **1889-11-15** | Exclusive closing date of that designation |
| 1891-02-24 Constitution, title and Art 1, [Presidency](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao91.htm) | `Constituição da República dos Estados Unidos do Brasil`; constitutional republic and `Estados Unidos do Brasil` | A new second republican sovereign identity |
| 1934 Constitution, Art 1, [Presidency](https://www.presidencia.gov.br/ccivil_03/constituicao/constituicao34.htm) | Continued `Estados Unidos do Brasil` title after regime reform | Republican federation ceased/started as a new state in 1934 |
| 1946-09-18 Constitution, heading, [Senate](https://legis.senado.gov.br/norma/579492/publicacao/15675026) | `Constituição dos Estados Unidos do Brasil`, showing later constitutional use | A precise replacement date |
| 1967-01-24 Constitution, Art 1 and 189, [Chamber original](https://www2.camara.leg.br/legin/fed/consti/1960-1969/constituicao-1967-24-janeiro-1967-365194-publicacaooriginal-1-pl.html) | Federal republic affirmed; constitution took effect **1967-03-15** | That `República Federativa do Brasil` became the exclusive proper name exactly on 1967-03-15 |
| 1969-10-17 Constitutional Amendment No. 1, Arts 1–2, [Chamber original](https://www2.camara.leg.br/legin/fed/emecon/1960-1969/emendaconstitucional-1-17-outubro-1969-364989-publicacaooriginal-1-pl.html) | Revised constitutional text expressly headed `Constituição da República Federativa do Brasil`; amendment effective **1969-10-30** | The first-ever use of that wording |
| 1988-10-05 Constitution, title and Art 1, [Presidency](https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm) | `República Federativa do Brasil` affirmed by current Constitution | New independent state UUID in 1988 |

**Source-title caveat:** 1967 source descriptions may say `Constituição da República Federativa do Brasil` while the promulgated body is headed `Constituição do Brasil`. Also "República Federativa" is a form of government already proclaimed in **1889**, and should not be confused with a proven date of replacement of the proper name `Estados Unidos do Brasil`. Keep the **first exclusive use**, **constitutional commencement**, and **first attested use** as separate evidence classes.

**Historical review judgement (not canonical action):** Separate imperial state identity from the 1889 republic, while favoring the **one continuously modeled republican state** hypothesis over creating another sovereign state solely on the basis of the name. The 1964 regime change, 1967 constitution and 1969 amendment still need governance-period analysis but are not independently evidence of a new sovereign UUID. The existing `Brazil` UUID is the **working survivor candidate** based on seven linked Activities versus one early-Republic Activity, not an approved final survivor.

## 2. Deliverables and exact safety envelope

**Machine-readable source review:** `docs/audits/P2_03F_BRAZIL_REPUBLIC_DESIGNATION_REVIEW_20261009.json`. Seven official-source candidates carry URL, issuer, title, evidence locator and explicit limits; two **incomplete** temporal designation drafts carry missing end/start boundaries, missing `designation_type` and missing database Source UUID links. They cannot be sent to the canonical Stage 2 writer. It contains the exact ten known Activity UUIDs and expected polity/year ranges, including the **single Afonso Pena 1906–1909 transfer candidate** `7a021719-8a81-4367-9fd1-64e75f996563`.

**Executable independent preflight:** `db/audits/p2-03f-brazil-republic-continuity-preflight-readonly-20261009.sql`. A `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY` sequence covering:
1. each of ten exact Activity ID + original polity ID + year boundaries and entire observed Activity row;
2. **extra** Activity IDs not found in the ten-row historic set;
3. each raw Activity digest and all Activity-source IDs/locators;
4. current names/descriptions and direct Polity Source associations;
5. designation/name/Source rows, predecessor/successor identity relations, governance periods;
6. identity-retirement redirect/tombstone rows, Runtime row payloads, and scoped Authoring digest;
7. `atlas_v2` other polity-link column inventory and Source URL duplicate checks.

**Execution disclaimer:** the SQL was authored and tested for form in GitHub, but **has not been executed against Production** in P2-03F. The cited P2-03D/E readbacks are the latest factual database evidence for this family. This is a verification contract, not a database change, successful Production dry-run, or correction approval.

**Revalidation rule:** even a ten-row match is insufficient if the underlying Source locator, granularity, canonical key, reference catalog or runtime projection changed. Current values and exact-before must be rechecked at actual mutation boundary; never silently replace old Source references.

## 3. Technical implementation boundary

The repository's `server/atlas-correction-v2-stage2-assertions.js` supports `assert_source` and `assert_polity_designation`. A real Source assertion requires actual Source UUID, `source_key`, `source_type`, title, HTTPS `canonical_url`, nonempty `citation_text`, with `sha256`/`bytes` kept **null unless actually materialized**. A real Designation assertion requires actual UUID, `polity_id`, `designation_type`, exact precision fields, at least one localized name and nonempty `polity_designation_sources` links with real Source UUID and locator. These are **not satisfied** by the review JSON, by design.

The public `TEMPORAL_POLITY_DESIGNATION_JOIN_SQL` requires exactly **one** matching designation that completely covers each Activity's start/end (including actual month/day precision). Overlapping open-ended title definitions could suppress temporal display through ambiguity. **No two incomplete open-ended designations should be applied**; resolve a source-defensible, non-overlapping name interval first.

Potential state-integrity risk: currently Vargas' 1930–1945 and 1951–1954, Goulart's 1961–1964, Medici's 1969–1974 and Itamar's 1992–1995 Activities are tied to generic `Brazil`. Under a future survivor, the early name must also be evaluated for **existing 1930–1964** Activity rows, not just for 1906–1909 Afonso Pena. Do not rewrite their person/date/source information merely to change a displayed title.

## 4. Completion verdict and exact next starting point

**P2-03F DONE:** primary documents and their evidentiary limits reviewed, machine-readable title/source candidate dossier created, exact-Activity read-only correction preflight authored, permanent unit tests added. No Production writer action, merge, relink, retirement, geometry or Runtime change.

**NOT DONE:** Source canonical registration; temporal designation assertions; definitive name-boundary dating; Production SQL execution; direct Polity Source links; identity resolution; exact-live Runtime row-content parity and dry-run of a correction writer. `brazil-regime-family` stays `REVIEW_REQUIRED` (51 terminal/75, 24 pending).

**NEXT exact unit `POLITY-P2-03G`:** execute the read-only P2-03F contract through an authorized Production OIDC audit surface or equivalent, recheck actual Source UUIDs/source URL collisions and all references, resolve the official-name effective interval, then build **reviewed** Stage 2 Source/Designation assertions under exact-before guards. A republic-UUID merge/relink/retirement is **not** approved; any deletion/retirement requires explicit user authorization. No advance to Oman.
