# ATLAS Polity Semantic Master Ledger v1

> Status: AUDIT / DERIVED EVIDENCE — NO PRODUCTION DB MUTATION
>
> This document records the first successful machine-readable consolidation of all current Production Activity semantic-audit decisions. The full JSON ledger is generated deterministically from the current `v2-direct` read plus reviewed audit documents; the repository stores the generator and reviewed inputs rather than duplicating a ~396 KB derived JSON file.

## Validated baseline

- Production projection source: `v2-direct`
- Current Activity relationships: **346**
- Unique Activity UUIDs in generated ledger: **346**
- Uncovered current UUIDs: **0**
- Stage-1 coverage evidence run: `31490306377`
- Stage-1 coverage artifact id: `9100736121`
- Stage-1 coverage artifact digest: `sha256:ff921c1299af176c1d30cb7f5833b13896693af29e6cb7fc194e78ab888a0986`

## First successful master-ledger generation

- PR branch: `agent/stage2-r1-decision-ledger`
- Branch head: `1eee04662bec1729daddb15e3b104106af561358`
- ATLAS Integrity run: `31508755450`
- generated artifact id: `9108157461`
- artifact digest: `sha256:a2e4be2553e61ae1703adc436e1fc40b930dfbabcc861586dba9248c9fa6c619`
- generator: `scripts/build-polity-semantic-master-ledger.mjs`
- CI workflow: `.github/workflows/atlas-integrity.yml`
- generated files:
  - `polity-semantic-master-ledger.json`
  - `polity-semantic-master-ledger-summary.json`

The same run also passed the existing **203 tests**, runtime architecture verification, and clean PostgreSQL schema reconstruction before ledger generation.

## Execution-class counts

| Execution class | Rows | Meaning |
|---|---:|---|
| `NO_CHANGE_POLITY` | 83 | Current polity verdict is directly keepable with no current Stage-2 polity correction flagged. |
| `KEEP_POLITY_RELATION_LAYER_PENDING` | 130 | Polity itself is retained, but eventual Person–Polity relation semantics must distinguish rule/service/activity/etc. |
| `KEEP_POLITY_STAGE2_REVIEW` | 1 | Polity retained but additional Stage-2 semantic review remains. |
| `DEFER_RESEARCH` | 49 | Historical or semantic research remains before mutation. |
| `BLOCKED_POLITY_IDENTITY` | 28 | Continuity/name/state-form identity model must be resolved first. |
| `BLOCKED_LAYERED_AUTHORITY` | 23 | Parent/constituent/regional/layered authority model is required. |
| `BLOCKED_GOVERNANCE_CONTEXT` | 4 | Government/regime/state-form context must be separated from Polity. |
| `DEFER_MODEL_EXTENSION` | 4 | Current case falls outside the present Polity-only model. |
| `R0_KEEP_REPRESENTATIVE` | 6 | Proven exact duplicate group representative to retain. |
| `R0_COALESCE_DROP` | 6 | Proven exact duplicate relationship to source-preservingly coalesce away. |
| `R1_READY_AFTER_R0` | 3 | High-confidence correction that can execute once R0 is proven in Production and correction v1.1 exists. |
| `R1_BLOCKED_SCHEMA` | 4 | Historical correction is resolved but current schema cannot represent the answer without loss. |
| `STAGE2_CHRONOLOGY_CORRECTION` | 2 | Additional chronology correction is flagged outside the explicit R1-ready set. |
| `STAGE2_RELINK` | 1 | Direct relink-class correction remains. |
| `STAGE2_REVIEW` | 2 | Residual Stage-2 review classification. |

Total: **346**.

## Explicit R0 / R1 gates

### R0

- representative rows: **6**
- coalesce/drop rows: **6**
- Production apply remains blocked until the correction-engine `main` SHA is actually deployed by Vercel and exact-SHA OIDC can be satisfied.

### R1 ready after R0

Exactly **3** reviewed targets:

1. Benjamin Franklin — retire the invalid United States 1757–1790 back-projected alternative;
2. Otto von Bismarck — extend Kingdom of Prussia Minister-President relation from 1871 to 1890;
3. Muhammad — retire the invalid Medina 610–632 back-projected alternative while retaining Medinan Polity 622–632.

### R1 blocked on missing semantic capacity

Exactly **4** explicit targets:

1. Charles de Gaulle — requires governance/regime layer for the Fifth Republic;
2. Mahatma Gandhi — requires relation semantics across British Raj / independent India;
3. Aung San Suu Kyi — requires opposition vs State Counsellor relation/role decomposition;
4. Shigeru Yoshida — requires sub-year precision or an explicit year-granularity convention to represent the 1947–1948 premiership gap accurately.

## Dependency counts

These counts are derived from reviewed decisions and are planning signals, not automatic schema-migration authorization.

- `relation_type`: **154** rows
- `historical_research`: **126** rows
- `chronology_correction`: **48** rows
- `polity_identity_model`: **28** rows
- `polity_relation_model`: **26** rows
- `governance_context`: **7** rows
- `sub_year_precision`: **1** row

## Reproducibility and fail-closed contract

The master ledger generator must fail if:

- the live baseline is not exactly the reviewed 346-row baseline;
- a current Activity UUID appears twice;
- any current Activity UUID has no resolvable reviewed decision;
- R0 no longer resolves to exactly 6 keep / 6 drop rows;
- the explicit reviewed R1-ready target count is not exactly 3.

The generator uses current Activity UUIDs as the primary binding. Historical Wave decisions are inherited only through explicit current UUID rebinding/carry-forward evidence; there is no generic `KEEP` fallback for uncovered rows.

## Next use

After R0 Production proof, this ledger becomes the execution-planning input for bounded correction change sets. `execution_class` and `dependencies` tell the correction pipeline whether a row can proceed, requires a schema capability, requires a polity-continuity decision, or must stay deferred for research.
