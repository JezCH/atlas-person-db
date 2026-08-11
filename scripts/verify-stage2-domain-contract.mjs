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
  polityRelationCandidateCodes
} from './stage2-domain-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function same(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label} drift\nactual=${JSON.stringify(left)}\nexpected=${JSON.stringify(right)}`);
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

function relationLiterals(source, label) {
  const values = [...source.matchAll(/relation_type:\s*'([^']+)'/g)].map((m) => m[1]);
  for (const value of values) {
    if (!personPolityRelationCodes.includes(value)) {
      throw new Error(`${label} uses Relation Type outside Stage 2 contract: ${value}`);
    }
  }
  return [...new Set(values)].sort();
}

if (stage2DomainContract.production_migration_authorized !== false) {
  throw new Error('Stage 2 contract unexpectedly authorizes Production migration');
}
if (stage2DomainContract.principles?.person_owns_territory !== false || stage2DomainContract.principles?.territory_owner !== 'polity') {
  throw new Error('Stage 2 contract violated Polity-owned Territory principle');
}

const requiredContractReaders = [
  'scripts/build-relation-semantics-audit.mjs',
  'scripts/build-governance-context-audit.mjs',
  'scripts/build-polity-relation-audit.mjs',
  'scripts/build-temporal-contract-audit.mjs'
];
for (const file of requiredContractReaders) {
  if (!read(file).includes("./stage2-domain-contract.mjs")) {
    throw new Error(`${file} is no longer reading the shared Stage 2 domain contract`);
  }
}

const rehearsalSql = read('db/proposals/stage2_semantic_extensions.rehearsal.sql');
same(sqlInList(rehearsalSql, 'boundary_granularity', 'temporal granularity'), temporalGranularities, 'SQL temporal granularity');
same(sqlInList(rehearsalSql, 'boundary_certainty', 'temporal certainty'), temporalCertainties, 'SQL temporal certainty');
same(sqlInList(rehearsalSql, 'boundary_calendar', 'temporal calendar'), temporalCalendars, 'SQL temporal calendar');
same(sqlInList(rehearsalSql, 'governance_type', 'governance type'), governanceTypes, 'SQL governance type');
same(sqlInList(rehearsalSql, 'designation_type', 'Polity designation type'), polityDesignationTypes, 'SQL Polity designation type');

const relationAudit = read('scripts/build-relation-semantics-audit.mjs');
for (const code of personPolityRelationCodes) {
  if (!relationAudit.includes(`assign('${code}'`) && code !== 'claims_rule') {
    throw new Error(`current baseline Relation role policy lost contract code: ${code}`);
  }
}
if (relationAudit.includes("assign('claims_rule'")) {
  throw new Error('claims_rule must remain explicit-review-only in the conservative baseline policy');
}

const polityRelationAudit = read('scripts/build-polity-relation-audit.mjs');
if (!polityRelationAudit.includes('polityRelationCandidateCodes')) {
  throw new Error('Polity relation audit no longer emits candidate codes from shared contract');
}

const readinessRelations = relationLiterals(read('scripts/build-relation-backfill-readiness.mjs'), 'Relation backfill readiness');
const directRelations = relationLiterals(read('scripts/build-direct-relation-review.mjs'), 'Direct Relation review');

const contractSummary = {
  marker: 'ATLAS_STAGE2_DOMAIN_CONTRACT_V1',
  status: 'PASS',
  production_migration_authorized: false,
  person_polity_relation_types: personPolityRelationCodes,
  governance_types: governanceTypes,
  temporal_granularities: temporalGranularities,
  temporal_certainties: temporalCertainties,
  temporal_calendars: temporalCalendars,
  polity_designation_types: polityDesignationTypes,
  polity_relation_candidate_codes: polityRelationCandidateCodes,
  reviewed_relation_literals: {
    readiness: readinessRelations,
    direct_review: directRelations
  },
  sql_contract_drift: false,
  audit_contract_drift: false
};

console.log(JSON.stringify(contractSummary, null, 2));
