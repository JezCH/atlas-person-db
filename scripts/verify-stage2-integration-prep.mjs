import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const rel = (p) => path.join(root, p);
function fail(message) { console.error(`Stage 2 integration prep verification failed: ${message}`); process.exit(1); }
function assert(condition, message) { if (!condition) fail(message); }
function readJson(p) { try { return JSON.parse(fs.readFileSync(rel(p), "utf8")); } catch (e) { fail(`cannot parse ${p}: ${e.message}`); } }

const integrationPath = "stage2/integration/stage2-baseline-independent-prep.v1.json";
const integration = readJson(integrationPath);
assert(integration.schema === "atlas-stage2-baseline-independent-integration-prep/v1", "unexpected integration manifest schema");
assert(integration.production_mutation === false, "Stage 2 integration prep cannot authorize Production mutation");
assert(integration.phase_status === "P3_BASELINE_A_INTEGRATION", "integration manifest must reflect post-Train-1 P3 state");
assert(integration.baseline_policy?.old_346_binding_authoritative === false, "old 346 binding revived");
assert(integration.baseline_policy?.baseline_a_required_for_uuid_rebind === true, "Baseline A rebinding must remain mandatory");
assert(integration.baseline_policy?.baseline_a_contract_version === "v2_full_identity_snapshot", "Baseline A v2 full identity snapshot must be required");
assert(integration.baseline_policy?.baseline_a_captured_and_validated === true, "completed Baseline A capture not recorded");
assert(integration.baseline_policy?.baseline_a_activity_count === 338, "measured Baseline A Activity count must be 338");
assert(integration.baseline_policy?.baseline_a_descriptor === "stage2/baselines/baseline-a-current.v2.json", "durable Baseline A descriptor drifted");
assert(integration.baseline_policy?.no_old_activity_uuid_write_targets === true, "old Activity UUID write targets must remain forbidden");
assert(integration.baseline_policy?.production_mutation_authorized === false, "P3 manifest cannot authorize Production mutation");
assert(integration.pre_vercel_completion?.engineering_contracts_complete === true, "engineering pre-Vercel closure not recorded");
assert(integration.pre_vercel_completion?.baseline_independent_historical_model_decisions_complete === true, "historical pre-Vercel closure not recorded");
assert(integration.pre_vercel_completion?.irreducible_uncertainty_explicit === true, "irreducible uncertainty must remain explicit");
assert(integration.pre_vercel_completion?.production_train_1_complete === true, "Production Train 1 completion not recorded");
assert(integration.pre_vercel_completion?.baseline_a_v2_captured === true, "Baseline A completion not recorded");
assert(integration.pre_vercel_completion?.next_required_live_dependency === "Production Train 2 after P3/P4 exact Baseline A rebinding", "next live dependency drifted");

const port = integration.port_now || [];
const portIds = port.map((x) => x.id);
assert(portIds.length >= 20 && new Set(portIds).size === portIds.length, "portable unit set incomplete or duplicated");
for (const entry of port) {
  assert(typeof entry.path === "string" && fs.existsSync(rel(entry.path)), `missing portable unit ${entry.id}: ${entry.path}`);
}
const completed = new Set(integration.completed_after_baseline_a || []);
for (const required of [
  "baseline_a_v2_validated_intake", "durable_baseline_a_capture", "fresh_master_ledger_generator",
  "fresh_stage2_work_queue_generator", "current_schema_cleanup_r0_r1"
]) assert(completed.has(required), `missing completed Baseline A unit: ${required}`);
const remaining = new Set(integration.remaining_after_baseline_a || []);
for (const required of [
  "surviving_activity_uuid_bindings", "reviewed_identity_bindings", "reviewed_polity_name_kind_mapping",
  "exact_polity_uuid_assertions", "historical_correction_v2_manifests", "relation_type_row_backfill",
  "people_event_backfill", "production_additive_schema_apply", "semantic_key_v2_activation",
  "p10_v2_duplicate_revalidation", "person_physical_merge"
]) assert(remaining.has(required), `missing post-Baseline-A dependency: ${required}`);
for (const id of completed) assert(!remaining.has(id), `completed and remaining units overlap: ${id}`);
for (const forbidden of ["baseline_a_v2_validated_intake", "fresh_master_ledger", "fresh_stage2_work_queues", "current_schema_cleanup_r0_r1"]) {
  assert(!remaining.has(forbidden), `completed Baseline A work leaked into remaining queue: ${forbidden}`);
}

const rawIntegration = fs.readFileSync(rel(integrationPath), "utf8");
assert(!/"authoritative_activity_count"\s*:\s*346/.test(rawIntegration), "old 346 Activity baseline cannot be authority");
assert(!/"baseline_a_activity_count"\s*:\s*346/.test(rawIntegration), "old 346 Activity count revived");
assert(fs.existsSync(rel("stage2/contracts/baseline-a-intake-current.v2.json")), "Baseline A v2 contract missing");
assert(!fs.existsSync(rel("stage2/contracts/baseline-a-intake-current.v1.json")), "superseded Baseline A v1 contract must be removed");
assert(fs.existsSync(rel("stage2/baselines/baseline-a-current.v2.json")), "durable Baseline A descriptor missing");
assert(fs.existsSync(rel("stage2/baselines/baseline-a-ad9a0ed0398b.json.gz")), "durable Baseline A capture missing");

const baseline = readJson("stage2/contracts/baseline-a-intake-current.v2.json");
assert(baseline.schema === "atlas-stage2-baseline-a-intake-contract/v2", "unexpected Baseline A contract schema");
assert(baseline.production_mutation === false, "Baseline A intake cannot authorize mutation");
assert(baseline.accepted_input?.marker === "ATLAS_CORRECTION_BASELINE_A_V2", "Baseline A marker drifted");
assert(baseline.accepted_input?.mode === "full_stage2_baseline", "Baseline A mode drifted");
assert(baseline.accepted_input?.unreferenced_persons_and_polities_must_be_preserved === true, "Baseline A must preserve unreferenced identity rows");
assert(Array.isArray(baseline.accepted_input?.full_catalogs_required) && baseline.accepted_input.full_catalogs_required.includes("sources"), "Baseline A full catalogs incomplete");
assert(baseline.identity_rules?.canonical_names_are_binding_authority === false && baseline.identity_rules?.canonical_keys_are_binding_authority === false, "names/keys cannot become UUID binding authority");
assert(baseline.identity_rules?.raw_legacy_name_type_auto_maps_to_historical_semantic_kind === false, "legacy name_type cannot auto-author historical semantics");
assert(baseline.durable_handoff?.exact_full_baseline_capture_must_be_preserved_in_repository_before_artifact_expiry === true, "durable Baseline A capture requirement missing");
assert(baseline.durable_handoff?.validated_intake_must_preserve_full_activity_rows === true, "full Activity preservation requirement missing");
assert(baseline.measured_current_baseline?.activity_count === 338, "measured Baseline A contract count drifted");
assert(baseline.measured_current_baseline?.baseline_digest === "sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27", "measured Baseline A digest drifted");

const boundary = readJson("stage2/contracts/entity-boundaries-current.v1.json");
assert(boundary.schema === "atlas-stage2-entity-boundary-contract/v1", "entity-boundary contract schema drift");
assert(boundary.production_migration_authorized === false, "entity-boundary contract cannot authorize Production");
assert(boundary.identity_principles?.people_group_is_polity === false && boundary.identity_principles?.historical_event_is_polity === false, "People/Event must remain separate from Polity");
assert(boundary.identity_principles?.editorial_catalog_label_is_historical_self_designation === false, "editorial catalog label cannot become historical designation");
assert(boundary.polity_naming_rules?.editorial_catalog_label_must_not_create_polity_designation_assertion === true, "editorial label must not create designation assertion");
assert(boundary.activity_semantic_key_rules?.people_group_uuid_in_activity_semantic_key === false && boundary.activity_semantic_key_rules?.historical_event_uuid_in_activity_semantic_key === false, "People/Event must stay outside Activity semantic key");

const structural = readJson("research/relations/stage2-structural-polity-relation-intervals.v1.json");
assert(structural.production_mutation === false && structural.baseline_a_uuid_rebind_required === true, "structural relation research must remain pending reviewed UUID rebind");
assert(Array.isArray(structural.relations) && structural.relations.length === 4, "expected four structural relation families");
const byId = new Map(structural.relations.map((x) => [x.id, x]));
for (const x of structural.relations) {
  assert(x.production_interval_approved === false, `${x.id} cannot self-authorize Production`);
  assert(Array.isArray(x.sources) && x.sources.length > 0, `${x.id} missing provenance`);
}
const canada = byId.get("canada_dominion_of_uk");
assert(canada?.start?.year === 1867 && canada?.end?.year === 1931 && canada?.end?.day === 10 && canada?.transition_milestone?.day === 11, "Canada dependency interval drifted");
const raj = byId.get("british_raj_colonial_dependency_of_uk");
assert(raj?.start?.year === 1858 && raj?.start?.month === 11 && raj?.start?.day === 1 && raj?.end?.year === 1947 && raj?.end?.month === 8 && raj?.end?.day === 14, "British Raj interval drifted");
const rsfsr = byId.get("rsfsr_constituent_of_ussr");
assert(rsfsr?.start?.year === 1922 && rsfsr?.start?.month === 12 && rsfsr?.start?.day === 30 && rsfsr?.end?.year === 1991 && rsfsr?.end?.month === 12 && rsfsr?.end?.day === 25 && rsfsr?.cessation_milestone?.day === 26, "RSFSR/USSR interval drifted");
const huainan = byId.get("huainan_vassal_of_western_han");
assert(huainan?.start?.year === -203 && huainan?.start?.granularity === "year" && huainan?.end?.year === -196 && huainan?.end?.granularity === "year", "Huainan Ying Bu phase chronology drifted");
assert(huainan?.broader_huainan_dynastic_continuity_asserted === false, "Huainan broader continuity must not be fabricated");

const closure = readJson("research/pre-vercel/stage2-pre-vercel-domain-closure.v1.json");
assert(closure.schema === "atlas-stage2-pre-vercel-domain-closure/v1", "pre-Vercel closure schema drift");
assert(closure.production_mutation === false, "pre-Vercel closure cannot authorize mutation");
assert(closure.result?.undifferentiated_pre_vercel_historical_research_remaining === 0, "undifferentiated research remains");
assert(closure.result?.baseline_a_independent_stage2_model_decisions_remaining === 0, "baseline-independent model decisions remain");
assert(closure.result?.irreducible_uncertainty_preserved_as_explicit_data_or_gate_state === true, "uncertainty preservation invariant lost");
assert(closure.result?.baseline_a_v2_uuid_binding_remaining === true, "live UUID binding remains an explicit P3 task until reviewed bindings are committed");
assert(closure.result?.p14_territory_geometry_remaining_but_not_stage2_activity_cutover_blocker_by_default === true, "P14 geometry boundary drifted");
assert(Array.isArray(closure.sengoku) && closure.sengoku.length === 3, "Sengoku closure incomplete");
assert(Array.isArray(closure.regional_china) && closure.regional_china.length === 6, "regional China closure incomplete");
assert(Array.isArray(closure.residual_cases) && closure.residual_cases.length === 9, "residual closure incomplete");
const residual = new Map(closure.residual_cases.map((x) => [x.person, x]));
assert(residual.get("Sacagawea")?.synthetic_person_polity_relation === false, "Sacagawea must remain out of synthetic polity relation");
assert(residual.get("Tecumseh")?.people_group === "Shawnee" && residual.get("Tecumseh")?.polity_target === "Tecumseh's Confederacy", "Tecumseh People/Polity separation drifted");
assert(residual.get("Sitting Bull")?.start_boundary === null && /P8/.test(residual.get("Sitting Bull")?.p8_required_action || ""), "Sitting Bull uncertainty must remain explicit and gated");

for (const proposal of ["db/proposals/stage2_semantic_extensions.rehearsal.sql", "db/proposals/stage2_provenance.rehearsal.sql", "db/proposals/stage2_entity_boundaries.rehearsal.sql", "db/proposals/stage2_activity_semantic_key.rehearsal.sql"]) {
  assert(/REHEARSAL ONLY/i.test(fs.readFileSync(rel(proposal), "utf8")), `${proposal} lost rehearsal-only guard`);
}

console.log(JSON.stringify({
  marker: "ATLAS_STAGE2_BASELINE_A_INTEGRATION_PREP_V1",
  status: "PASS",
  phase_status: integration.phase_status,
  portable_units: port.length,
  baseline_a_contract: "v2_full_identity_snapshot",
  baseline_a_activities: integration.baseline_policy.baseline_a_activity_count,
  completed_after_baseline_a: completed.size,
  remaining_after_baseline_a: remaining.size,
  structural_relations: structural.relations.length,
  sengoku_cases: closure.sengoku.length,
  regional_china_cases: closure.regional_china.length,
  residual_cases: closure.residual_cases.length,
  baseline_independent_model_decisions_remaining: 0,
  next_live_dependency: integration.pre_vercel_completion.next_required_live_dependency
}, null, 2));
