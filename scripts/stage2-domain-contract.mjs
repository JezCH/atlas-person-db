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

function uniqueCodes(items, label) {
  const values = items.map((item) => typeof item === 'string' ? item : item.code);
  if (values.some((value) => typeof value !== 'string' || value.length === 0)) {
    throw new Error(`${label} contains an invalid code`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} contains duplicate codes`);
  }
  return values;
}

const personPolityRelationCodes = uniqueCodes(raw.person_polity_relation_types, 'person_polity_relation_types');
const governanceTypes = uniqueCodes(raw.governance_types, 'governance_types');
const temporalGranularities = uniqueCodes(raw.temporal.granularities, 'temporal.granularities');
const temporalCertainties = uniqueCodes(raw.temporal.certainties, 'temporal.certainties');
const temporalCalendars = uniqueCodes(raw.temporal.calendars, 'temporal.calendars');
const polityDesignationTypes = uniqueCodes(raw.polity_designation_types, 'polity_designation_types');
const polityRelationCandidateCodes = uniqueCodes(raw.polity_relation_candidate_types, 'polity_relation_candidate_types');
const polityIdentityRelationCandidateCodes = uniqueCodes(raw.polity_identity_relation_candidate_types, 'polity_identity_relation_candidate_types');

export const stage2DomainContract = Object.freeze(raw);
export {
  contractPath,
  personPolityRelationCodes,
  governanceTypes,
  temporalGranularities,
  temporalCertainties,
  temporalCalendars,
  polityDesignationTypes,
  polityRelationCandidateCodes,
  polityIdentityRelationCandidateCodes
};
