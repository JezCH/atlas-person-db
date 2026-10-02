# POST-CORE Legacy Registration Obligation Debt Audit — 2026-10-02

## Status

- Audit mode: **READ → AUDIT → CLASSIFY → REPORT**
- Production mutations: **0**
- Captured at: `2026-10-02T15:02:33.830Z`
- Latest main: `50fda2d0ab9640fb2f91199f337f6469f2470a8e`
- Production deployed SHA: `908b10261b6288d3c38716cebc2cdd35f9f95b53`
- Registration-contract path delta between deployed Production SHA and latest main: **none**
- Pipeline verdict: **NEW_REGISTRATION_PIPELINE_CURRENTLY_CLEAN**
- Important limitation: there is no real post-#1774 live Person registration cohort yet, so the pipeline verdict is based on the current executable contract plus fresh-PostgreSQL operational rehearsal, not a post-cutover live cohort.

The main/Production SHA split at capture is caused by the concurrent project-state reconciliation delta. The changed paths are `ATLAS_REQUIREMENTS.md`, `docs/ATLAS_CURRENT_WORKSTREAMS.md`, `docs/core/CORE_V2_FINAL_ACCEPTANCE.md`, `requirements/atlas-requirements.v1.json`, `scripts/verify-atlas-requirements.mjs`; none is a registration-contract path used by this audit.

## A. Overall finding

The currently executable registration path is not proven to create new obligation debt. The exact defects found are legacy/pre-integration data debt or review backlog. Historical registration ceremony metadata is not treated as a debt unless current canonical correctness requires it.

## B. Exact Production counts

### Persons

- Total: **2089**
- Missing canonical EN name: **0**
- Missing preferred KO name: **0**
- Exact normalized EN duplicate-name groups: **0**
- Exact normalized KO duplicate-name groups: **0**
- Retired-reference residuals: **NOT_MEASURED**
- Legacy static-registry duplicate check: **NOT_MEASURED**

### Representative domain

- Valid non-null: **1963**
- NULL total: **126**
- Exact reviewed non-null decision not materialized: **13**
- Reviewed NULL: **NOT_MEASURED**
- Unreviewed NULL: **NOT_MEASURED**
- Remaining NULL whose review-state cannot be distinguished by current public canonical surface: **113**
- Invalid domain value: **0**

The current public domain source exposes only value/NULL, not a durable reviewed-null discriminator. Therefore the remaining NULL split is intentionally not guessed.

### NamuWiki / external reference

- Linked: **1306**
- Reviewed not_found with reason: **635**
- Reviewed not_found, reason missing: **86**
- No decision: **62**
- Invalid state: **0**
- Malformed linked canonical URL/title shape: **0**
- Possible stale remote link: **NOT_MEASURED** (this audit did not search or re-validate live NamuWiki documents)

Exact UUID sets are in the companion JSON. These two backlog lanes are intentionally separate.

### Timeline

- timeline: **1936**
- non-timeline valid (legendary + mythical + other reviewed exclusion): **84**
- chronology_unresolved valid: **57**
- missing disposition: **12**
- contradictory state detected by Person/Activity presence: **0**
- invalid disposition value: **0**

### Activities

- Total: **2453**
- Machine-structural complete under current semantic contract: **2453**
- Zero-source Activity: **0**
- Semantic-key v2 exact duplicate groups: **0**
- Temporal-boundary structural debt: **0**
- Relation debt: **0**
- Role missing: **0**
- Period-basis missing: **0**
- Confidence missing: **0**
- Ongoing Activity: **0**
- Historical correctness that cannot be inferred mechanically from numbers: **NOT_MEASURED / REVIEW_REQUIRED**

Legacy descriptive `chronology_status` strings are not counted as debt because the current semantic identity contract does not use chronology_status as an identity dimension and no current contract requires all historical rows to be rewritten to one token.

### Source / provenance

- Zero-source Activity: **0**
- Full canonical Source UUID/locator/dangling/free-text/duplicate-source inventory: **NOT_MEASURED**

The public Person surface exposes `source_count`, but not the full Source/link/locator graph needed for an exact deeper inventory. No count is inferred.

### Polity and new-Polity spatial obligation

- Polities total: **1180**
- Linked polities: **1158**
- Orphan polities: **22**
- Missing EN / KO / canonical key: **0 / 0 / 0**
- Spatial registration disposition complete / reviewed_hold / missing: **NOT_MEASURED / NOT_MEASURED / NOT_MEASURED**

The canonical `atlas_v2.spatial_registration_dispositions` lifecycle table is not exposed through the public read surface. Display spatial projection is not used as a proxy.

### Runtime parity

- Authoring Activities: **2453**
- Runtime included: **2453**
- Intentional exclusions: **0**
- Suspicious mismatch: **0**
- Authoring delta since active compile: **0**
- Publication current: **true**

## C. Exact proven debt

### C1. Representative-domain materialization — 13

| Person | UUID | Expected domain | Evidence |
|---|---|---|---|
| 사마의 | `c3128a85-ddde-4d28-9219-5715f8611b20` | `governance` | PR #1767 reviewed companion assignment |
| 스틸리코 | `dbac46ae-d3dc-4068-840f-46fedbdbd901` | `military` | PR #1767 reviewed companion assignment |
| 바르단 마미코니안 | `45bdc34d-3a99-4034-b03d-c546c96608f9` | `military` | PR #1767 reviewed companion assignment |
| 샤샹카 | `f371e82b-33eb-4927-8b45-1c553ea81d4c` | `governance` | PR #1767 reviewed companion assignment |
| 타이라노 키요모리 | `b774cec1-f3b0-46a9-8cd1-3414e74780a4` | `governance` | PR #1767 reviewed companion assignment |
| 타빈슈웨티 | `f0c7abaa-7670-49d0-a82e-7b63fd1a62c3` | `governance` | PR #1767 reviewed companion assignment |
| 나관중 | `490b5966-63ec-4bdb-83e4-5d4fb1f25769` | `culture` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |
| 삼손 | `9ce6a904-0164-4651-aa5b-50ab9a569909` | `military` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |
| 상가마그라마의 마다바 | `6ad5c0e4-2547-4e3a-86b0-c3b9eaa16b63` | `knowledge` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |
| 야즈냐발키야 | `249a4aea-a45d-4249-b0c7-74574ba72b0f` | `knowledge` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |
| 오승은 | `b9dd3e9b-3db4-4df1-9b08-3c6da9787c6e` | `culture` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |
| 카비르 | `c00c48a7-ecec-458c-93ad-765a8abaea07` | `culture` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |
| 티루발루바르 | `7407feff-345f-4573-8320-62de8d58d428` | `culture` | canonical timeline review_evidence.legacy_record.request_context.representative_domain |

The six MICROBATCH-07 rows are already represented by open PR #1767 and must not be duplicated by a new writer. The other seven are non-timeline Persons whose reviewed non-null domain decision remains embedded in canonical timeline review evidence from PR #1551 but was never materialized in the Person domain field.

### C2. Missing timeline disposition — 12

| Person | UUID | Historicity | Activities |
|---|---|---:|---:|
| 사마의 | `c3128a85-ddde-4d28-9219-5715f8611b20` | historical | 1 |
| 스틸리코 | `dbac46ae-d3dc-4068-840f-46fedbdbd901` | historical | 1 |
| 바르단 마미코니안 | `45bdc34d-3a99-4034-b03d-c546c96608f9` | historical | 1 |
| 오도아케르 | `a7566fc2-ae57-480e-b2d2-43557a49b7b9` | historical | 1 |
| 샤샹카 | `f371e82b-33eb-4927-8b45-1c553ea81d4c` | historical | 1 |
| 무사 이븐 누사이르 | `581d5a01-d18c-4519-94dd-7c5b2b7a1deb` | historical | 1 |
| 누르 앗 딘 | `1925f6f3-4c81-4293-954a-bddf447d841a` | historical | 1 |
| 타이라노 키요모리 | `b774cec1-f3b0-46a9-8cd1-3414e74780a4` | historical | 1 |
| 쿠트브 웃 딘 아이바크 | `363adcde-3b46-40f5-ad83-65733c7d745d` | historical | 1 |
| 오타카르 2세 | `a1b314bf-7b18-4489-aae3-e1fa7b94bab6` | historical | 1 |
| 라덴 위자야 | `0d6177bb-e99e-43a0-9587-67eee5257706` | historical | 1 |
| 타빈슈웨티 | `f0c7abaa-7670-49d0-a82e-7b63fd1a62c3` | historical | 1 |

All 12 are Activity-bearing historical Persons. They are the two recent pre-#1774 microbatches. No chronology/date correction is implied; the missing obligation is the canonical Person timeline disposition itself.

### C3. NamuWiki obligation

- Absence-reason debt: **86**
- No-decision review backlog: **62**

Exact UUID inventories and machine-actionable rows are stored in the companion JSON.

### C4. Activity / Runtime

No machine-confirmed Activity structural debt and no Runtime publication mismatch were found in the current Production snapshot.

## D. Classification

- **LEGACY_DATA_DEBT:** 111 exact obligation items
- **CURRENT_PIPELINE_DEFECT:** 0 proven
- **REVIEW_BACKLOG:** 62 exact obligation items
- **VALID_UNKNOWN_OR_HOLD:** 141 Person timeline dispositions are valid unresolved/non-timeline states, not repair targets
- **STALE_HISTORY_ONLY:** old resolved registration/domain history is excluded from the repair backlog when current canonical state is already correct

Total exact backlog rows: **173** across **164 unique Persons**. This is an obligation-item count, not a count of unique defective Persons.

## E. Repair plan

1. **R1 — 7 non-timeline reviewed-domain materializations.** LOW. Canonical Person Domain writer only. Excludes the six #1767-owned rows.
2. **R2 — 12 missing timeline dispositions.** LOW. Canonical Person Timeline writer only; no identity or date changes.
3. **R3 — 86 NamuWiki absence-reason debts.** HISTORICAL_REVIEW_REQUIRED. Re-review the reason before write; never infer it from `not_found`.
4. **R4 — 62 NamuWiki no-decision rows.** HISTORICAL_REVIEW_REQUIRED. Compact exhaustive review first.
5. **R5 — read-only measurement of spatial-registration lifecycle and full Source-link graph.** Count is NOT_MEASURED, so no Polity/source repair may be planned from guessed numbers.

## F. Next exact work unit

**R1 only:** materialize the seven PR #1551 non-timeline reviewed `representative_domain` decisions through the canonical Person Domain writer, after a fresh no-conflict read. Do not touch the six #1767 rows while that concurrent work remains owned elsewhere.

This audit does **not** execute R1.
