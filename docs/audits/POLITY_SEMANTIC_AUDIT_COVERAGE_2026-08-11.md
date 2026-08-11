# ATLAS Polity Semantic Audit — Coverage Tracker

> Status: AUDIT ONLY — NO PRODUCTION DB MUTATION
>
> Frozen baseline: 2026-08-05 LIVE audit snapshot
>
> Baseline size: 291 canonical persons / 309 Activity rows

## 1. Why this file exists

The semantic audit must be provably exhaustive rather than a sequence of memorable examples.

This tracker distinguishes:

- rows individually researched/reviewed;
- rows covered only by a general semantic rule;
- rows not yet reviewed;
- rows added to Production after the frozen snapshot and therefore pending reconciliation.

No claim of `full audit complete` is allowed until every frozen Activity UUID appears in a machine-readable coverage set and the post-snapshot Production delta has also been audited.

## 2. Current exact coverage

As of Wave 7:

- frozen baseline Activity rows: **309**
- unique Activity UUIDs individually addressed in Waves 1–7: **71**
- individually reviewed share of frozen baseline: **71 / 309 = 22.98%**
- remaining frozen rows not yet individually closed: **238**
- current Production delta after 2026-08-05: **not reconciled yet**

The 71 reviewed rows are deliberately concentrated in high-risk semantic clusters rather than a random sample:

- government/regime/clan/event pseudo-polity candidates;
- tribal/ethnonym/confederacy candidates;
- composite monarchies and dynasty-state labels;
- rebel/transitional authorities;
- identity-continuity problems;
- colonial/dependent/constituent authorities;
- all nine rows/pairs previously categorized as `normal polity transitions` in the frozen audit.

Therefore the current percentage must not be interpreted as 23% of the historical research effort remaining. Most obvious sovereign-state/ruler rows should close much faster than the high-risk cases already reviewed.

## 3. Reviewed UUID inventory by Wave

### Wave 1 — high-risk pseudo-polity semantics (12)

- `84d64b9b-b52c-4c2f-ae44-cd65bc69f143`
- `2251143e-bfbc-4cd4-a24e-58c1d16fc748`
- `6b488bfa-e918-4be1-8127-57ffb2bc776e`
- `fc051734-cdbb-4cc0-b569-4795d23bfef2`
- `4777f7fe-cecd-4699-9e48-a327f58bc0a7`
- `b9940b97-626c-4ccd-b05f-79dbd842621b`
- `09a44ab8-bba6-4e82-9347-6905865b3371`
- `15bc86a6-8e2d-4463-bebd-33b3201c9fce`
- `5583bb6e-e6b1-4890-b20b-196735d004b4`
- `06b85a9c-741f-4454-96dc-d62be5abe88d`
- `2cd9ea93-d911-444b-abab-5d7d72310bdd`
- `9f91d916-55b5-416b-9e88-8c0fa67220f7`

### Wave 2 — tribal / people / confederacy semantics (12)

- `4d96f761-e799-41cc-ac21-fa47a76c02d6`
- `e70e23e2-d6cf-4622-9993-a25daee4f756`
- `52e1e74f-635d-4501-83f7-915bc7357ee0`
- `d80867ad-58f2-44e9-aa45-c51bb30efae1`
- `93e60ba9-c72e-4a66-bdda-90578eff2612`
- `5eb53851-1a31-4952-bf3e-a5e7dd864512`
- `46fe2a2e-1e8a-405d-8439-1d6ff88e59dc`
- `d7932969-bb26-4cc1-9e9c-8fda28cdc2ef`
- `3cc44fbb-2501-42b2-89ab-b4ac1f0631f3`
- `5b078df5-cc1e-4d88-83c1-458de84fd7e6`
- `1755f264-2ff6-47fe-a68a-53eb09827034`
- `6321ecbe-79ac-4e17-9485-a1c5cff83109`

### Wave 3 — composite monarchy / dynasty-state / continuity calibration (15 listed; some later overlap)

- `f14fb8c7-b291-4624-8792-9a4ddebd8e46`
- `56ec9e4a-33a0-4922-8619-70f7565c8bb6`
- `3373433e-d600-48b2-9639-79e08f4589f4`
- `c2bf3f5f-d7ff-408f-9778-19e94ab4d7a4`
- `af6cb560-64d9-4540-9f58-07ac2880a26c`
- `a1d81b84-d5d7-483c-83f2-e5447b0e40c9`
- `24a376d6-d559-4e96-8d99-d9a11f0136ef`
- `888a8e91-084b-4d83-af58-1114c95ae04b`
- `45f4c83e-edad-4be1-ab57-16979b0c89d3`
- `762cfe1a-ff0a-41ae-931a-525144b54dc0`
- `d44706a8-8239-42f9-b871-a9db6be26e95`
- `0b94ab53-47dc-4ecf-90f2-e9ee77cf8604`
- `2fd20ec6-0ff7-4ae7-a538-3dcd5b07dd6e`
- `32e33450-e22a-4a5e-b4d2-b64eaa0b62a6`
- `203f8649-582e-4bdf-8a30-ad5084fe3303`

### Wave 4 — rebel / transitional authority (13)

- `f2be8c04-9e04-4bb4-95ab-87b01664daf5`
- `1d3fac68-2875-4e70-afd5-6fae0546ac3e`
- `f2b030bd-0055-4819-99d6-fd0d1e29d808`
- `5e4d4e82-9ac6-47f6-a4a6-cbc51d3708f6`
- `70fc9703-8119-4315-a5c7-3868e9897eaa`
- `d004105a-b5c8-4829-8990-b128769d2c72`
- `6cdbc259-3d46-4257-a33e-98b2f21cf48c`
- `51e3e3dd-d54d-4c40-8349-0520c4b01d3f`
- `1b532f7a-38e9-4a61-9ef7-2fc1a9fc47fc`
- `f417c93a-8d9c-4d61-b4b3-66527d83de24`
- `ef09a0bc-0b29-4496-bf3c-986933fb0ef3`
- `832f0675-0a18-4afa-ad49-af71de75cdf6`
- `b4c0eacf-5dc5-4977-bd28-872af31942f1`

### Wave 5 — identity continuity (6; Peter rows overlap Wave 3)

- `8d5d7cbd-1622-44ae-9a08-6444efcbb7c7`
- `88a782ac-eec9-4bed-b240-a23779e34c42`
- `32e33450-e22a-4a5e-b4d2-b64eaa0b62a6`
- `203f8649-582e-4bdf-8a30-ad5084fe3303`
- `cdba7185-9bfd-451c-872b-561a4c083a3c`
- `98ed2c28-eae7-41b3-b63d-5fb86dbd5270`

### Wave 6 — colonial / dependent / constituent authority (6; Franklin rows also used in Wave 7)

- `52408ac3-67e9-4f02-93b8-226797c654f1`
- `31f92f81-58e1-459d-a9bb-83e35a1ccf8a`
- `bb21742e-02d1-4b11-ba6e-d44eccf9d02d`
- `ad5246d1-a4d6-40a3-99c8-df833c3153ed`
- `31ca4fef-8cd5-48ec-be24-a04585a8285b`
- `b3eacdac-623d-4667-bf99-633a57941260`

### Wave 7 — previous `normal transition` re-audit (18 listed, 12 already overlap prior waves)

- `355d0cee-ee25-40b3-af55-5c1a0d57235b`
- `45b456d1-80ed-4b0e-b3ef-ec838ff96626`
- `18ac966d-fe39-40cc-83ec-3b2ab125c6b6`
- `072a5290-dca8-4c37-8afb-dfb10932e763`
- `7d8a9076-5222-43cc-b77a-d2dcda3c8a6b`
- `6770ab36-d2c1-4364-9cab-67200f7f7e16`
- `31f92f81-58e1-459d-a9bb-83e35a1ccf8a`
- `bb21742e-02d1-4b11-ba6e-d44eccf9d02d`
- `243cbb98-4550-4e6a-a700-aeb5704831c7`
- `2fd20ec6-0ff7-4ae7-a538-3dcd5b07dd6e`
- `45ad2db1-7a58-431e-b23a-757ed85bb055`
- `5bc98161-7324-4636-bb28-1245de42f1d3`
- `32e33450-e22a-4a5e-b4d2-b64eaa0b62a6`
- `203f8649-582e-4bdf-8a30-ad5084fe3303`
- `cdba7185-9bfd-451c-872b-561a4c083a3c`
- `98ed2c28-eae7-41b3-b63d-5fb86dbd5270`
- `8d5d7cbd-1622-44ae-9a08-6444efcbb7c7`
- `88a782ac-eec9-4bed-b240-a23779e34c42`

## 4. What has been learned before auditing the remaining 238 rows

The high-risk waves have already falsified several unsafe bulk rules:

- `Shogunate => government only => replace with Japan` — unsafe without layered authority research.
- `Dynasty => not a Polity` — false for Sui/Ming/Qing/Yuan state labels.
- `Ethnonym => not a Polity` — false for Senones/Eburones/Iceni/Catuvellauni and confederated authorities.
- `Rebellion origin => not a Polity` — false for Shun, Taiping and other territorial rival states.
- `Not sovereign => not a Polity` — false for useful colonial/constituent map-level authorities.
- `end year A == start year B => normal succession` — false for Prussia/German Empire, RSFSR/USSR, Russia 1721, Roman/Byzantine 395 and likely Yuan/Northern Yuan.

This means the remaining rows can now be audited more efficiently using historically calibrated semantics rather than repeatedly reinventing the ontology.

## 5. Remaining audit plan

### Pass A — obvious low-risk state-polity rows

Examples: rulers clearly attached to recognized kingdoms/empires/republics where no identity-continuity problem is visible.

Action:

- verify Polity entity class;
- mark `KEEP` without full biography re-research;
- assign provisional Person–Polity relation from role only when unambiguous, otherwise defer relation classification.

### Pass B — non-ruler relation audit

Examples: generals, ministers, philosophers, diplomats, scientists, religious figures, rebels.

Action:

- keep valid Polity identity;
- separately determine `serves / active_in / opposes / claims_rule / other`;
- do not reinterpret a valid political context as personal territorial rule.

### Pass C — place-like and city-polity names

Examples: Athens, Sparta, Copan, Naranjo, Tetouan, Zazzau, Jhansi, Jiaozhou and similar labels.

Action:

- determine whether the name denotes a city-state/kingdom/domain/political jurisdiction or merely a geographic place/administrative area in that specific period.

### Pass D — remaining continuity/succession clusters

Examples: dynastic conquest, state partitions, unions, federalization, colonial independence, successor governments.

Action:

- assign identity-continuity category before any UUID-level merge or split.

## 6. Hard completion criteria

The frozen audit is complete only when:

- every one of the 309 frozen Activity UUIDs has a coverage entry;
- every non-KEEP decision has source-backed reasoning;
- all identity-continuity cases have a continuity category;
- all unresolved cases are explicitly `RESEARCH/DEFER`, not silently guessed;
- a fresh Production snapshot is diffed and every post-2026-08-05 Activity is audited;
- no Production correction has been applied before this reconciliation.

Until then PR #101 must remain draft and audit-only.
