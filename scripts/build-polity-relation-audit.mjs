import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/polity-relation-audit.json');
const summaryPath = arg('--summary', 'artifacts/polity-relation-audit-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate current Activity UUID: ${byId.size}`);

const MODEL_RELEVANT = Object.freeze({
  'a77a000e-2fec-5983-afb9-5d7dbc829223': 'DEPENDENT_VASSAL_POLITY_TARGET_RESEARCH',
  '15777776-b739-5988-9a04-472b2d6629c7': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  'd22767c7-4e64-5c59-a5d9-60e32d146a4c': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  'b449d90d-783f-598b-aaeb-67cf37ea549a': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  '36a3ade9-b108-5358-8732-be7b3f6637f9': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  '42274e4c-af35-503f-a14f-e7460489b252': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  '583d7e8d-ed63-5a7e-947a-2a3c43f8dfad': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  '5b4fa9a3-ca6f-5e6b-a417-874f31b10650': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  'f5ea0e7c-1886-56f8-b4cc-b1ceba9dd1dd': 'JAPAN_LAYERED_AUTHORITY_RESEARCH',
  '8198cad1-dc14-5c1e-9b01-ddbddc447da7': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  '2a9029b6-3485-55a3-924f-6e9bc9adb901': 'REGIONAL_AUTHORITY_HIERARCHY_RESEARCH',
  '7c315e1c-90c3-5199-a292-8f68ba69d4b2': 'JAPAN_LAYERED_AUTHORITY_RESEARCH',
  '79dc9310-cd56-5bed-9a35-fe5361bdf0b6': 'JAPAN_LAYERED_AUTHORITY_RESEARCH',
  '400c78d5-a7e1-5ddb-83ef-91e0193db0f8': 'JAPAN_LAYERED_AUTHORITY_RESEARCH',
  'e497159b-6eb5-5ca9-85a3-591784d29906': 'DEPENDENT_POLITY_RELATION_REQUIRED',
  '7a89364b-dacf-5798-9a6d-dd312cbbee4d': 'COLONIAL_DEPENDENCY_MODEL_RELEVANT_BUT_NOT_SUFFICIENT',
  'df9c8cb3-bbf4-5037-930c-342962a3b7d0': 'CONSTITUENT_UNION_RELATION_REQUIRED',
  'e05c0337-8048-5695-901f-36c8fe2c6c1c': 'CONSTITUENT_UNION_RELATION_REQUIRED'
});

const NOT_PROVEN_CORE_RELATION = Object.freeze({
  'ab0b9158-9395-5f02-b560-c12c5671b879': 'CHRONOLOGY_RESEARCH_NOT_RELATION_DECISION',
  '14d3b9a3-5eee-5cdc-b60e-569bb2a27586': 'POLITY_RELABEL_RESEARCH_NOT_RELATION_DECISION',
  'fc68a326-f59f-5780-a6f0-c5206d9ceba3': 'TERRITORY_SPATIAL_CONTEXT_NOT_PARENT_RELATION',
  '2dfeec71-7fe2-56d3-b17a-06bc964b1e53': 'COMPOSITE_MONARCHY_ACTIVITY_KEEP_NO_NEW_RELATION_REQUIRED',
  '1645ec77-4ae8-52e0-8555-27ef1a185caa': 'COMPOSITE_MONARCHY_ACTIVITY_KEEP_NO_NEW_RELATION_REQUIRED',
  '5ca5da06-ce59-519d-953a-421d17e6270c': 'MULTIPLE_CROWN_ACTIVITY_NO_AUTOMATIC_PARENT_RELATION',
  '694d1057-2ab3-57b5-8c40-3a1e884e97b8': 'COMPOSITE_MONARCHY_ACTIVITY_KEEP_NO_NEW_RELATION_REQUIRED',
  'af14645b-de83-5d35-a977-eb7afce17710': 'AGGREGATE_COMPOSITE_POLICY_BEFORE_RELATION'
});

const expectedIds = new Set([...Object.keys(MODEL_RELEVANT), ...Object.keys(NOT_PROVEN_CORE_RELATION)]);
if (expectedIds.size !== 26) throw new Error(`explicit polity relation reconciliation duplicate: ${expectedIds.size}`);

const oldSignalRows = ledger.rows.filter((r) => r.audit?.dependencies?.includes('polity_relation_model'));
const oldSignalIds = new Set(oldSignalRows.map((r) => r.activity_id));
if (oldSignalIds.size !== 26) throw new Error(`old polity relation signal baseline drift: ${oldSignalIds.size}`);
for (const id of oldSignalIds) if (!expectedIds.has(id)) throw new Error(`unreconciled old polity relation signal: ${id}`);
for (const id of expectedIds) if (!oldSignalIds.has(id)) throw new Error(`expected polity relation signal disappeared: ${id}`);

const make = (id, classification, disposition) => {
  const row = byId.get(id);
  if (!row) throw new Error(`Activity missing: ${id}`);
  return {
    activity_id: id,
    person: row.person?.canonical ?? null,
    polity: row.polity?.canonical ?? null,
    start_year: row.activity?.start_year ?? null,
    end_year: row.activity?.end_year ?? null,
    role: row.activity?.role ?? null,
    audit_decision: row.audit?.decision ?? null,
    primary_source: row.audit?.primary_source ?? null,
    disposition,
    classification
  };
};

const relevant = Object.entries(MODEL_RELEVANT).map(([id, c]) => make(id, c, 'POLITY_RELATION_MODEL_RELEVANT'));
const notProven = Object.entries(NOT_PROVEN_CORE_RELATION).map(([id, c]) => make(id, c, 'NO_CORE_POLITY_RELATION_PROVEN_BY_CURRENT_ACTIVITY'));

const categories = {};
for (const row of relevant) categories[row.classification] = (categories[row.classification] ?? 0) + 1;

const summary = {
  schema: 'atlas-polity-relation-audit-summary/v1',
  baseline_relationships: ledger.rows.length,
  old_dependency_signal_rows: oldSignalIds.size,
  model_relevant_rows: relevant.length,
  no_core_relation_proven_rows: notProven.length,
  model_relevant_categories: Object.fromEntries(Object.entries(categories).sort(([a], [b]) => a.localeCompare(b))),
  storage_direction: 'SUBJECT_TO_OBJECT_ONLY_WITH_DERIVED_INVERSE',
  temporal_identity_relations_excluded: true,
  territory_control_relations_excluded: true,
  conclusion: 'POLITY_RELATION_TABLE_JUSTIFIED_BACKFILL_REMAINS_RESEARCH_GATED'
};

if (summary.model_relevant_rows !== 18 || summary.no_core_relation_proven_rows !== 8) {
  throw new Error(`polity relation reconciliation drift: ${summary.model_relevant_rows}/${summary.no_core_relation_proven_rows}`);
}

const payload = {
  schema: 'atlas-polity-relation-audit/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  contract: {
    relation_type_storage: 'VOCABULARY_TABLE_NOT_HARD_ENUM',
    initial_candidate_codes: [
      'constituent_of',
      'dominion_of',
      'colonial_dependency_of',
      'vassal_of',
      'tributary_to',
      'protectorate_of',
      'member_of_confederation'
    ],
    excluded_from_this_model: [
      'polity_identity_successor_or_state_form',
      'territory_control_or_occupation',
      'automatic_personal_union_parentage',
      'historiographic_aggregate_without_review'
    ]
  },
  summary,
  model_relevant: relevant,
  no_core_relation_proven: notProven
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
