# P7 Tokugawa Ieyasu — Japan / Tokugawa Governance Decision

> Status: REVIEWED BRANCH-ONLY DECISION / NO PRODUCTION MUTATION  
> Baseline: Baseline A v2 (`ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79`)

## Exact Baseline A Activities

Three current rows describe the same historical career using `Tokugawa Shogunate` as a Polity:

1. `7c315e1c-90c3-5199-a292-8f68ba69d4b2` — 1603–1605 — `Shogun and military commander` — `reign`
2. `400c78d5-a7e1-5ddb-83ef-91e0193db0f8` — 1605–1616 — `Retired shogun and de facto ruler` — `de_facto_rule`
3. `79dc9310-cd56-5bed-9a35-fe5361bdf0b6` — 1603–1616 — `Shogun and retired de facto ruler` — `de_facto_rule`

All three use Person UUID `308373b7-1bb5-5e02-9e95-a832a875c8a2` and current Tokugawa Shogunate Polity UUID `46534f7e-9247-5644-b5ad-9525c3d4f5d6`.

The durable audit already decided that rows 1 and 2 are the reviewed formal / retired-de-facto survivors, while row 3 is a compressed overlapping alternative that must be retired.

Authority:
- `docs/audits/POLITY_SEMANTIC_AUDIT_WAVE13_LIVE_RECONCILIATION_2026-08-11.md`
- `docs/audits/POLITY_SEMANTIC_AUDIT_BASELINE_A_EXPLICIT_CARRY_FORWARD_2026-08-12.md`
- `docs/stage2/contracts/GOVERNANCE_CONTEXT_CURRENT_V1.md`

## Reviewed model

The Person Activities attach to the higher-order Japan Polity:

`Tokugawa Ieyasu -> Japan -> governs`

The Tokugawa bakufu is represented as a reusable Governance Context:

`Japan + reviewed interval -> Governance Context: Tokugawa bakufu`

This preserves the distinction between the enduring political realm and the government through which national-level warrior rule was exercised. It does not create a separate country polygon for the bakufu and does not give Ieyasu Person-owned Territory or Geometry.

## Historical evidence

### National Archives of Japan

The National Archives of Japan chronology for Tokugawa Ieyasu records his appointment as shogun in 1603, resignation from the shogunal office in favor of Hidetada in 1605, continued ōgosho-era governmental acts afterward, and his death in 1616.

Reviewed URL:

`https://www.archives.go.jp/exhibition/digital/ieyasu/history.html`

This supports retaining distinct 1603–1605 formal-shogun and 1605–1616 retired/de-facto governance phases rather than preserving one compressed office row.

### Cambridge History of Japan

John Whitney Hall, “The bakuhan system,” *The Cambridge History of Japan*, Cambridge University Press, describes the political structure established by the Tokugawa house in the early seventeenth century as the bakuhan system and treats the Edo bakufu/shogunate as the national-level government within that structure.

Reviewed URL:

`https://www.cambridge.org/core/books/abs/cambridge-history-of-japan/bakuhan-system/D926536D7B00DEFD6413A77CA028711B`

This supports modeling `Tokugawa bakufu` as Governance Context rather than as a replacement country identity.

## Temporal safety

The Governance assertion in this package is limited to **1603–1616**, because that is the minimum interval needed to cover the two reviewed Ieyasu survivor Activities.

It does **not** assert that 1603–1616 is the complete lifespan of the Tokugawa bakufu. No month or day is invented.

The Person Activities retain their reviewed year-level boundaries:
- formal shogunal phase: 1603–1605
- retired/de-facto governance phase: 1605–1616

## Provenance and compressed-row retirement

The compressed 1603–1616 row has its own normalized repository provenance:
`pending-records-corrections.json:30`.

Its statement explicitly spans both the formal-shogun and retired/de-facto phases. Therefore its Source is relevant to both reviewed survivor Activities.

To make the two-step correction restart-safe:

1. the survivor-relink manifest first preserves each survivor's own Source and also prebinds the compressed row's exact Source to **both** survivors;
2. the compressed-row retirement manifest then uses Correction v2's reviewed Source-transfer contract to copy that same Source to both survivors before deletion;
3. because the same normalized Source+locator is already present, the transfer deduplicates without changing the final survivor state;
4. consequently the first manifest can still exact-replay even after the second manifest has completed.

This sequencing avoids silent provenance loss and avoids making an earlier immutable correction ledger unverifiable after the later retirement.

## Execution decision

### Manifest A — survivor relink + governance assertion

- preserve both survivor Activity UUIDs;
- relink each from Tokugawa Shogunate to Japan UUID `e029b047-544a-52c7-8897-4e494ac72af4`;
- set relation to `governs` UUID `67a57b37-1853-5f2a-b7ab-e6b2d32b56b6`;
- preserve each original normalized Source;
- prebind the compressed-row Source to both survivors;
- add the reviewed National Archives Source to both survivors;
- author literal `Tokugawa bakufu` Governance Context;
- assert minimum reviewed Japan/Tokugawa-bakufu coverage for 1603–1616 with repository, National Archives, and Cambridge provenance.

### Manifest B — compressed overlap retirement

- require Manifest A state first;
- retire only Activity `79dc9310-cd56-5bed-9a35-fe5361bdf0b6`;
- use both reviewed survivors as replacement survivors;
- copy all retired normalized Source semantics to both survivors with deduplication;
- leave the old Tokugawa Shogunate Polity identity physically intact for later controlled cleanup.

No Production mutation, Person merge, Territory mutation, or Geometry mutation is authorized.
