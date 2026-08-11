import fs from 'node:fs';
import path from 'node:path';
import { personPolityRelationCodes } from './stage2-domain-contract.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/kublai-authority-decisions.json');
const summaryPath = arg('--summary', 'artifacts/kublai-authority-decisions-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error(`unexpected ledger schema: ${ledger.schema}`);
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) throw new Error(`unexpected ledger baseline: ${ledger.rows?.length}`);
const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate Activity UUIDs: ${byId.size}`);

const RELATION_CODES = new Set(personPolityRelationCodes);
for (const required of ['rules', 'claims_rule']) {
  if (!RELATION_CODES.has(required)) throw new Error(`Stage 2 relation contract missing ${required}`);
}

const SOURCES = Object.freeze({
  mote: {
    title: 'Chinese society under Mongol rule, 1215–1368',
    author: 'Frederick W. Mote',
    institution: 'Cambridge University Press / The Cambridge History of China',
    year: 2008,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-china/chinese-society-under-mongol-rule-12151368/9A6883E723707B5FA65850F9AD9AA402',
    source_type: 'scholarly_reference_chapter'
  },
  allsen: {
    title: 'Grand Qans and Il-qans, 1265–1295',
    author: 'Thomas T. Allsen',
    institution: 'Cambridge University Press / Culture and Conquest in Mongol Eurasia',
    year: 2001,
    url: 'https://www.cambridge.org/core/books/abs/culture-and-conquest-in-mongol-eurasia/grand-qans-and-ilqans-12651295/2EB9EC01543A034A159265DE731C432B',
    source_type: 'scholarly_monograph_chapter'
  },
  atwood: {
    title: 'The Empire of the Great Khan: The Yuan Ulus, 1260–1368',
    author: 'Christopher P. Atwood',
    institution: 'Cambridge University Press / The Cambridge History of the Mongol Empire',
    year: 2024,
    url: 'https://www.cambridge.org/core/books/abs/cambridge-history-of-the-mongol-empire/empire-of-the-great-khan/41EEE744E9D3545E7111DC25B77C33F2',
    source_type: 'scholarly_reference_chapter'
  }
});

const DECISIONS = Object.freeze({
  '94dc0003-495b-58e6-abec-48860ee6d710': {
    expected_person: 'Kublai Khan',
    expected_polity: 'Mongol Empire',
    expected_start: 1260,
    expected_end: 1271,
    expected_role: 'Khagan',
    disposition: 'KEEP_AS_OVERARCHING_IMPERIAL_CLAIM_CONTEXT',
    proposed_relation_type: 'claims_rule',
    runtime_direct_territory_from_this_relation: false,
    basis: 'Qubilai took/claimed the Great Khan title in 1260 and continued to assert universal Grand Qan sovereignty, but scholarship explicitly distinguishes that claim from his restricted administrative authority over his own eastern domains. The Mongol Empire row therefore must not render the whole former empire as his direct controlled territory.'
  },
  '418d957a-1658-51a6-8b35-71757f712760': {
    expected_person: 'Kublai Khan',
    expected_polity: 'Yuan Dynasty',
    expected_start: 1260,
    expected_end: 1294,
    expected_role: 'Khagan and emperor',
    disposition: 'RETIRE_BACKPROJECTED_COMPETING_SPAN',
    proposed_relation_type: null,
    runtime_direct_territory_from_this_relation: false,
    basis: 'The combined row back-projects the Great Yuan dynastic designation and emperor role before the end-of-1271 proclamation. The reviewed 1260–1271 Mongol-imperial claim row and 1271–1294 Yuan ruling row preserve the distinct meanings more accurately.'
  },
  'd82b82dc-e263-5116-ae62-888452bc2655': {
    expected_person: 'Kublai Khan',
    expected_polity: 'Yuan Dynasty',
    expected_start: 1271,
    expected_end: 1294,
    expected_role: 'Emperor and Khagan',
    disposition: 'KEEP_AS_YUAN_RULING_PHASE',
    proposed_relation_type: 'rules',
    runtime_direct_territory_from_this_relation: true,
    basis: 'At the end of 1271 Qubilai proclaimed that his government in China would be called Great Yuan. This row begins at the defensible Yuan dynastic boundary and can carry the direct ruling relation, subject to time-dependent Yuan Territory records.'
  }
});

const rows = [];
for (const [activityId, decision] of Object.entries(DECISIONS)) {
  const row = byId.get(activityId);
  if (!row) throw new Error(`reviewed Kublai Activity missing: ${activityId}`);
  const actual = {
    person: row.person?.canonical ?? null,
    polity: row.polity?.canonical ?? null,
    start: row.activity?.start_year ?? null,
    end: row.activity?.end_year ?? null,
    role: row.activity?.role ?? null
  };
  if (
    actual.person !== decision.expected_person ||
    actual.polity !== decision.expected_polity ||
    actual.start !== decision.expected_start ||
    actual.end !== decision.expected_end ||
    actual.role !== decision.expected_role
  ) {
    throw new Error(`Kublai target drift ${activityId}: ${JSON.stringify(actual)}`);
  }
  if (decision.proposed_relation_type && !RELATION_CODES.has(decision.proposed_relation_type)) {
    throw new Error(`Kublai decision uses relation outside Stage 2 contract: ${decision.proposed_relation_type}`);
  }
  rows.push({
    activity_id: activityId,
    person: actual.person,
    current_polity: actual.polity,
    current_start_year: actual.start,
    current_end_year: actual.end,
    current_role: actual.role,
    old_audit_decision: row.audit?.decision ?? null,
    old_dependencies: row.audit?.dependencies ?? [],
    ...decision,
    source_keys: ['mote', 'allsen', 'atwood']
  });
}

if (rows.length !== 3) throw new Error(`expected three Kublai reviewed rows, got ${rows.length}`);
if (rows.filter((r) => r.disposition.startsWith('KEEP_')).length !== 2) throw new Error('expected two Kublai keeper phases');
if (rows.filter((r) => r.disposition.startsWith('RETIRE_')).length !== 1) throw new Error('expected one Kublai competing row retirement');

const mongolClaim = rows.find((r) => r.current_polity === 'Mongol Empire');
const yuanKeeper = rows.find((r) => r.disposition === 'KEEP_AS_YUAN_RULING_PHASE');
if (mongolClaim?.proposed_relation_type !== 'claims_rule') throw new Error('Mongol Empire Kublai relation must be claims_rule');
if (yuanKeeper?.proposed_relation_type !== 'rules') throw new Error('Yuan keeper relation must be rules');

const summary = {
  schema: 'atlas-kublai-authority-decisions-summary/v1',
  baseline_relationships: ledger.rows.length,
  reviewed_kublai_rows: rows.length,
  retained_rows: 2,
  retire_competing_rows: 1,
  unresolved_person_polity_authority_semantics_rows: 0,
  mongol_empire_relation: 'claims_rule',
  yuan_1271_relation: 'rules',
  pre_1271_direct_territory_reconstruction_still_required: true,
  fabricated_pre_yuan_polity_created: false,
  production_mutation_performed: false,
  conclusion: 'KUBLAI_PERSON_ACTIVITY_AUTHORITY_SEMANTICS_CLOSED_PRE_1271_TERRITORY_REMAINS_AUTHORING_RESEARCH'
};

const payload = {
  schema: 'atlas-kublai-authority-decisions/v1',
  status: 'SOURCE_BACKED_AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  historical_facts: [
    'Qubilai took the Great Khan title in 1260.',
    'The Toluid civil war and Chinggisid fragmentation meant the Great Khan universal claim was not equivalent to unitary administrative control over the entire former Mongol Empire.',
    'Scholarship states that Qubilai continued to assert Grand Qan sovereignty while his administrative authority was restricted to his own domains.',
    'At the end of 1271 Qubilai proclaimed that his government in China would be called Great Yuan.'
  ],
  atlas_inference: {
    mongol_empire_activity_is_claim_context_not_direct_territory: true,
    combined_1260_1294_yuan_row_is_backprojection: true,
    yuan_direct_ruling_phase_starts_at_reviewed_1271_boundary: true,
    no_pre_1271_direct_geometry_without_separate_territory_research: true
  },
  sources: SOURCES,
  summary,
  rows
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
