import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/polity-identity-audit.json');
const summaryPath = arg('--summary', 'artifacts/polity-identity-audit-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((r) => [r.activity_id, r]));
if (byId.size !== 346) throw new Error(`duplicate current Activity UUIDs: ${byId.size}`);

const GROUPS = Object.freeze({
  TEMPORAL_DESIGNATION_STATE_FORM: [
    '3c213212-f4f3-5018-8a2f-1eb2602984d7',
    'e725f957-7ce2-5aa0-805b-5f9c2be7d250',
    '45c30e16-92ba-5e89-8ef1-68dad29129bc',
    '9f3b397d-0224-57bf-af75-420fb42ef97e',
    '1fa109e2-38d4-54f2-bc52-ce10e1a8dac3',
    'daf85f20-db1f-50c2-aff1-86830290da8e',
    '486ce4c6-cb60-530f-8d88-03f7cc75a4bf'
  ],
  DUPLICATE_ALIAS_IDENTITY_RECONCILIATION: [
    '21174e2f-1e20-57b1-ad69-e846c684a09f',
    'b5e49aa2-44b9-5b1c-bc84-a2650d946ef5',
    'd1630b88-d82b-5c5e-a7a1-195bf9661465',
    '9db8d593-a73c-5993-bfe6-b2b30ec71167',
    '2f2a2dfe-12b3-52b7-957e-42d6f7b89f2a'
  ],
  CONTINUITY_MODEL_REVIEW: [
    'aa5f6b18-e362-5421-9547-5ed0161d3cb8',
    'c778c8f8-9ae5-5d60-b04d-c5e002cf8bfa',
    '3f0af453-7e55-5bf0-a8d8-6092788e28a6',
    '418d957a-1658-51a6-8b35-71757f712760',
    '59559235-3a54-5985-b83d-bbc16ac01467',
    '68c203e5-ac61-59ed-853b-365bdf3ed340',
    'c5085fdb-379a-5710-bf14-c748b5b822da',
    '57cdefa5-9a5d-533c-b229-47e398f1d07a',
    'eda26b64-2f59-5f15-954a-73404ceed064',
    '9ec53325-3a97-58a8-a7e7-81a496a47e57',
    'a5be2a19-2c82-519f-9a3c-6dcc5a1bf3b7',
    'fefe572f-95f7-5913-86ed-304c7c2ca679',
    '25fcca0f-9ca3-5bdd-a9c8-e11bf8e22b89'
  ],
  DISTINCT_UNION_PLUS_CONSTITUENT_MODEL: [
    'df9c8cb3-bbf4-5037-930c-342962a3b7d0',
    'e05c0337-8048-5695-901f-36c8fe2c6c1c'
  ],
  FALSE_OR_NOT_PRIMARY_IDENTITY_SIGNAL: [
    '7981dd26-4200-57d9-b4d4-bbd97f13e28f'
  ]
});

const allExplicit = Object.values(GROUPS).flat();
if (new Set(allExplicit).size !== 28) throw new Error(`explicit identity grouping duplicate or missing: ${new Set(allExplicit).size}`);

const oldRows = ledger.rows.filter((r) => r.audit?.dependencies?.includes('polity_identity_model'));
const oldIds = new Set(oldRows.map((r) => r.activity_id));
if (oldIds.size !== 28) throw new Error(`old identity dependency baseline drift: ${oldIds.size}`);
for (const id of oldIds) if (!allExplicit.includes(id)) throw new Error(`unreconciled old identity signal: ${id}`);
for (const id of allExplicit) if (!oldIds.has(id)) throw new Error(`expected identity signal disappeared: ${id}`);

const rows = [];
for (const [classification, ids] of Object.entries(GROUPS)) {
  for (const id of ids) {
    const r = byId.get(id);
    if (!r) throw new Error(`Activity missing: ${id}`);
    rows.push({
      activity_id: id,
      person: r.person?.canonical ?? null,
      polity: r.polity?.canonical ?? null,
      start_year: r.activity?.start_year ?? null,
      end_year: r.activity?.end_year ?? null,
      role: r.activity?.role ?? null,
      audit_decision: r.audit?.decision ?? null,
      primary_source: r.audit?.primary_source ?? null,
      classification
    });
  }
}

const counts = Object.fromEntries(Object.entries(GROUPS).map(([k, v]) => [k, v.length]));
const summary = {
  schema: 'atlas-polity-identity-audit-summary/v1',
  baseline_relationships: ledger.rows.length,
  old_dependency_signal_rows: oldIds.size,
  classification_counts: counts,
  temporal_designation_rows: GROUPS.TEMPORAL_DESIGNATION_STATE_FORM.length,
  duplicate_alias_rows: GROUPS.DUPLICATE_ALIAS_IDENTITY_RECONCILIATION.length,
  continuity_review_rows: GROUPS.CONTINUITY_MODEL_REVIEW.length,
  distinct_union_constituent_rows: GROUPS.DISTINCT_UNION_PLUS_CONSTITUENT_MODEL.length,
  false_or_not_primary_rows: GROUPS.FALSE_OR_NOT_PRIMARY_IDENTITY_SIGNAL.length,
  conclusion: 'SEPARATE_STABLE_IDENTITY_DESIGNATIONS_TRANSITIONS_AND_SIMULTANEOUS_HIERARCHY'
};

if (
  summary.temporal_designation_rows !== 7 ||
  summary.duplicate_alias_rows !== 5 ||
  summary.continuity_review_rows !== 13 ||
  summary.distinct_union_constituent_rows !== 2 ||
  summary.false_or_not_primary_rows !== 1
) throw new Error(`identity classification drift: ${JSON.stringify(summary.classification_counts)}`);

const payload = {
  schema: 'atlas-polity-identity-audit/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  contract: {
    stable_identity: 'polities.id UUID',
    temporal_designation_model: true,
    distinct_polity_identity_relation_model: true,
    alias_merge_not_transition: true,
    simultaneous_hierarchy_separate: true,
    territory_history_separate: true,
    no_lexical_auto_split: true
  },
  summary,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
