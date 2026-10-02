# ATLAS CORE Authority Ownership Map

**Status:** Canonical through CORE-REENTRY-08  
**As of:** 2026-10-01  
**Machine authority:** `docs/core/CORE_AUTHORITY_OWNERSHIP.v1.json`  
**Architecture authority:** `docs/core/CORE_V2_MASTER_PLAN.md`

## Rule

One canonical fact has one semantic authority and one mutation primitive. Orchestrators may call it but may not reimplement it. Runtime/compiled data is derived and rebuildable. Historical manifests and migrations may remain as immutable audit evidence without becoming a second editable truth source.

Unit 16 closes residue cleanup: this registry has no active multi-writer debt, ownership gap, duplicate truth registry, transitional owner, shadow writer, or stale remediation flag.

## Current ownership map

| Resource | Canonical fact | Declared owner | State |
|---|---|---|---|
| `person_identity_creation` | Canonical Person identity and initial preferred names | `server/atlas-identity-service.js#createPerson` | **single_writer** |
| `polity_identity_creation` | Canonical Polity identity and initial preferred names | `server/atlas-identity-service.js#createPolity` | **single_writer** |
| `role_identity_creation` | Canonical Role vocabulary identity and preferred names | `server/atlas-identity-service.js#createRole` | **single_writer** |
| `activity_authoring` | Canonical Person–Polity Activity assertion and normalized Activity source links | `server/atlas-stage2-native-activity-service.js#createStage2NativeActivityTx` | **single_writer** |
| `activity_correction_lifecycle` | Reviewed exact-before Activity rewrite/split/retire lifecycle distinct from normal Activity authoring | `server/atlas-correction-manifest-v2-service.js#createCorrectionManifestV2Service` | **single_writer** |
| `source_identity` | Reusable bibliographic Source identity | `server/atlas-source-service.js#createSource / insertExactSource / rewriteSourceCitation` | **single_writer** |
| `place_identity` | First-class historical Place identity, preferred names, Source provenance, and supported Person life-fact relations | `server/atlas-authoring-object-service.js + server/atlas-place-relation-service.js#createPlace / resolvePersonPlaceFacts` | **single_writer** |
| `person_external_reference` | Current reviewed Person external-reference disposition, including NamuWiki | `server/atlas-external-reference-service.js#setNamuWikiDecision` | **single_writer** |
| `person_representative_domain` | Person representative_domain controlled value | `server/atlas-person-domain-service.js#setRepresentativeDomain` | **single_writer** |
| `polity_relation_assertion` | Structural/temporal Polity relation assertion and provenance | `server/atlas-correction-manifest-v2-service.js#insertPolityRelationBundle` | **single_writer** |
| `polity_temporal_semantics` | Polity governance periods, temporal designations, and diachronic identity relations | `server/atlas-correction-v2-stage2-assertions.js#insertStage2AssertionBundle` | **single_writer** |
| `context_objects` | Government/Regime, PeopleGroup, HistoricalEvent identities and Person links | `server/atlas-context-object-service.js#createContextObject / linkPersonContext / linkPolityGovernanceContext` | **single_writer** |
| `polity_place_function` | Historical Polity→Place function with full temporal interval, confidence, first-class Place UUID and Source UUID+locator provenance | `server/atlas-polity-place-function-service.js#createPolityPlaceFunction` | **single_writer** |
| `spatial_reviewed_facts` | Reviewed display dispositions plus the derived UUID Place-function projection; not historical Place/Source identity authority | `scripts/compile-spatial-bindings.mjs#compileSpatialBindings` | **repository_source_authority** |
| `spatial_registration_disposition_lifecycle` | Durable new-Polity registration-completion disposition; lifecycle proof only, not display placement or PolityPlaceFunction authority | `server/atlas-spatial-registration-disposition-service.js#materializeSpatialRegistrationDisposition` | **single_writer** |
| `runtime_projection` | Derived Runtime Activity projection and explicit compile exclusions/activation | `server/atlas-runtime-compile-service.js#compileRuntimeProjection` | **derived_single_writer** |
| `non_timeline_person_registry` | Canonical reviewed Person timeline disposition, including chronology-unresolved/legendary/mythical/other reviewed exclusions | `server/atlas-person-timeline-service.js#setTimelineDisposition` | **single_writer** |
| `reviewed_candidate_state` | Candidate review revision and APPROVED/HOLD/REJECTED decision | `server/atlas-reviewed-candidate-service.js#recordReviewRevision` | **single_writer** |
| `registration_execution_state` | Registration state bound to one immutable human-approved candidate review revision and resulting canonical Person/apply result | `server/atlas-reviewed-candidate-service.js + server/atlas-human-authoring-service.js#queueApprovedRevision / setRegistrationState + authoring manifest ledger` | **single_writer** |
| `person_destructive_lifecycle` | Person merge and hard-delete dependency-safe lifecycle | `server/atlas-destructive-lifecycle-service.js + existing Person lifecycle executors#discoverIdentityReferences / snapshotIdentityDependencies / verifyIdentityAbsent` | **single_writer** |
| `polity_retirement` | Durable Polity retirement tombstone/redirect after zero-external-reference proof | `server/atlas-correction-polity-retire-v2-service.js#createCorrectionPolityRetireV2Service` | **single_writer** |
| `p14_territory_geometry_boundary` | Canonical DB-backed P14 Authoring authority separating Polity-owned historical TerritoryRecord semantics from reusable evidence-backed Geometry | `server/atlas-p14-territory-geometry-service.js#createGeometry / createTerritoryRecord` | **single_writer** |

## Unit 16 closure notes

- `non_timeline_person_registry` now points to `atlas_v2.person_timeline_dispositions`; the legacy JSON registry and active UI/validator dependency are retired.
- `person_external_reference` is written by `atlas-external-reference-service.js#setNamuWikiDecision`; the old authoring-ledger projection trigger is dropped.
- Historical Role case/scope correction executors are retired; reviewed request JSON remains audit evidence only.
- Normal Activity authoring, exact-before reviewed Activity correction, and destructive Person lifecycle are distinct lifecycle authorities.
- `polity_place_function` is now DB-backed canonical historical fact authority. It requires a first-class Place UUID and Source UUID+locator provenance and rejects display-only fields such as region/subregion/place label.
- `spatial/projections/polity-place-functions.v1.json` is a UUID projection of canonical DB facts. `atlas-polity-spatial-index.json` is a **derived output** for spacetime display; neither owns Place or Source identity.
- `spatial_registration_disposition_lifecycle` is deliberately narrower: it proves that a reviewed new-Polity spatial decision was durably written/read back before registration completion and does not become a second display or historical spatial-fact authority.
