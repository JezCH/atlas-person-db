import fs from 'node:fs';

const args = process.argv.slice(2);
const manifestPath = args[0];
const batch1Path = args[1];
const batch2Path = args[2];
const batch3Path = args[3];
const sourcePackagePath = args[4] || 'stage2/authoring/p5-polity-relation-sources.v1.json';
const readinessPath = args[5] || 'stage2/integration/p5-preproduction-schema-readiness.v1.json';
if (!manifestPath || !batch1Path || !batch2Path || !batch3Path) {
  throw new Error('usage: node verify <p5p6-manifest> <batch1> <batch2> <batch3> [source-package] [readiness]');
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const batches = [batch1Path, batch2Path, batch3Path].map((p) => JSON.parse(fs.readFileSync(p, 'utf8')));
const sourcePackage = JSON.parse(fs.readFileSync(sourcePackagePath, 'utf8'));
const readiness = JSON.parse(fs.readFileSync(readinessPath, 'utf8'));
const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

if (manifest?.schema !== 'atlas-stage2-baseline-a-p5p6-execution-manifest/v2') throw new Error('P5/P6 manifest v2 required');
if (readiness?.schema !== 'atlas-stage2-p5-preproduction-schema-readiness/v1') throw new Error('P5 readiness schema drift');
if (readiness.status !== 'P5_PREPRODUCTION_SCHEMA_REHEARSAL_READY_NO_PRODUCTION_MUTATION') throw new Error('P5 readiness status drift');
if (readiness.baseline?.deployment_sha !== expectedDeployment || readiness.baseline?.baseline_digest !== expectedDigest) throw new Error('P5 readiness Baseline A drift');
if (readiness.safety?.production_migration_registered !== false || readiness.safety?.production_mutation_authorized !== false || readiness.completion_boundary?.atlas_rq_0215_remains_pending_until_production_apply !== true) throw new Error('P5 readiness Production boundary missing');

const expectedFrontier = {
  new_polity_targets: 24,
  new_polity_uuid_assignments: 0,
  polity_relation_assertions: 10,
  relation_source_candidates: 9,
  relation_source_links: 11,
  relation_source_uuid_assignments: 0,
  correction_v2_activities: 57,
  people_group_boundary_polity_targets: 5,
  entity_migrations: 3
};
for (const [key, value] of Object.entries(expectedFrontier)) {
  if (Number(readiness.prepared_frontier?.[key]) !== value) throw new Error(`P5 readiness frontier drift ${key}`);
}
if (Number(manifest.summary?.new_polity_target_count) !== 24 || Number(manifest.summary?.correction_v2_activity_count) !== 57 || Number(manifest.summary?.p3_reviewed_polity_relation_assertion_count) !== 10 || Number(manifest.summary?.entity_migration_count) !== 3) throw new Error('authoritative P5/P6 manifest frontier drift');

const manifestTargetClasses = new Set((manifest.new_polity_targets || []).map((target) => target.identity_class));
if (manifestTargetClasses.size !== 24) throw new Error('authoritative new Polity target cardinality drift');
const preparedTargets = new Map();
for (const [batchIndex, batch] of batches.entries()) {
  if (batch?.schema !== 'atlas-stage2-p5-polity-authoring-package/v1' || batch.status !== 'REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION') throw new Error(`P5 Polity authoring batch ${batchIndex + 1} contract drift`);
  for (const target of batch.targets || []) {
    if (!manifestTargetClasses.has(target.identity_class)) throw new Error(`${target.identity_class}: prepared Polity is outside authoritative frontier`);
    if (preparedTargets.has(target.identity_class)) throw new Error(`${target.identity_class}: duplicated across P5 Polity authoring batches`);
    if (target.polity_uuid !== null || target.baseline_absence_verified !== true) throw new Error(`${target.identity_class}: preproduction Polity UUID must remain null`);
    if (target.territory_geometry_status !== 'P14_DEFERRED') throw new Error(`${target.identity_class}: Territory/Geometry must remain P14-deferred`);
    preparedTargets.set(target.identity_class, target);
  }
}
if (preparedTargets.size !== 24 || [...manifestTargetClasses].some((identityClass) => !preparedTargets.has(identityClass))) throw new Error('P5 Polity authoring packages do not cover the full 24-target frontier');

const requiredKinds = new Set(readiness.semantic_name_kinds_required || []);
const domainKinds = new Set(readiness.semantic_name_kind_domain || []);
const expectedDomainKinds = new Set(['historical_official','historical_attested','historiographic_conventional','editorial_catalog_label']);
if (domainKinds.size !== expectedDomainKinds.size || [...expectedDomainKinds].some((kind) => !domainKinds.has(kind))) throw new Error('semantic name kind domain drift');
for (const target of preparedTargets.values()) {
  if (!domainKinds.has(target.semantic_name_kind)) throw new Error(`${target.identity_class}: unsupported semantic name kind ${target.semantic_name_kind}`);
  requiredKinds.add(target.semantic_name_kind);
}
for (const required of ['historical_attested','historiographic_conventional','editorial_catalog_label']) if (!requiredKinds.has(required)) throw new Error(`prepared P5 names do not exercise required semantic kind ${required}`);

const batch3 = batches[2];
if ((batch3.targets || []).length !== 5 || (batch3.targets || []).some((target) => target.broad_people_group_polity_rejected !== true || target.people_group_migration_required !== true)) throw new Error('PeopleGroup/Polity boundary handoff drift');

if (sourcePackage?.schema !== 'atlas-stage2-p5-polity-relation-source-authoring-package/v1' || sourcePackage.status !== 'REVIEWED_SOURCE_PREP_NO_UUID_NO_PRODUCTION_MUTATION') throw new Error('P5 relation Source package drift');
if ((sourcePackage.sources || []).length !== 9 || (sourcePackage.links || []).length !== 11) throw new Error('P5 relation Source package count drift');
if ((sourcePackage.sources || []).some((source) => source.source_uuid !== null || source.sha256 !== null || source.bytes !== null || !source.canonical_url || !source.citation_text)) throw new Error('bibliographic Source candidates must remain UUID-less and unmaterialized with reviewed citation evidence');
const manifestAssertions = manifest.polity_relation_assertions || [];
if (manifestAssertions.length !== 10) throw new Error('reviewed Polity relation assertion count drift');
const assertionDecisionIds = new Set(manifestAssertions.map((assertion) => assertion.decision_id));
const sourceCandidateKeys = new Set((sourcePackage.sources || []).map((source) => source.candidate_key));
const sourceCoveredDecisions = new Set();
for (const link of sourcePackage.links || []) {
  if (!assertionDecisionIds.has(link.relation_decision_id)) throw new Error(`${link.relation_decision_id}: provenance link outside reviewed assertion frontier`);
  if (!sourceCandidateKeys.has(link.source_candidate_key)) throw new Error(`${link.relation_decision_id}: provenance link references unknown Source candidate`);
  if (!String(link.source_locator_key || '').trim()) throw new Error(`${link.relation_decision_id}: provenance locator blank`);
  sourceCoveredDecisions.add(link.relation_decision_id);
}
if (sourceCoveredDecisions.size !== 10 || [...assertionDecisionIds].some((id) => !sourceCoveredDecisions.has(id))) throw new Error('not all reviewed Polity relation assertions have prepared normalized provenance');

const requiredRelationTypes = new Set(readiness.relation_types_required_by_reviewed_assertions || []);
const actualRelationTypes = new Set(manifestAssertions.map((assertion) => assertion.relation_type));
if (requiredRelationTypes.size !== 3 || [...['dominion_of','nominally_subordinate_to','vassal_of']].some((code) => !requiredRelationTypes.has(code))) throw new Error('P5 readiness relation-type registry drift');
if ([...actualRelationTypes].some((code) => !requiredRelationTypes.has(code))) throw new Error(`reviewed assertion relation type not declared by P5 readiness ${JSON.stringify([...actualRelationTypes])}`);

function readProposal(id) {
  const component = (readiness.schema_components || []).find((item) => item.id === id);
  if (!component?.proposal || !fs.existsSync(component.proposal)) throw new Error(`${id}: proposal file missing`);
  const sql = fs.readFileSync(component.proposal, 'utf8');
  if (!/REHEARSAL ONLY/i.test(sql) || !/Do not apply to Production|not registered in any Production migration runner/i.test(sql)) throw new Error(`${id}: proposal lost rehearsal-only boundary`);
  return { component, sql };
}

const semantic = readProposal('semantic_extensions');
for (const token of ['CREATE TABLE atlas_v2.person_polity_relation_types','CREATE TABLE atlas_v2.governance_contexts','CREATE TABLE atlas_v2.polity_governance_periods','CREATE TABLE atlas_v2.polity_relation_types','CREATE TABLE atlas_v2.polity_relations','CREATE TABLE atlas_v2.polity_designations','CREATE TABLE atlas_v2.polity_identity_relations','activity_start_granularity','activity_end_calendar']) {
  if (!semantic.sql.includes(token)) throw new Error(`semantic_extensions missing capability token ${token}`);
}
if (!semantic.sql.includes('boundary_year <> 0') || !semantic.sql.includes("'exact','approximate','uncertain'")) throw new Error('semantic temporal uncertainty/no-year-zero contract missing');

const source = readProposal('source_model');
for (const token of ['ADD COLUMN canonical_url text','ADD COLUMN citation_text text','ALTER COLUMN sha256 DROP NOT NULL','ALTER COLUMN bytes DROP NOT NULL','sources_content_materialization_pair_check','sources_evidence_identity_material_check']) {
  if (!source.sql.includes(token)) throw new Error(`source_model missing capability token ${token}`);
}
const sourceContractPath = source.component.contract;
if (!sourceContractPath || !fs.existsSync(sourceContractPath)) throw new Error('Source contract missing from P5 readiness');
const sourceContract = JSON.parse(fs.readFileSync(sourceContractPath, 'utf8'));
if (sourceContract.materialization?.fake_sha256_for_web_reference_forbidden !== true || sourceContract.materialization?.fake_bytes_for_web_reference_forbidden !== true) throw new Error('Source contract permits fabricated materialization metadata');

const provenance = readProposal('normalized_provenance');
for (const token of ['CREATE TABLE atlas_v2.polity_governance_period_sources','CREATE TABLE atlas_v2.polity_relation_sources','CREATE TABLE atlas_v2.polity_designation_sources','CREATE TABLE atlas_v2.polity_identity_relation_sources','source_locator_key text NOT NULL']) {
  if (!provenance.sql.includes(token)) throw new Error(`normalized_provenance missing capability token ${token}`);
}

const entity = readProposal('entity_boundaries');
for (const token of ['ADD COLUMN semantic_name_kind text',"'historical_official'","'historical_attested'","'historiographic_conventional'","'editorial_catalog_label'",'CREATE TABLE atlas_v2.people_groups','CREATE TABLE atlas_v2.person_people_affiliations','CREATE TABLE atlas_v2.historical_events','CREATE TABLE atlas_v2.person_event_participations']) {
  if (!entity.sql.includes(token)) throw new Error(`entity_boundaries missing capability token ${token}`);
}
const entityContractPath = entity.component.contract;
if (!entityContractPath || !fs.existsSync(entityContractPath)) throw new Error('entity-boundary contract missing from P5 readiness');
const entityContract = JSON.parse(fs.readFileSync(entityContractPath, 'utf8'));
if (entityContract.identity_principles?.people_group_is_polity !== false || entityContract.identity_principles?.historical_event_is_polity !== false || entityContract.polity_naming_rules?.editorial_catalog_label_must_not_create_polity_designation_assertion !== true) throw new Error('entity-boundary contract drift');

if (readiness.safety?.uuid_is_identity !== true || readiness.safety?.name_only_polity_binding_forbidden !== true || readiness.safety?.people_group_auto_polity_forbidden !== true || readiness.safety?.fake_bibliographic_hash_or_bytes_forbidden !== true || readiness.safety?.unknown_temporal_precision_must_not_be_fabricated !== true || readiness.safety?.territory_geometry_remains_p14_deferred !== true || readiness.safety?.physical_person_merge_forbidden_before_p10 !== true) throw new Error('P5 readiness safety invariants incomplete');

console.log(JSON.stringify({
  marker: 'ATLAS_P5_PREPRODUCTION_SCHEMA_READINESS_OK',
  prepared_polities: preparedTargets.size,
  reviewed_polity_relations: manifestAssertions.length,
  bibliographic_source_candidates: sourceCandidateKeys.size,
  provenance_links: sourcePackage.links.length,
  correction_v2_activities: manifest.summary.correction_v2_activity_count,
  people_group_boundary_polities: batch3.targets.length,
  schema_components: readiness.schema_components.length,
  production_migration_registered: false,
  production_mutation_authorized: false,
  atlas_rq_0215_remains_pending: true
}, null, 2));
