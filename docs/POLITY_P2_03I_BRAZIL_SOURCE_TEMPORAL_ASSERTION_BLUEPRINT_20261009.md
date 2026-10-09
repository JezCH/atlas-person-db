# POLITY-P2-03I — Brazil Source and temporal designation exact-before assertion BLUEPRINT (review only)

**Status:** bounded proposal-and-contract unit **COMPLETE**; **NO executable Stage 2 correction manifest**, no Production Source or Designation asserted, no Activity transfer, Polity merge, retirement, deletion, Runtime compile or direct DB mutation. `brazil-regime-family` remains `REVIEW_REQUIRED`.

## 1. Current state and authoritative evidence boundary

Last read-only Production identity audit: [P2-03G Actions #37918278937](https://github.com/JezCH/atlas-person-db/actions/runs/37918278937), precise 10/10 Person Activity IDs, original Polity UUID assignments and start/end years intact. Authoring and Runtime FK **counts** Empire 2/2, early Republic 1/1, Brazil 7/7; 17 normalized Activity Source associations, zero Source catalog matches for seven literal official URLs, zero scoped retirements; **full Runtime content parity not established**.

Last authenticated Source metadata alias query: [P2-03H Actions #37920065332](https://github.com/JezCH/atlas-person-db/actions/runs/37920065332), `total_metadata_matches=0`, `complete=true`, `truncated=false`. **This is NOT evidence that no semantically identical primary reference exists under a generic dataset title or URL alias**. No new Production read/write was initiated by P2-03I.

**Primary documentary control:** [Brazilian Chamber Law No. 5.389 of 1968-02-22](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html) explicitly replaces `Estados Unidos do Brasil` / `República dos Estados Unidos do Brasil` on the coat of arms and national seal with `República Federativa do Brasil`, and refers to `mudança da denominação oficial do Brasil` (Arts 1(2–3), 3). Law effective on DOU publication **1968-02-23** (Art. 4; [Brazilian Senate catalog confirms dated publication](https://legis.senado.gov.br/norma/547253)). This strongly supports 1968-02-23 **as proposed boundary**, but law regulating symbols does **not conclusively prove** every official use switched exclusively that same day. Chamber historical note additionally references **Consultoria Geral da República Opinion H-733, 1968-09-14**; its full primary text was not retrieved/verified. Separately, 1967 Constitution effective 1967-03-15 and the 1969 amendment effective 1969-10-30 are NOT substitute name-change dates.

## 2. Concrete, source-citable register proposals — none yet registered

Machine-readable, explicit `safe_to_apply=false` blueprint: `docs/audits/P2_03I_BRAZIL_SOURCE_TEMPORAL_ASSERTION_BLUEPRINT_20261009.json`.

The bibliography candidates contain **eight primary historical source publications**, copied only with documented locators/URLs:

1. [Decree No. 1, 1889-11-15](https://www2.camara.leg.br/legin/fed/decret/1824-1899/decreto-1-15-novembro-1889-532625-publicacaooriginal-14906-pe.html), Arts 1–2 (Republic proclaimed; old federal title).
2. [1891 Constitution](https://www.planalto.gov.br/ccivil_03/constituicao/constituicao91.htm), heading + Art 1 (old federal designation).
3. [1934 Constitution](https://www.presidencia.gov.br/ccivil_03/constituicao/constituicao34.htm), Art 1 (old).
4. [1946 Constitution](https://legis.senado.gov.br/norma/579492/publicacao/15675026), constitutional heading (old).
5. [1967 Constitution](https://www2.camara.leg.br/legin/fed/consti/1960-1969/constituicao-1967-24-janeiro-1967-365194-publicacaooriginal-1-pl.html), Art 1 and Art 189 (federal form, effect 1967; not exclusive exact name date).
6. [Law No. 5.389 of 1968](https://www2.camara.leg.br/legin/fed/lei/1960-1969/lei-5389-22-fevereiro-1968-359075-publicacaooriginal-1-pl.html), Arts 1(2–3), 3, 4 (new name symbols/official name language; effective DOU date), including [Senate independent text](https://legis.senado.gov.br/norma/547253/publicacao/15715169).
7. [1969 Constitutional Amendment No. 1](https://www2.camara.leg.br/legin/fed/emecon/1960-1969/emendaconstitucional-1-17-outubro-1969-364989-publicacaooriginal-1-pl.html), title and effect (new).
8. [1988 Constitution](https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm), title and Art 1 (new).

Each candidate has an exact URL, human bibliography/title, source locator, positive attestation and known negative inference; `id=null`, `source_key=null` pending approved selection, `sha256=null`, `bytes=null`. These are **not** `assert_source` operations. No hidden generated UUID or invented PDF checksum.

## 3. Temporal display preview only, and all ten actual Activity guards

**Proposed Republic title pair on the existing Brazil candidate polity UUID `a8b27d54-b180-4d51-a664-dd40b3eed08f`** (not an approved sovereign-identity merger):

| Provisional period | Official PT title | Date interval (provisional) | Currently assigned Activities in each |
|---|---|---|---|
| early Republic title | `Estados Unidos do Brasil` | **1889-11-15 through 1968-02-22** | Brazil UUID: Vargas **3**, Goulart **1**; separate early-Republic UUID: Afonso Pena **1** (not currently affected by the proposed designation) |
| later Republic title | `República Federativa do Brasil` | **from 1968-02-23**, open end | Brazil UUID: Médici **1**, Itamar Franco **2** |
| empire remains distinct | `Empire of Brazil` | no change | Pedro I **1**, Pedro II **1** |

That produces a **classification preview 2 imperial / 5 old-Republic / 3 new-Republic = 10**, **NOT** the number of Activities whose current Production UI will change. The sole Afonso Pena Activity is on `United States of Brazil` UUID `750bf6be-49e9-4215-95ff-a356ba1831cd`; asserting temporal Designations against `Brazil` alone cannot change its polity owner or current historical title. The 1889 date itself is a Republic identity break, not proof that Empire and Republic are identical.

**Existing Runtime label contract:** `server/atlas-polity-temporal-designation-read.js` returns temporal display only if **exactly one** designation interval contains the **entire** Activity period. Its year-only start/end conventions are Jan 1 and Dec 31. All exact ten reviewed Activities lie on one side of the proposed February 1968 boundary; none straddles 1968. Nevertheless, every re-used or newly introduced Activity must be checked individually for precision before a writer proposal. `valid_to` and `valid_from` candidates are day-precision dates, not approved schema values, and real `designation_type` / certainty / calendar enum values remain pending.

## 4. Implemented Stage 2 contract review — new discovery

Verified production code `server/atlas-correction-v2-stage2-assertions.js`:

- `assert_source` requires valid new Source UUID, its matching `exact_before.source_absent_id`, nonempty `source_key/source_type/title`, valid HTTPS `canonical_url`, citation text, `sha256=null` and `bytes=null`.
- `assert_polity_designation` requires a valid Designation UUID and `exact_before.designation_absent_id`, reviewed `polity_id`, temporal fields, nonempty locale-specific `names` with valid name UUIDs, and **at least one actual Source UUID + locator**. Without any of these it fails closed.
- Source key collision checks run for `assert_source`, but lack of collisions by a **previous day’s metadata search alone** cannot authorize a new Source.
- **Important current-contract gap:** the Stage 2 Source assertion normalizer has only an **eight-field `SOURCE_FIELDS` whitelist** (`id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text`). The shared `server/atlas-source-service.js` bibliographic normalizer supports additionally **author_creator, institution, publisher, publication_date, publication_year, external_identifier, citation_metadata and artifact_metadata**, but the current assert_source operation does not pass those rich fields through. For an exact scholarly provenance registration with those fields populated, select a governed writer extension or a separately verified bibliographic enrichment path before claiming publication metadata persisted. This discrepancy is **disclosed, not silently fixed**, because it changes the canonical write contract beyond the bounded P2-03I review.

## 5. Writer readiness verdict and next exact unit

**P2-03I delivers a concrete, machine-readable eight-source bibliography + 1968 dual interval + exact 10-Activity temporal preview and fail-closed regression tests.** It does NOT produce executable correction operations; JSON `operations=[]`. All Source, designation and name UUIDs are unassigned, `designation_type=null`; no real Source link exists for new assertions; no direct Production write or Runtime compile.

**Parent case:** `brazil-regime-family=REVIEW_REQUIRED`, **51 terminal/75 total, 24 pending**.

**NEXT: `POLITY-P2-03J`** resolve valid live `designation_type` / temporal enum contract and appropriate rich Source bibliographic writer, verify exact-before Source key/URL at commit time; review H-733 primary text or explicitly document why boundary remains provisional; stage a separate, fully valid reviewable first non-destructive Source/Designation assertion if sufficiently supported. Any pending Republic UUID consolidation, Afonso Pena re-link, or retirement/deletion remains out of scope and needs a distinct reviewed authorization (retirement/deletion explicitly user-approved).
