# POLITY-P2-06B — Sweden historiographic-era designation, blocked apply gate

**2026-10-10 KST | status: REVIEW_REQUIRED / production apply NOT authorized / no canonical mutation**

## 1. Work actually done

P2-06A proved through real public production Polity read that canonical Sweden `93613017-b4c4-5f82-8e96-3ce6b2d3a61e` has **15** registered Activities, four royal 1611–1718 Activities have no resolved EN/KO temporal name, and distinct Sweden–Norway `a47f57af-8ac2-4724-81b0-43074c64f84c` has **3**. No independently named Swedish Empire identity is present in the 1,158 public Polity census. *Null public label is not proof of absent internal designation records.*

P2-06B repaired the missing allowlisted audit-workflow OIDC trust entry with [merged PR #2415](https://github.com/JezCH/atlas-person-db/pull/2415), **exact GitHub SHA, production main ref, protected environment and expected repository checks all retained**, and tests for forbidden old P11 and unknown workflow callers. CI all required checks success. Protected Sweden [read-only run #38038578263](https://github.com/JezCH/atlas-person-db/actions/runs/38038578263) was triggered by that merge.

**Deployment blocker:** An explicit attempt to deploy exact reviewed commit `ec85804ee932361b1dd30f5e48f0e862fcbb2e9b` to the linked Vercel team/project returned **HTTP 402 `api-deployments-free-per-day`**: over 100 free daily deployment API quota; error indicated user/plan quota needs reset or authorized billing action. The last observed public `runtime-identity` remained a different existing `main` SHA `698a3c5c753a980c809fc556a38b1b685a0a5df3`. The OIDC exact-SHA audit cannot safely accept a different deployment. Do not disable SHA checking, revert another lane, or copy secrets as a workaround.

The exact internal `atlas_v2.polity_designations` rows and Source link bundles **remain unverified**. **No Sweden Production writer or Runtime Compile is claimed.** This is not a terminal disposition.

## 2. Verified permissible historical-era semantics

Two separate scholarly periodization conventions exist:
- [Lex, Jürgen Beyer, *Stormagtstiden* (2025)](https://lex.dk/Stormagtstiden): Swedish Great-Power Era `1611–1718`, accession of Gustav II Adolf through death of Charles XII. Describes traditional **historical period**, not the sovereign style Emperor of Sweden.
- [Harald Gustafsson, Lund University/Scandia (2026)](https://portal.research.lu.se/en/publications/stormakten-genom-tiderna-en-historiografisk-skiss/): `Stormaktstiden` and the classification of Sweden as a `stormakt` are retrospectively applied historiographic terms, increasingly popularized in the late nineteenth century, **not contemporary constitutional title deeds**.
- [University of Vienna, Tobias E. Hämmerle (2020)](https://utheses.univie.ac.at/detail/57229): `1611–1721` is also used for the Great-Power Era, with 1721 marking war/territorial outcomes. This is not evidence that a *formal state-form title* existed through that final year.

The [earlier Production `pg_constraint` schema audit](POLITY_P2_03J_BRAZIL_LIVE_STAGE2_SOURCE_WRITER_CONTRACT_20261009.md) verified designation types `official_name`, `state_form`, `historiographic_period`, `conventional_temporal_label` in the real DB. **Proposed Sweden designation type: `historiographic_period`, NOT `state_form`**. Review-only default year-granularity interval `1611–1718`, with EN conventional name `Swedish Empire` and KO `스웨덴 제국`, explicitly annotated as `Stormaktstiden / 스웨덴 강대국 시대`. This is a **draft for a specific sourced periodization**, not a claim all historians choose identical year bounds or an approved Production assertion.

## 3. Runtime interpretation and non-destruction contract

[Active temporal resolver](../server/atlas-polity-temporal-designation-read.js) shows a designation only when **exactly one** recorded designation fully contains an Activity's entire time interval. Overlapping or ambiguous containing periods return the stable Polity name. Thus previous public 4×null may mean missing rows, no covering interval, or ambiguity. Exact authenticated read is mandatory before determining whether to create or repair any record.

Proposed 1611–1718 year-granularity would cover the four **existing unchanged** monarch Activities:
1. Gustav II Adolf `e889c50c-3a9b-4b30-90ab-0822ad5dffd6`, 1611–1632;
2. Christina `daf85f20-db1f-50c2-aff1-86830290da8e`, 1632–1654;
3. Charles XI `931c792b-5039-4637-b418-4d04264b7b54`, 1660–1697;
4. Charles XII `b5a7fcfe-47ee-4332-9110-443c0d0a40be`, 1697–1718.

Outside-window Sweden Activities, 15 existing total, and the distinct 3-Activity Sweden–Norway union must not be altered; do not create a new political identity or swap ruler roles. In particular, historical titles remain **King/Queen** rather than Emperor.

## 4. Exactly next safe Production execution when deployment limit allows

1. Resolve actual deployed `main` SHA and trigger the existing protected `atlas-polity-sweden-p2-06-audit.yml` on that **same SHA**. Validate `ok/read_only/committed=false` and retain artifact of 2 Swedish identities, all pre-existing designation/name/source bundles, Activities and Runtime; additionally confirm current DB type constraint and source catalog collision for bibliography.
2. Classify null display root cause. If existing designation rows are source-complete, repair rather than duplicate; if missing, add only the minimum source-linked `historiographic_period` designation with exact-before absent-ID and source-key/url collision preflight. Handle 1718 versus 1721 as an explicit scholarly source choice, not invented day boundaries. Re-check preferred names and competing interval coverage.
3. Use reviewed Stage 2 Canonical Correction v2 exact-before dry-run + commit; preserve UUIDs and source locators; Runtime Compile with publication current. Validate all four within-window Public Polity and Person activities show the intended historic label, and representative outside-window Sweden/union controls do not.
4. Only then mark `sweden-temporal-designation` `FIXED` and adjust register from 75 / 59 / 16 to 75 / 60 / 15. **Until then the real register remains 75 / 59 / 16**.

Reviewed machine-readable **NON-EXECUTABLE** decision artifact: [P2_06B_SWEDEN_REVIEW_ONLY_TEMPORAL_DESIGNATION_20261010.json](audits/P2_06B_SWEDEN_REVIEW_ONLY_TEMPORAL_DESIGNATION_20261010.json). Intentionally no new UUIDs, no executable operations, no claim of absent existing designations. The entire #1895 full-Production-census and Japan/Place/France/other residual acceptance gates are unchanged.
