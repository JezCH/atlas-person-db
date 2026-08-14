# P7 Toyotomi Hideyoshi authority / governance decision — 2026-08-14

Status: **REVIEWED BRANCH-ONLY EXECUTION DECISION — NO PRODUCTION MUTATION**

Baseline: `ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79` / `sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27`.

## Reviewed authority already present in the repository

This execution decision does not introduce a new historical theory. It binds the conclusions already reviewed in:

- `research/japan/stage2-sengoku-authority-decisions.v1.json`;
- `docs/research/japan/STAGE2_SENGOKU_AUTHORITY_RESEARCH_2026-08-12.md`;
- `docs/audits/POLITY_SEMANTIC_AUDIT_BASELINE_A_EXPLICIT_CARRY_FORWARD_2026-08-12.md`;
- `docs/stage2/contracts/GOVERNANCE_CONTEXT_CURRENT_V1.md`.

Those authorities already establish that:

1. `Toyotomi Regime` is a Governance Context, not a separate country-level Polity merely because the regime has a name;
2. the current 1582–1598 `Japan` Activity is too coarse;
3. before nationwide consolidation in 1590, Hideyoshi had a source-backed territorial political authority of his own and should not be represented as already governing all Japan;
4. from the 1590 consolidation threshold, higher-order `Japan` is the appropriate Person Activity Polity with relation `governs`;
5. the transition is established at **year 1590**, but the reviewed repository does **not** establish a month/day that may be fabricated.

## Missing identity binding closed here

The earlier P5 17-Polity literal allocation did not contain the pre-1590 Hideyoshi territorial political authority because these two Hideyoshi rows remained P7/P8 blockers rather than P6's 54-target correction frontier.

The source-backed political actor is therefore authored through the existing generic P7 literal-UUID Polity authoring path as:

- identity class: `HIDEYOSHI_PRE1590_TERRITORIAL_POLITICAL_AUTHORITY`;
- UUID: `0a36b422-122a-5957-8ae8-99ad2aa5cc2b`;
- catalog label: `Hideyoshi territorial authority`;
- `semantic_name_kind = editorial_catalog_label`.

The label is deliberately an editorial catalog label. It is **not** asserted to be a historical official name, self-designation, dynasty name, or reconstructed Japanese state title. Territory/Geometry remains deferred.

## Activity correction

The current Japan Activity `7bd5741a-6b37-5b33-9512-40741e01b179` is split into two reviewed phases:

- pre-consolidation: new Activity `6293857f-8e4d-5224-8434-900467b9dc74` → Hideyoshi territorial authority → `rules`;
- post-consolidation: original Activity UUID `7bd5741a-6b37-5b33-9512-40741e01b179` → Japan → `governs`.

The original UUID stays with the post-1590 Japan phase because that is the surviving semantic continuation of the original Japan target. The Stage-2-native pre-1590 fragment has `legacy_source_key = NULL`.

### 1590 boundary policy

The repository review supports a 1590 threshold but explicitly leaves the sub-year boundary unresolved. Therefore both touching boundaries are encoded as:

`year = 1590 / granularity = year / certainty = uncertain / month = NULL / day = NULL`.

This deliberately permits the two phase records to touch/overlap at the resolution of the known year rather than pretending the transition occurred on 1 January 1590 or 31 December 1589. The uncertainty is Authoring truth, not a defect to hide.

## Governance Context

`Toyotomi Regime` is authored as a reusable `governing_regime` Governance Context:

- UUID `679fcf78-44cd-5148-8271-78e5456083a2`;
- reviewed year-level governance period on Japan: 1582–1598;
- it owns no Territory geometry.

## Retirement and provenance

The old `Toyotomi Regime`-as-Polity Activity `61bf1687-9815-5844-9f98-02a558470b51` is retired only after the two corrected Activity phases exist.

Its existing normalized Source link is pre-bound to both split survivors before retirement. The retirement operation then transfers the same Source with normalized-link deduplication. This guarantees:

- no silent provenance loss;
- exact replay of the split/governance manifest even after the invalid regime-as-Polity Activity is retired;
- no deletion of the old Polity object in this correction package. Legacy object cleanup remains a later lifecycle concern.

## Safety

- no Production/Vercel contact;
- no Person merge;
- no Territory/Geometry mutation;
- no runtime name resolution;
- no invented sub-year chronology;
- no historical name claim for the editorial pre-1590 Polity label.
