import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stage2DomainContract,
  personPolityRelationCodes,
  governanceTypes,
  temporalGranularities,
  temporalCertainties,
  temporalCalendars,
  polityDesignationTypes,
  polityRelationCandidateCodes,
  polityIdentityRelationCandidateCodes,
  provenanceSourceJoinTables,
  activitySemanticIdentityV2
} from './stage2-domain-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));

function same(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} drift\nactual=${JSON.stringify(left)}\nexpected=${JSON.stringify(right)}`);
  }
}

function requireTokens(source, tokens, label) {
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`${label} lost contract token: ${token}`);
  }
}

function sqlInList(sql, expression, label) {
  const escaped = expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = sql.match(new RegExp(`${escaped}\\s+IN\\s*\\(([^)]+)\\)`, 'i'));
  if (!match) throw new Error(`cannot find ${label} IN-list in rehearsal SQL`);
  const values = [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (!values.length) throw new Error(`${label} SQL list is empty`);
  return values;
}

if (stage2DomainContract.production_migration_authorized !== false) throw new Error('domain contract unexpectedly authorizes Production migration');
if (stage2DomainContract.baseline_policy?.old_346_binding_authoritative !== false) throw new Error('old 346 binding must not be domain authority');
if (stage2DomainContract.baseline_policy?.baseline_a_required_for_uuid_rebind !== true) throw new Error('Baseline A rebinding must remain mandatory');
if (stage2DomainContract.baseline_policy?.production_uuid_bindings_allowed !== false) throw new Error('pre-Baseline-A Production UUID binding must remain forbidden');
if (stage2DomainContract.principles?.person_owns_territory !== false || stage2DomainContract.principles?.territory_owner !== 'polity') throw new Error('Polity-owned Territory principle drifted');
if (stage2DomainContract.principles?.government_or_regime_is_separate_from_polity !== true) throw new Error('Governance/Polity separation drifted');
if (stage2DomainContract.principles?.generic_relation_default_forbidden !== true) throw new Error('generic Relation default must remain forbidden');

same(personPolityRelationCodes, ['rules','governs','serves','active_in','opposes','claims_rule'], 'Person–Polity Relation vocabulary');
same(governanceTypes, ['government','constitutional_regime','governing_regime'], 'Governance vocabulary');
same(temporalGranularities, ['year','month','day'], 'temporal granularity');
same(temporalCertainties, ['exact','approximate','uncertain'], 'temporal certainty');
same(temporalCalendars, ['gregorian','julian','unspecified_historical','source_calendar'], 'temporal calendars');
same(polityDesignationTypes, ['official_name','state_form','historiographic_period','conventional_temporal_label'], 'Polity designation vocabulary');
same(polityRelationCandidateCodes, ['constituent_of','dominion_of','colonial_dependency_of','vassal_of','tributary_to','protectorate_of','member_of_confederation','nominally_subordinate_to'], 'Polity relation vocabulary');
same(polityIdentityRelationCandidateCodes, ['succeeds','secedes_from','formed_by_union_of','splits_from','annexed_into'], 'Polity identity relation vocabulary');
same(provenanceSourceJoinTables, ['polity_governance_period_sources','polity_relation_sources','polity_designation_sources','polity_identity_relation_sources'], 'Stage 2 provenance join tables');

same(activitySemanticIdentityV2.dimensions || [], ['person_id','polity_id','relation_type_id','role_id_nullable','period_basis_id','interpreted_start_boundary','interpreted_end_boundary'], 'Activity semantic-key v2 dimensions');
same(activitySemanticIdentityV2.boundary_identity_fields || [], ['year','month','day','granularity','calendar'], 'Activity semantic boundary fields');
requireTokens((activitySemanticIdentityV2.excluded_fields || []).join('\n'), ['certainty','confidence','chronology_status','notes','source_links','content_hash'], 'Activity semantic excluded fields');
if (activitySemanticIdentityV2.activation_phase !== 'P9' || activitySemanticIdentityV2.legacy_null_role_index_replacement_required !== true || activitySemanticIdentityV2.coherent_consumer_cutover_required !== true) {
  throw new Error('Activity semantic-key v2 cutover contract drifted');
}

const relationDoc = read('docs/audits/RELATION_SEMANTICS_CONTRACT_V1_2026-08-12.md');
requireTokens(relationDoc, personPolityRelationCodes.map((code) => `\`${code}\``), 'Relation contract doc');
const governanceDoc = read('docs/stage2/contracts/GOVERNANCE_CONTEXT_CURRENT_V1.md');
requireTokens(governanceDoc, governanceTypes.map((code) => `\`${code}\``), 'Governance contract doc');
const temporalDoc = read('docs/stage2/contracts/TEMPORAL_CURRENT_V1.md');
requireTokens(temporalDoc, [...temporalGranularities, ...temporalCertainties, ...temporalCalendars], 'Temporal contract doc');
const polityRelationDoc = read('docs/stage2/contracts/POLITY_RELATION_CURRENT_V1.md');
requireTokens(polityRelationDoc, polityRelationCandidateCodes.map((code) => `\`${code}\``), 'Polity relation contract doc');
const provenanceDoc = read('docs/stage2/contracts/PROVENANCE_CURRENT_V1.md');
requireTokens(provenanceDoc, provenanceSourceJoinTables, 'Provenance contract doc');
const semanticDoc = read('docs/stage2/contracts/ACTIVITY_SEMANTIC_KEY_V2_CURRENT.md');
requireTokens(semanticDoc, ['Relation Type UUID','Role UUID / NULL','Period Basis UUID','interpreted start boundary','interpreted end boundary','P9'], 'Activity semantic-key contract doc');
const additiveDoc = read('docs/stage2/contracts/ADDITIVE_SCHEMA_CURRENT_V1.md');
requireTokens(additiveDoc, ['nullable `relation_type_id`','Governance Context','Polity relation type vocabulary','semantic-key v2','P9'], 'Additive schema contract doc');

const rehearsalSql = read('db/proposals/stage2_semantic_extensions.rehearsal.sql');
if (!/REHEARSAL ONLY/i.test(rehearsalSql)) throw new Error('Stage 2 semantic schema proposal must remain rehearsal-only');
same(sqlInList(rehearsalSql, 'boundary_granularity', 'temporal granularity'), temporalGranularities, 'SQL temporal granularity');
same(sqlInList(rehearsalSql, 'boundary_certainty', 'temporal certainty'), temporalCertainties, 'SQL temporal certainty');
same(sqlInList(rehearsalSql, 'boundary_calendar', 'temporal calendar'), temporalCalendars, 'SQL temporal calendar');
same(sqlInList(rehearsalSql, 'governance_type', 'governance type'), governanceTypes, 'SQL governance type');
same(sqlInList(rehearsalSql, 'designation_type', 'Polity designation type'), polityDesignationTypes, 'SQL Polity designation type');

const provenanceSql = read('db/proposals/stage2_provenance.rehearsal.sql');
if (!/REHEARSAL ONLY/i.test(provenanceSql)) throw new Error('Stage 2 provenance proposal must remain rehearsal-only');
requireTokens(provenanceSql, provenanceSourceJoinTables, 'Stage 2 provenance SQL');
if (/CREATE\s+TABLE\s+atlas_v2\.sources/i.test(provenanceSql)) throw new Error('Stage 2 provenance must reuse atlas_v2.sources');

const semanticKeySql = read('db/proposals/stage2_activity_semantic_key.rehearsal.sql');
if (!/REHEARSAL ONLY/i.test(semanticKeySql)) throw new Error('Stage 2 semantic-key proposal must remain rehearsal-only');
requireTokens(semanticKeySql, ['relation_type_id','role_id','period_basis_id','activity_start_month','activity_start_granularity','activity_start_calendar','activity_end_month','activity_end_granularity','activity_end_calendar','NULLS NOT DISTINCT'], 'Stage 2 semantic-key SQL');
const semanticKeyExecutable = semanticKeySql.replace(/^\s*--.*$/gm, '');
for (const forbidden of ['activity_start_certainty','activity_end_certainty','confidence','notes','content_hash']) {
  if (semanticKeyExecutable.includes(forbidden)) throw new Error(`evidence field leaked into semantic identity SQL: ${forbidden}`);
}

const migrationRegistries = [
  'server/atlas-authoring-migrations.js',
  'server/atlas-correction-migrations.js'
].filter((relative) => fs.existsSync(path.join(root, relative)));
for (const relative of migrationRegistries) {
  const source = read(relative);
  for (const proposal of ['stage2_semantic_extensions.rehearsal.sql','stage2_provenance.rehearsal.sql','stage2_activity_semantic_key.rehearsal.sql']) {
    if (source.includes(proposal)) throw new Error(`${relative} registered rehearsal proposal in Production migration path: ${proposal}`);
  }
}

const integration = readJson('stage2/integration/stage2-baseline-independent-prep.v1.json');
const portIds = new Set((integration.port_now || []).map((entry) => entry.id));
for (const id of ['stage2_domain_contract_machine','stage2_schema_rehearsal','stage2_provenance_rehearsal','stage2_semantic_key_rehearsal']) {
  if (!portIds.has(id)) throw new Error(`integration manifest missing portable Stage 2 execution contract: ${id}`);
}

const rawContract = read('contracts/stage2-domain-contract.v1.json');
if (/"authoritative_activity_count"\s*:\s*346/.test(rawContract) || /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(rawContract)) {
  throw new Error('machine-readable Stage 2 domain contract must not carry old baseline bindings');
}

console.log(JSON.stringify({
  marker: 'ATLAS_STAGE2_CURRENT_DOMAIN_CONTRACT_V1',
  status: 'PASS',
  production_migration_authorized: false,
  baseline_a_rebind_required: true,
  person_polity_relations: personPolityRelationCodes.length,
  governance_types: governanceTypes.length,
  polity_relation_types: polityRelationCandidateCodes.length,
  polity_identity_relation_types: polityIdentityRelationCandidateCodes.length,
  provenance_join_families: provenanceSourceJoinTables.length,
  unresolved_temporal_boundaries_supported: stage2DomainContract.temporal?.boundary_may_be_unresolved_in_authoring === true,
  multiple_source_locators_supported: stage2DomainContract.provenance_rules?.multiple_locators_per_source_per_assertion_allowed === true,
  semantic_key_v2_activation_phase: activitySemanticIdentityV2.activation_phase
}, null, 2));
