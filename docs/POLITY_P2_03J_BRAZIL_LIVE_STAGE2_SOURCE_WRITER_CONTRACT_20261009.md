# POLITY-P2-03J — Brazil temporal official-name / full bibliographic Source writer verification

**Unit state:** **CLOSED — confirmed actual Production schema and corrected Stage 2 rich Source writer**. Parent `brazil-regime-family` remains **REVIEW_REQUIRED**. No Brazilian Source/Designation assertion, no direct canonical DB mutation or Person-Activity move, no Polity UUID consolidation, retirement or deletion.

## 1. Actual Production evidence — not rehearsal-only DDL

The [authenticated exact-SHA OIDC Production read-only audit #37948838233](https://github.com/JezCH/atlas-person-db/actions/runs/37948838233) **SUCCEEDED**, job `113882049448`, audit evidence at **2026-10-09 15:04 UTC / 2026-10-10 00:04 KST**. Vercel Production deployment `dpl_AP2TCnUZLbm9EP74QoqKH1PcS25M` for exactly merge SHA `827e3dbc25731e592e61735ef036f75c889a9a17` was **READY**. Request is authenticated to GitHub Actions with OIDC and uses the existing PostgreSQL transaction `REPEATABLE READ READ ONLY` with `committed=false`.

Production **`pg_constraint`** and **`pg_get_functiondef`** returned:
- `polity_designations_type_check`: allowed `official_name`, `state_form`, `historiographic_period`, `conventional_temporal_label`. For Brazil's legally attested names the reviewed **type proposal** is `official_name` (not an approved Source-backed assertion).
- Actual `atlas_v2.temporal_boundary_detail_valid`: granularity `year|month|day`, certainty `exact|approximate|uncertain`, calendar `gregorian|julian|unspecified_historical|source_calendar`; day boundaries require month AND day, month boundaries month only, year boundaries neither; months 1–12 and days 1–31.
- Actual `atlas_v2.temporal_boundary_or_unresolved_valid`: all six boundary members null is allowed as explicitly unresolved; partial null boundary fails; date year range **−10000..9999 excluding year zero**.
- Actual `information_schema.columns` for `atlas_v2.sources`: all **16** canonical bibliographic columns present, **0 missing** (ID, key, type, title, hash/bytes, URL, citation text, creator, institution, publisher, publication date/year, external identifier, citation metadata, artifact metadata).

This is an **actual Production catalog and validator definition inspection**, not a claim that the particular Brazil 1968 Designation has already been registered or that historical end/start dates have been legally approved.

## 2. Corrected exact Source writer — full provenance supported

[PR #2315](https://github.com/JezCH/atlas-person-db/pull/2315) squash merged at `827e3dbc25731e592e61735ef036f75c889a9a17`, [Integrity CI #37948661662](https://github.com/JezCH/atlas-person-db/actions/runs/37948661662) **SUCCESS**. Source registration code is changed narrowly:

1. `server/atlas-correction-v2-stage2-assertions.js` now reuses the **same 16-field `SOURCE_FIELDS`** and `normalizeBibliographicSource` as `server/atlas-source-service.js`. This removes the previously identified P2-03I silent loss of `author_creator`, `institution`, `publisher`, `publication_date`, `publication_year`, `external_identifier`, `citation_metadata`, and `artifact_metadata`.
2. `loadSourceBundle` reads back all 16 fields (including `publication_date::text`) so Stage2 **exact-after verification checks actual persisted bibliographic provenance** as well as eight original fields.
3. Previous eight-field `assert_source` inputs still normalize to the same row with optional new fields `null`. Existing rule demanding a specific UUID + exact-before ID absence and nonempty `source_key/source_type/title/https URL/citation`, with **no fabricated `sha256` or `bytes`**, remains in place.
4. Dedicated `tests/polity-p2-03j-brazil-live-stage2-source-contract.test.mjs` covers full-field source preservation, legacy compatibility, malformed dates and forbidden fake hashes, exact DB readback and drift, and read-only production constraint discovery. Initial CI exposed duplicated `id` in field-list composition; fix committed and rerun of full suite **succeeded**.

**Production fact:** The Source writer change deployed, but it was NOT executed to insert a Brazilian Source and no Brazil correction request was dispatched in P2-03J.

## 3. Reviewed but NON-EXECUTING Brazil legal and temporal blueprint

Machine-readable artifact: `docs/audits/P2_03J_BRAZIL_STAGE2_SOURCE_SCHEMA_READINESS_20261009.json`. It records actual Production enumerations and one **fully populated bibliographic candidate** for [Law No. 5.389 of 1968](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html), with the legislature, Chamber's original text, official gazette publication **1968-02-23** ([Senate law catalog](https://legis.senado.gov.br/norma/547253)), original legal locators, publisher and formal citation. Source UUID / source key remain null pending valid exact-before collision review; no materialized SHA/hash is invented.

**Schema-valid, NOT historically approved dual-name candidate** on the stable Republic `Brazil` polity UUID `a8b27d54-b180-4d51-a664-dd40b3eed08f`:
- `official_name`, `day/exact/gregorian`, `Estados Unidos do Brasil`: provisional `1889-11-15..1968-02-22`;
- `official_name`, `day/exact/gregorian`, `República Federativa do Brasil`: provisional from `1968-02-23`, no end known.

**Historical caution:** Law 5.389 Arts. 1, 3, 4 changes State Arms/Seal inscriptions and expressly refers to the official country-name change; effective DOU publication is 1968-02-23. A Chamber [official Fifth Republic history](https://www2.camara.leg.br/a-camara/conheca/historia/a5republica.html) also names Consultoria Geral da República Opinion H-733 dated 1968-09-14, but full opinion text remains **NOT independently retrieved** despite official-source lookups. The proposition that *every possible authoritative proper-name usage changed exclusively at 1968-02-23* therefore remains **not proven**, regardless of the DB's willingness to accept the exact-day tuple. The Law No. 5.389 symbol provisions were later revoked by Law No. 5.700, not evidence of state-name reversion.

Previous exact Production Person Activity census still stands: **Empire 2 unchanged, early Republic name preview 5 (4 already on Brazil, 1 Afonso Pena under separate early-Republic UUID), later Republic name preview 3**. A name assertion on Brazil alone does NOT alter Afonso Pena's polity owner.

## 4. Exact next bounded unit and approval gates

The companion JSON is `REVIEW_ONLY`, `operations=[]`, `auto_apply_allowed=false`, every Source/Designation/name UUID null and `legal_exclusivity_verified=false`. It is **not** a correction manifest and carries **no implicit authorization to execute anything**.

**Next `POLITY-P2-03K`:** resolve legal title-start exclusivity or explicitly choose day-level attestation rather than exclusive valid-name bounds; review exact Source-key/URL semantically duplicative provenance, mint genuinely reviewed UUID(s) only with exact-before Production preflight, and scope first *non-destructive* scholarly Source assertion with full metadata and truthful citation. A later separately reviewed source-backed Designation may follow. Any proposed Republic-UUID unification/relink or retirement/deletion remains independent, with retirement/deletion requiring explicit user approval. **No automatic Oman advance**.

**Parent registry:** 51/75 terminal, 24 pending; `brazil-regime-family=REVIEW_REQUIRED`.
