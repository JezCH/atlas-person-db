# POLITY-P2-03K — Brazil Law 5.389 (1968) legal-title and Production Source collision audit

**Bounded unit: CLOSED, read-only/citation review only.** No Source, temporal Designation, Person Activity or Polity canonical mutation. `brazil-regime-family` remains **REVIEW_REQUIRED**. Official legal-title *first exclusive usage date is not certified*.

## 1. Evidence checked: actual primary statute and amendment, not extrapolated law dates

- **[Law No. 5.389/1968 (Brazil Chamber original publication)](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html):** signed on **1968-02-22**; Art. 1º(2–3) directs replacement of `Estados Unidos do Brasil` / `República dos Estados Unidos do Brasil` on **the national coat of arms and seal** with `República Federativa do Brasil`.
- Art. **3º** describes adaptations **resulting from** `mudança da denominação oficial do Brasil`, not a separate clause explicitly setting the very first date of exclusive use of the official country name in every possible statute, record or instrument. Art. **4º** makes this particular **national symbols law** effective on its DOU publication, **1968-02-23**. [Senate law catalog](https://legis.senado.gov.br/norma/547253) confirms DOU **23/02/1968, p. 1673**, and that the law was later repealed by 1971 Law No. 5.700 **on national symbols**.
- **[Chamber original correction published 1968-03-05](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-retificacao-31071-pl.html):** corrects `Decreto nº 4, de 19 de novembro de 1899` to **1889** in **Art. 2º §2º**. It does **not** alter name-replacement clauses, the 1968-02-23 original publication, or the law's effective-date clause.
- **[Brazil Chamber Fifth Republic historical summary](https://www2.camara.leg.br/a-camara/conheca/historia/a5republica.html)** dates the country's official naming change to the **1968 historical period** and cites **Law 5.389 and Opinion H-733 (1968-09-14)**. The actual complete primary opinion H-733 was **not recovered** through targeted official-source searching; the summary does not establish an exact first-exclusive-use date. Separate Chamber chronology [entry](https://www2.camara.leg.br/a-camara/conheca/historia/Ex_presidentesCD_Republica/republica5.html) has **22.08.1968** for Law 5.389, inconsistent with official statute, the DOU and the Senate's date. Retain the conflict as documentary metadata but use original official legal promulgation/pub data.

**Legal review conclusion:** **1968-02-23 is proven for the operation of the national symbols statute, NOT proven as the instant the country first exclusively adopted the full formal national title**. Therefore previous P2-03I/J temporal-boundary pairs `1889-11-15..1968-02-22` and `1968-02-23..open` remain proposals only; **do not register them as exact/day/legal-exclusive `official_name` intervals without additional documentary basis**. The primary statute makes the new title legally visible in an official enactment no later than its entry into effect. It neither supports sovereign re-foundation in 1968 nor collapse of 1889 imperial/republican identity distinction.

## 2. Live Production read-only bibliography / Source audit

**Implementation PR:** [#2323](https://github.com/JezCH/atlas-person-db/pull/2323), squash merge `6770109a1e72c90ecc29d44cb275acb4b71a84cd`, [ATLAS Integrity #37950384449](https://github.com/JezCH/atlas-person-db/actions/runs/37950384449) **SUCCESS**. It extends existing SHA-verified GitHub Actions OIDC, `REPEATABLE READ READ ONLY` audit with six exact variants of official primary-law URLs, proposed `source_key`, metadata and JSON aliases, catalogue generic-dataset candidates. SQL is SELECT-only, positional parameters. Five test contracts (one inventory of six URLs; parameter/collision; zero-not-global-absence; truncation guards).

**Actual Production evidence:** [ATLAS Audit Inventory #37950565052](https://github.com/JezCH/atlas-person-db/actions/runs/37950565052), job `113887937535`, **SUCCESS** at 2026-10-09 15:17 UTC / **2026-10-10 00:17 KST**. Vercel Production exact `6770109a1e72c90ecc29d44cb275acb4b71a84cd` deployment `dpl_FvLvLeUCCUBNBg5phmhsikcprLRG` was **READY**. GitHub Action artifact `11625437555` (`atlas-audit-full_stage2_baseline-6770109a1e72c90ecc29d44cb275acb4b71a84cd`) includes original full read-only evidence.

| Production evidence | Result |
|---|---:|
| `atlas_v2.sources` all rows (grouped source types) | **3,322** |
| Distinct registered `source_type` groups | **224** |
| `source_key = brazil-law-5389-1968-official` or one of 6 exact official URLs | **0 matches** |
| `source_key,title,canonical_url,external_identifier,citation_text,creator,institution,publisher,citation_metadata::text,artifact_metadata::text` containing Law 5389 / 5.389 / H-733 alias terms | **0 matches** |
| Truncated exact key/URL or metadata searches | **NO** |
| Generic `repository_dataset` Sources | **20** (all 20 surfaced in sampled catalogue, sample not truncated) |
| Canonical database modifications | **NONE** |

The **20 generic Source IDs and dataset filenames** are recorded in the linked machine-readable audit JSON for exact follow-up, **not counted as government primary-law references**. A generic repository data dump *may* embed facts about the act even if its Source catalogue fields do not identify them; content inside those documents and every unindexed external bibliography were **not** exhaustively searched. Therefore this is **positive evidence of no discoverable direct Law 5.389 bibliography and no proposed key/URL collision at snapshot time**, **not** proof that all semantically equivalent references are absent everywhere.

Structured immutable checkpoint: `docs/audits/P2_03K_BRAZIL_1968_LAW_SOURCE_PREFLIGHT_20261010.json` contains all 20 UUIDs, six URL candidates, exact counts, action SHA, dataset samples, legal source distinction and explicit non-executable Source proposal.

## 3. Scoped future non-destructive Source candidate, not executed

Selected tentative canonical `source_key`: `brazil-law-5389-1968-official` (read-only scan: no current key match). Primary original publication URL is the Brazilian Chamber official text, with Senate DOI/DOU as independent bibliographic corroboration. Under P2-03J Stage 2 rich provenance preservation, future metadata would retain issuing legislature, Chamber original, publisher `Diário Oficial da União`, publication date/year, identifier, article-level citation. **No Source UUID has been minted**, `exact_before.source_absent_id` remains unset, `sha256=bytes=null`, `operations=[]`.

**Fail-closed conditions for any later writer:**
1. Revalidate Source ID absence and exact current `source_key` plus all canonical URL variants at transaction time through governed Stage 2 Source writer; never rely only on 2026-10-09 read-only snapshot for concurrency.
2. Review 20 generic `repository_dataset` provenance references for possible unindexed same-document material; classify them as datasets versus the legally distinct original statute rather than attaching an unrelated Source UUID to a Designation.
3. Independent human-source review of H-733 primary text (if accessible), or constrain assertions to what 1968 Law 5.389 **actually** attests: official symbol inscription and recognition of official denomination change, **not** first exclusive all-document name interval.
4. Any future temporal `official_name` assertion must have independently supported nonoverlapping bounds, exact recognized schema type and real registered Source UUID+locator; the Runtime reader requires a unique wholly containing interval per Activity.
5. Preserve ten original Activities: Empire 2, early/new Republic preview 5+3; Afonso Pena's 1906–1909 Activity stays on its actual early-Republic UUID. No Polity merging, Activity reassignment, deletion or retirement in this unit. Retirement/deletion still requires user's explicit approval.

**P2-03K CLOSED.** Parent historical family case **REVIEW_REQUIRED**, registry **51 of 75 terminal / 24 pending**.

**Next independent bounded unit: `POLITY-P2-03L` — inspect the 20 generic Source records' actual underlying provenance where available, then prepare/govern a primary Law 5.389 scholarly Source assertion with fully checked unique UUID and exact-before Source-key/URL preconditions.** This does not authorize a temporal name assertion or any retirement.
