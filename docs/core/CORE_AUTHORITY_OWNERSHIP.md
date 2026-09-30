# ATLAS CORE v2 — Authority Ownership Contract

> Status: **Unit 1 current-main ownership map**  
> Snapshot basis: current `main` at `42fd1ba7d4db89ebebb6c6b749c0dc3666e6e096`  
> Machine registry: `docs/core/CORE_AUTHORITY_OWNERSHIP.v1.json`  
> Architecture authority: `docs/core/CORE_V2_MASTER_PLAN.md`

## Rule

A **writer** here means the semantic mutation primitive that owns validation, identity/collision semantics and the database/repository mutation for one canonical fact. API handlers, GitHub workflows, admin UI, AI, registration coordinators and correction manifests are **orchestrators** unless they implement their own direct mutation semantics.

This distinction is required by C-01/C-02/C-10:

- one fact → one authority;
- one canonical resource → one mutation primitive;
- transports may call the primitive but must not reimplement it;
- derived Runtime output is never historical authority;
- historical/review evidence may remain without becoming a second editable truth source.

A row marked `multi_writer_debt`, `ownership_gap`, or `duplicate_truth_registry` is therefore a **confirmed CORE cleanup target**, not an assertion that current data is invalid.

## Current ownership map

| Resource | Canonical fact | Declared owner | State | Confirmed bypass/shadow paths | Cleanup unit |
|---|---|---|---|---|---|
| `person_identity_creation` | Canonical Person identity and initial preferred names | `server/atlas-identity-service.js#createPerson` | **single_writer** | — | — |
| `polity_identity_creation` | Canonical Polity identity and initial preferred names | `server/atlas-identity-service.js#createPolity` | **single_writer** | — | — |
| `role_identity_creation` | Canonical Role vocabulary identity and preferred names | `server/atlas-identity-service.js#createRole` | **multi_writer_debt** | `server/atlas-correction-role-merge-v2-service.js`<br>`server/atlas-correction-role-scope-v2-service.js` | UNIT 14 / UNIT 16 |
| `activity_authoring` | Canonical Person–Polity Activity assertion and normalized Activity source links | `server/atlas-stage2-native-activity-service.js#createStage2NativeActivityTx` | **multi_writer_debt** | `server/atlas-correction-manifest-v2-service.js`<br>`server/atlas-person-merge-service.js`<br>`server/atlas-person-delete-service.js` | UNIT 14 / UNIT 16 |
| `source_identity` | Reusable bibliographic Source identity | `server/atlas-authoring-object-service.js#createSource` | **multi_writer_debt** | `server/atlas-human-authoring-service.js`<br>`server/atlas-correction-v2-stage2-assertions.js`<br>`server/atlas-correction-source-citation-v2-service.js` | UNIT 9 |
| `place_identity` | First-class historical Place identity, preferred names, and Source provenance | `server/atlas-authoring-object-service.js#createPlace` | **single_writer** | — | UNIT 10 |
| `person_external_reference` | Current reviewed Person external-reference disposition, including NamuWiki | `server/atlas-person-profile-service.js#setExternalReference` | **multi_writer_debt** | `server/atlas-human-authoring-service.js`<br>`db/migrations/20260821_human_authoring_external_reference_sync.sql` | UNIT 8 |
| `person_representative_domain` | Person representative_domain controlled value | `server/atlas-person-domain-service.js#setRepresentativeDomain` | **single_writer** | — | UNIT 7 |
| `polity_relation_assertion` | Structural/temporal Polity relation assertion and provenance | `server/atlas-correction-manifest-v2-service.js#insertPolityRelationBundle` | **transitional_single_writer** | — | UNIT 3 / UNIT 12 |
| `polity_temporal_semantics` | Polity governance periods, temporal designations, and diachronic identity relations | `server/atlas-correction-v2-stage2-assertions.js#insertStage2AssertionBundle` | **transitional_single_writer** | — | UNIT 3 / UNIT 4 / UNIT 12 |
| `context_objects` | Government/Regime, PeopleGroup, HistoricalEvent identities and Person links | **NONE — gap** | **ownership_gap** | — | UNIT 12 |
| `spatial_reviewed_facts` | Reviewed polity/activity spatial disposition source facts | `scripts/compile-spatial-bindings.mjs#compileSpatialBindings` | **repository_source_authority** | — | UNIT 11 |
| `p14_territory_geometry_boundary` | Polity-owned historical TerritoryRecord semantics separated from reusable evidence-backed Geometry | `server/atlas-p14-territory-geometry-contract.js#assertTerritoryRecord / assertGeometry / assertTerritoryGeometryLink` | **repository_source_authority** | — | UNIT 15 |\n| `runtime_projection` | Derived Runtime Activity projection and explicit compile exclusions/activation | `server/atlas-runtime-compile-service.js#compileRuntimeProjection` | **derived_single_writer** | — | UNIT 2 |
| `non_timeline_person_registry` | Persons excluded from timeline because chronology is unresolved/legendary/mythical/other reviewed reason | `non-timeline-persons.json` | **duplicate_truth_registry** | — | UNIT 5 |
| `reviewed_candidate_state` | Candidate review revision and APPROVED/HOLD/REJECTED decision | **NONE — gap** | **ownership_gap** | — | UNIT 13 |
| `registration_execution_state` | Registration obligation/apply state tied to a reviewed candidate and canonical entity/revision | **NONE — gap** | **ownership_gap** | — | UNIT 6 / UNIT 7 / UNIT 13 |
| `person_destructive_lifecycle` | Person merge and hard-delete dependency-safe lifecycle | **NONE — gap** | **ownership_gap** | `server/atlas-person-merge-service.js`<br>`server/atlas-person-delete-service.js` | UNIT 14 |
| `polity_retirement` | Durable Polity retirement tombstone/redirect after zero-external-reference proof | `server/atlas-correction-polity-retire-v2-service.js#createCorrectionPolityRetireV2Service` | **transitional_single_writer** | — | UNIT 14 |

## Confirmed findings

### Already clean enough to preserve

The current creation primitives for **Person, Polity and Role** converge on `atlas-identity-service.js`. Normal Human Authoring and native manifest orchestration call those primitives instead of maintaining separate identity creation code.

For **Polity**, Unit 3 adds `atlas-polity-identity-resolver.js` in front of `createPolity`. Declared creation now resolves stable names/aliases, date-bounded temporal designations and current continuity relations before insertion. Unit 4 makes `atlas_v2.polity_identity_retirements` plus `atlas_v2.polity_identity_retirement_names` the durable retired-identity authority: tombstones block resurrection and an explicit survivor UUID redirects resolution without consulting historical correction ledgers.

`atlas-stage2-native-activity-service.js` is the intended canonical Activity writer used by normal authoring. `atlas-authoring-object-service.js` is the intended first-class Source/Place writer. `atlas-person-domain-service.js` is the dedicated representative-domain mutation engine. Runtime projection is generated only through `atlas-runtime-compile-service.js`.

These owners should be reused rather than replaced unless a later unit deliberately changes the architecture.

### Confirmed multi-writer debt

1. **Source** has four direct semantic mutation implementations: the general Source object writer, Human Authoring's own Source resolver/creator, Stage2 assertion Source insertion, and Source-citation correction.
2. **NamuWiki/current external-reference state** has the profile service, a second Human Authoring upsert, and a live authoring-ledger projection trigger writing the same current table.
3. **Activity** normal authoring uses the native Activity writer, while Correction v2 and destructive Person lifecycle code directly mutate the same Activity graph.
4. **Role lifecycle** creation is centralized, but role merge/scope correction services directly rewrite bindings and delete Role rows.

These are exact shadow-writer cleanup targets. Later units must route them through shared primitives or deliberately replace the primitive, then delete the bypass.

### Confirmed ownership gaps / duplicate truth

- PeopleGroup / HistoricalEvent / GovernanceContext authoring has canonical tables but no current general canonical writer: **Unit 12**.
- Candidate review and registration execution state are still split between GitHub operational checkpoints and authoring ledgers instead of one durable reviewed-revision/execution model: **Units 6–7 and 13**.
- Person destructive lifecycle is split between merge and hard-delete engines with no generalized lifecycle writer: **Unit 14**.
- `non-timeline-persons.json` remains an independently authoritative Person registry beside normalized Person identity: **Unit 5**.
- Spatial reviewed facts are deliberately repository-backed today; `atlas-polity-spatial-index.json` is derived output. **Unit 11** must connect this to the final PolityPlaceFunction historical/display boundary rather than treating the compiled index as historical truth.

## Cleanup target rule

A later CORE unit may change an owner only by doing all of the following in one complete architectural slice:

```text
add/reuse successor mutation primitive
→ cut every relevant orchestrator over
→ preserve exact data/provenance semantics
→ focused proof
→ remove the superseded direct writer
→ update this registry
```

Leaving both old and new executable mutation paths reachable is not completion.

## Unit 1 exit statement

The project now has one explicit current owner decision for every CORE resource inspected by Unit 1, and every exception is classified as a named multi-writer debt, ownership gap, transitional owner, repository-source authority, or duplicate truth registry with an exact downstream cleanup unit.

Unit 1 does **not** repair those later-unit debts. Its purpose is to make them impossible to confuse with valid parallel authorities.


## Unit 16 residue closure

Unit 16 removes executable one-shot residue while preserving reviewed request/migration JSON as audit evidence. `non_timeline_person_registry` now means the canonical `atlas_v2.person_timeline_dispositions` state; browser presentation reads it through the consolidated read API rather than a duplicate root JSON registry.

Historical Role merge/scope executors are retired. Normal Activity authoring remains owned by Stage2 native authoring; guarded exact-before Correction v2 maintenance is classified separately as `activity_correction_lifecycle`.

| Resource | Current owner | Status |
|---|---|---|
| `activity_authoring` | `server/atlas-stage2-native-activity-service.js#createStage2NativeActivityTx` | **single_writer** |
| `activity_correction_lifecycle` | `server/atlas-correction-manifest-v2-service.js#createCorrectionManifestV2Service` | **single_writer** |
| `role_identity_creation` | `server/atlas-identity-service.js#createRole` | **single_writer** |
| `person_external_reference` | `server/atlas-external-reference-service.js#setNamuWikiDecision` | **single_writer** |
| `non_timeline_person_registry` | `server/atlas-person-timeline-service.js#setTimelineDisposition` | **single_writer** |
