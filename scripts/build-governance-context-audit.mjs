import fs from 'node:fs';
import path from 'node:path';
import { governanceTypes } from './stage2-domain-contract.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/governance-context-audit.json');
const summaryPath = arg('--summary', 'artifacts/governance-context-audit-summary.json');
if (!ledgerPath) throw new Error('--ledger is required');

const GOVERNANCE_TYPES = new Set(governanceTypes);
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger.schema !== 'atlas-polity-semantic-master-ledger/v1') {
  throw new Error(`unexpected ledger schema: ${ledger.schema}`);
}
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 346) {
  throw new Error(`unexpected master ledger baseline: ${ledger.rows?.length}`);
}

const byId = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (byId.size !== 346) throw new Error(`duplicate activity UUID in master ledger: ${byId.size}`);

const OLD_SIGNAL_RECONCILIATION = Object.freeze({
  'bdf8e440-7388-5dc3-a225-5884f65a86e5': {
    expected_person: 'Huang Chao',
    expected_polity: 'Great Qi',
    classification: 'FALSE_POSITIVE_VALID_POLITY',
    governance_required: false,
    basis: 'Great Qi is explicitly retained as a short-lived territorial rebel Polity. The word “regime” in explanatory prose must not turn it into governance metadata.'
  },
  '2b566bc6-600a-5a75-bf32-60fe3e558bcd': {
    expected_person: 'Oda Nobunaga',
    expected_polity: 'Oda Clan',
    classification: 'NOT_GOVERNANCE_LINEAGE_CONTEXT',
    governance_required: false,
    basis: 'Oda Clan is lineage/house context. The unresolved problem is the defensible territorial/political authority and period, not conversion of the clan into a government entity.'
  },
  '61bf1687-9815-5844-9f98-02a558470b51': {
    expected_person: 'Toyotomi Hideyoshi',
    expected_polity: 'Toyotomi Regime',
    classification: 'GOVERNANCE_CONTEXT_REQUIRED_POLITY_RESEARCH',
    governance_required: true,
    proposed_governance_context: 'Toyotomi Regime',
    proposed_governance_type: 'governing_regime',
    basis: 'The current pseudo-Polity is explicitly a regime. Preserve that identity as governance context while the pre/post-unification Polity and chronology are researched.'
  },
  '7bd5741a-6b37-5b33-9512-40741e01b179': {
    expected_person: 'Toyotomi Hideyoshi',
    expected_polity: 'Japan',
    classification: 'GOVERNANCE_CONTEXT_APPLIES_AFTER_SPLIT',
    governance_required: true,
    proposed_governance_context: 'Toyotomi Regime',
    proposed_governance_type: 'governing_regime',
    basis: 'Japan may be the map-level Polity in a defensible later phase, while Toyotomi Regime remains governance context. The 1582-1598 row is too coarse and remains split/research work.'
  },
  '7981dd26-4200-57d9-b4d4-bbd97f13e28f': {
    expected_person: 'Harriet Tubman',
    expected_polity: 'United States',
    classification: 'NOT_PRIMARY_GOVERNANCE_RELATION_SPLIT',
    governance_required: false,
    basis: 'The reviewed correction is temporal Person-Polity relation decomposition: opposes, serves, and active_in. No governance entity is required to express that distinction.'
  },
  '7a89364b-dacf-5798-9a6d-dd312cbbee4d': {
    expected_person: 'Mahatma Gandhi',
    expected_polity: 'British Raj',
    classification: 'NOT_PRIMARY_GOVERNANCE_RELATION_AND_POLITY_REVIEW',
    governance_required: false,
    basis: 'The current row crosses colonial and independent political contexts and needs relation, chronology, and dependent-polity review. A governance layer alone would not solve the error.'
  },
  '4ac4c38c-6d8b-55ce-b999-b0639e67eb22': {
    expected_person: 'Charles de Gaulle',
    expected_polity: 'French Fifth Republic',
    classification: 'GOVERNANCE_CONTEXT_REQUIRED_RELINK',
    governance_required: true,
    proposed_governance_context: 'French Fifth Republic',
    proposed_governance_type: 'constitutional_regime',
    proposed_polity_target: 'France / French Republic (final identity policy pending)',
    basis: 'The Fifth Republic is a constitutional regime, while de Gaulle’s Person Activity belongs to the France/French Republic Polity identity.'
  }
});

const ADDITIONAL_REVIEWED_CASES = Object.freeze({
  'cf0e606a-7f93-5154-93b7-0b3b29a4650a': {
    expected_person: 'Niccolo Machiavelli',
    expected_polity: 'Republic of Florence',
    classification: 'GOVERNANCE_PHASE_MODEL_REQUIRED',
    governance_required: true,
    basis: 'The continuous 1498-1527 row crosses republican government and Medici restoration. Polity continuity and Person relation phases must be split while governance history preserves the governing-order change.'
  },
  '7c315e1c-90c3-5199-a292-8f68ba69d4b2': {
    expected_person: 'Tokugawa Ieyasu',
    expected_polity: 'Tokugawa Shogunate',
    classification: 'GOVERNANCE_CONTEXT_TRUE_LAYERED_AUTHORITY_UNRESOLVED',
    governance_required: true,
    proposed_governance_context: 'Tokugawa Shogunate',
    proposed_governance_type: 'government',
    basis: 'The shogunate is a government/authority structure, but final Japan/bakufu/domain Polity hierarchy remains unresolved.'
  },
  '79dc9310-cd56-5bed-9a35-fe5361bdf0b6': {
    expected_person: 'Tokugawa Ieyasu',
    expected_polity: 'Tokugawa Shogunate',
    classification: 'GOVERNANCE_CONTEXT_TRUE_LAYERED_AUTHORITY_UNRESOLVED',
    governance_required: true,
    proposed_governance_context: 'Tokugawa Shogunate',
    proposed_governance_type: 'government',
    basis: 'The compressed 1603-1616 row competes with cleaner phases, but the shogunate’s governance identity remains real regardless of the final Activity split.'
  },
  '400c78d5-a7e1-5ddb-83ef-91e0193db0f8': {
    expected_person: 'Tokugawa Ieyasu',
    expected_polity: 'Tokugawa Shogunate',
    classification: 'GOVERNANCE_CONTEXT_TRUE_LAYERED_AUTHORITY_UNRESOLVED',
    governance_required: true,
    proposed_governance_context: 'Tokugawa Shogunate',
    proposed_governance_type: 'government',
    basis: 'Retired de facto authority is a distinct Person relation phase; governance context is still Tokugawa Shogunate while the map-level authority hierarchy remains research work.'
  }
});

for (const decision of [...Object.values(OLD_SIGNAL_RECONCILIATION), ...Object.values(ADDITIONAL_REVIEWED_CASES)]) {
  if (decision.proposed_governance_type && !GOVERNANCE_TYPES.has(decision.proposed_governance_type)) {
    throw new Error(`reviewed governance decision uses type outside Stage 2 contract: ${decision.proposed_governance_type}`);
  }
}

const oldSignalRows = ledger.rows.filter((r) => r.audit?.dependencies?.includes('governance_context'));
const oldSignalIds = new Set(oldSignalRows.map((r) => r.activity_id));
const expectedOldIds = new Set(Object.keys(OLD_SIGNAL_RECONCILIATION));

if (oldSignalIds.size !== 7) throw new Error(`old governance signal baseline drift: ${oldSignalIds.size}`);
for (const id of oldSignalIds) {
  if (!expectedOldIds.has(id)) throw new Error(`unreconciled old governance signal UUID: ${id}`);
}
for (const id of expectedOldIds) {
  if (!oldSignalIds.has(id)) throw new Error(`expected old governance signal disappeared: ${id}`);
}

function materialize(id, decision, source) {
  const row = byId.get(id);
  if (!row) throw new Error(`reviewed governance Activity UUID missing: ${id}`);
  if (row.person?.canonical !== decision.expected_person) {
    throw new Error(`person drift for ${id}: ${row.person?.canonical}`);
  }
  if (row.polity?.canonical !== decision.expected_polity) {
    throw new Error(`polity drift for ${id}: ${row.polity?.canonical}`);
  }
  return {
    activity_id: id,
    person: row.person.canonical,
    polity: row.polity.canonical,
    start_year: row.activity?.start_year ?? null,
    end_year: row.activity?.end_year ?? null,
    role: row.activity?.role ?? null,
    audit_decision: row.audit?.decision ?? null,
    old_governance_signal: oldSignalIds.has(id),
    source,
    ...decision
  };
}

const oldReconciliation = Object.entries(OLD_SIGNAL_RECONCILIATION)
  .map(([id, decision]) => materialize(id, decision, 'OLD_DEPENDENCY_SIGNAL_RECONCILIATION'));
const additional = Object.entries(ADDITIONAL_REVIEWED_CASES)
  .map(([id, decision]) => materialize(id, decision, 'ADDITIONAL_REVIEWED_GOVERNANCE_CASE'));

const trueOld = oldReconciliation.filter((r) => r.governance_required);
const falseOld = oldReconciliation.filter((r) => !r.governance_required);
const trueAdditional = additional.filter((r) => r.governance_required);

const summary = {
  schema: 'atlas-governance-context-audit-summary/v1',
  baseline_relationships: ledger.rows.length,
  old_dependency_signal_rows: oldReconciliation.length,
  old_signal_governance_required: trueOld.length,
  old_signal_false_or_not_primary: falseOld.length,
  additional_reviewed_governance_cases: additional.length,
  additional_governance_required: trueAdditional.length,
  explicit_governance_relevant_rows: trueOld.length + trueAdditional.length,
  conclusion: 'OLD_REGEX_DEPENDENCY_IS_PLANNING_SIGNAL_NOT_SCHEMA_GROUND_TRUTH'
};

if (summary.old_dependency_signal_rows !== 7) throw new Error('expected seven old governance signals');
if (summary.old_signal_governance_required !== 3) throw new Error(`expected three true old governance signals, got ${summary.old_signal_governance_required}`);
if (summary.old_signal_false_or_not_primary !== 4) throw new Error(`expected four false/not-primary old signals, got ${summary.old_signal_false_or_not_primary}`);
if (summary.additional_reviewed_governance_cases !== 4 || summary.additional_governance_required !== 4) {
  throw new Error(`unexpected additional governance review count: ${summary.additional_reviewed_governance_cases}/${summary.additional_governance_required}`);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify({
  schema: 'atlas-governance-context-audit/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  contract: {
    entity: 'GovernanceContext',
    primary_link: 'Polity + temporal interval -> GovernanceContext',
    activity_direct_link: 'DEFERRED_OPTIONAL_ONLY_IF_LAYERED_AUTHORITY_REQUIRES',
    initial_types: governanceTypes
  },
  summary,
  old_signal_reconciliation: oldReconciliation,
  additional_reviewed_cases: additional
}, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
