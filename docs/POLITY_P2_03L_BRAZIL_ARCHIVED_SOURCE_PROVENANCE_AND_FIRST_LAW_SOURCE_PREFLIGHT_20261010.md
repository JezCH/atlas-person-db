# POLITY-P2-03L — Brazil 1968 Law 5.389: archived generic Source provenance and first Source UUID exact-before preflight

**Unit outcome: CLOSED, NONEXECUTING SOURCE REVIEW.** The existing political identity family `brazil-regime-family` remains `REVIEW_REQUIRED`. No Brazil Source is registered yet. No official-name period, Polity UUID consolidation, Person Activity move, retirement, deletion or Runtime compile has been executed.

## 1. Resolution of the 20 generic `repository_dataset` source-file mystery

**Production starting evidence:** [P2-03K OIDC read-only run #37950565052](https://github.com/JezCH/atlas-person-db/actions/runs/37950565052) identified **20** current `atlas_v2.sources` rows of type `repository_dataset`. They carry repository-derived source keys, filenames and UUIDs, not legal-document `canonical_url` values. The six official Brazilian Law No. 5.389 URLs, proposed Source key, expanded title/citation/JSON aliases had **zero** registered Source matches in 3,322 rows.

**New finding:** The entire set of **20 matching historical basenames** survives in the **Git tree immediately preceding the 2026-08-11 legacy-repository cleanup**:
- Original snapshot: [commit `1196e397deb506696386bae1cd88800c16c9cddf`](https://github.com/JezCH/atlas-person-db/tree/1196e397deb506696386bae1cd88800c16c9cddf).
- Cleanup that removed the old root assets: [commit `cdf93d65a898f49bfe0f12285408e03dde02f81d`](https://github.com/JezCH/atlas-person-db/commit/cdf93d65a898f49bfe0f12285408e03dde02f81d).
- Archived file families: **13 `pending-records*.json`** files (historical authoring/Person/Polity activity records) and **7 `person-locales*.js`** files (Korean locale mappings), totaling 20 historical Git blobs. Their complete filenames, actual historical Git **blob SHA-1**, archived byte size, current Production Source UUID/key and deep links are recorded in the [review JSON](audits/P2_03L_BRAZIL_ARCHIVED_GENERIC_SOURCES_AND_LAW_SOURCE_CANDIDATE_20261010.json).
- All 20 **historical file contents were opened and scanned** for `5389`, `5.389`, `H-733`, `República Federativa do Brasil`, `Estados Unidos do Brasil`, `Diário Oficial da União` and direct English equivalents. **No exact legal-citation or title matches** appeared in these archived texts. Incidental Brazil phrases were for **Pedro II / Empire of Brazil** in `pending-records-supplement-2.json`, **Portugal, Brazil and Algarves** in `pending-records-corrections.json`, and related Korean locale aliases. `Catherine de' Medici` is a coincidental name hit, not an indication of Brazilian law.
- **Strict qualification:** Matching 20 file *names* and viewing historical Git blobs **does not cryptographically establish that the exact historical bytes equal the hash embedded in each current Production `repository-source:<basename>:<sha256>` key**. No contents were restored into `main`. It is therefore sound to say the 20 original file names and historical file representations were recovered and scanned; **not** sound to say every current DB source's content digest was independently verified against the archive, nor that all external copies are exhaustively searched.

**Substantive determination:** These 20 repository/import/locale records are **not substitutes for a separately citable, official primary law**. This archival inspection materially reduces the duplicate-citation ambiguity that P2-03K left open; any remaining unindexed or post-snapshot semantic duplicates are explicitly unexcluded.

## 2. Draft Source record is now complete, unique UUID tested against current Production snapshot

An **offline UUIDv5** was prepared from existing repository namespace `672fd6c6-f921-5ce9-86dc-c90a8796c53a` with name `p7:source:brazil-law-5389-1968-official`: `e7ad7bd0-e77c-526b-b7d9-832bcca75dab`. This UUID is an **identity candidate**, **not a newly registered Production Source**.

The proposed bibliography has complete, non-fabricated 16-field Stage 2 schema compatible content:
- `source_key=brazil-law-5389-1968-official`, `source_type=web_bibliographic_reference`, `title=Lei nº 5.389, de 22 de fevereiro de 1968`.
- [Official Câmara dos Deputados original statute](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html) as `canonical_url` and [Senate catalogue](https://legis.senado.gov.br/norma/547253) as independent corroboration.
- Congresso Nacional/Presidência da República as issuing authorities, Câmara dos Deputados official hosting institution, `Diário Oficial da União` publication `1968-02-23` (Seção 1, p. 1673), `Lei nº 5.389/1968` legal identifier, exactly located Arts. **1º(2–3), 3º, 4º**, and explicit qualifier that the law alone is **not** conclusive evidence for universal first-exclusive use of the new country title.
- `sha256=null`, `bytes=null`: original file was **not** materialized or checksum-attested into current Source storage.

**New actual Production read-only preflight:** [PR #2330](https://github.com/JezCH/atlas-person-db/pull/2330), full Integrity CI [#37992722108](https://github.com/JezCH/atlas-person-db/actions/runs/37992722108) **SUCCESS**, squash merge SHA `317912b8f8d4eb5345a7b0b600d2e82a4ed12194`; Vercel Production deployment `dpl_HnKArJJHwSBCT6eqtvhT15BthhM3` **READY**. Its OIDC-authenticated **REPEATABLE READ READ ONLY** [audit #37992870364](https://github.com/JezCH/atlas-person-db/actions/runs/37992870364), job `114031282755` **SUCCESS**:
- Candidate `e7ad7bd0-e77c-526b-b7d9-832bcca75dab` **absent** from Production `sources.id` as observed at snapshot (`candidate_id_collision_rows=[]`).
- Candidate Source key + six official URLs **0** exact matches, law title/number/external ID/JSON metadata aliases **0** matches.
- Generic repository dataset count still **20**; total Source count **3,322**; full read-only Action evidence artifact `11645692098`.
- This is an **observation of current read-only state**, not a guarantee of exact-before at the later time an authorized Source insertion transaction might run.

**CI operational blocker resolved:** Two full-test attempts on PR #2330 were blocked during container preparation by unauthenticated Docker Hub pull rate limiting. Switched only `atlas-integrity.yml` service image URL from Docker Hub `postgres:17` to the **Docker Official Image mirror** `public.ecr.aws/docker/library/postgres:17`, preserving PostgreSQL major version and all test commands. Re-run CI succeeded. This is not a database migration or an application schema change.

## 3. Release gate and subsequent single bounded task

**The normalizer accepts the complete proposed source with ID and `exact_before.source_absent_id` in an in-memory test**, but no live Stage 2 operation was submitted: `operations=[]` in review JSON; `source_registration_authorized=false` and `source_writer_invoked=false`.

The next governed Source-only write, if separately authorized, must:
1. Verify candidate ID absence, source-key and all URL alias collisions **at the same writer transaction time**, and abort rather than adopting any unrelated existing Source UUID on race/conflict.
2. Insert **only the primary law bibliography** through canonical Stage 2 `assert_source`, with all 16 bibliographic fields and exact-after read-back; release approval/dry-run is a separate gate.
3. Audit one registered Source UUID and complete metadata afterward; **do not infer** a temporal `official_name` interval from national symbols law effective 1968-02-23 or build a `polity_designations` row prematurely.
4. Keep all **10 Brazil-family activities**, distinct `Empire of Brazil`, and current `United States of Brazil` and `Brazil` UUIDs unchanged; no retirement or deletion absent user approval.

**P2-03L CLOSED.** Parent case still `REVIEW_REQUIRED`, registry **51/75 terminal / 24 pending**. **NEXT bounded unit `POLITY-P2-03M`** — transaction-time exact-before first non-destructive primary-law Source assertion and post-commit verification, *only* under authorized Stage 2 release governance. H-733 primary opinion remains unavailable; official name-exclusive transition boundary remains unresolved.
