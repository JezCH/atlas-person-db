import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contractPath = path.join(root, 'contracts/stage2-domain-contract.v1.json');
const raw = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

if (raw.schema !== 'atlas-stage2-domain-contract/v1') {
  throw new Error(`unexpected Stage 2 domain contract schema: ${raw.schema}`);
}
if (raw.production_migration_authorized !== false) {
  throw new Error('Stage 2 domain contract must remain explicitly non-production');
}
if (raw.baseline_policy?.old_346_binding_authoritative !== false || raw.baseline_policy?.baseline_a_required_for_uuid_rebind !== true) {
  throw new Error('Stage 2 domain contract must reject the old 346 binding and require Baseline A rebinding');
}

function uniqueCodes(items, label) {
  if (!Array.isArray(items) || !items.length) throw new Error(`${label} must be a non-empty array`);
  const values = items.map((item) => typeof item === 'string' ? item : item?.code);
  if (values.some((value) => typeof value !== 'string' || value.length === 0)) {
    throw new Error(`${label} contains an invalid code`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} contains duplicate codes`);
  }
  return Object.freeze(values);
}

export const stage2DomainContract = Object.freeze(raw);
export const contractPath = path.join(root, 'contracts/stage2-domain-contract.v1.json');
export const personPolityRelationCodes = uniqueCodes(raw.person_polity_relation_types, 'person_polity_relation_types');
export const governanceTypes = uniqueCodes(raw.governance_types, 'governance_types');
export const temporalGranularities = uniqueCodes(raw.temporal?.granularities, 'temporal.granularities');
export const temporalCertainties = uniqueCodes(raw.temporal?.certainties, 'temporal.certainties');
export const temporalCalendars = uniqueCodes(raw.temporal?.calendars, 'temporal.calendars');
export const polityDesignationTypes = uniqueCodes(raw.polity_designation_types, 'polity_designation_types');
export const polityRelationCandidateCodes = uniqueCodes(raw.polity_relation_candidate_types, 'polity_relation_candidate_types');
export const polityIdentityRelationCandidateCodes = uniqueCodes(raw.polity_identity_relation_candidate_types, 'polity_identity_relation_candidate_types');
export const provenanceSourceJoinTables = uniqueCodes(raw.provenance_source_join_tables, 'provenance_source_join_tables');
export const activitySemanticIdentityV2 = Object.freeze(raw.activity_semantic_identity_v2 || {});
