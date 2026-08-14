import fs from 'node:fs';

const [ledgerPath, intakePath, decisionsPath] = process.argv.slice(2);
if (!ledgerPath || !intakePath || !decisionsPath) throw new Error('usage: node verify <ledger> <intake> <decisions>');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if (ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest || decisions.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline digest drift');
if (ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment || decisions.baseline?.deployment_sha !== expectedDeployment) throw new Error('deployment SHA drift');
if (Number(ledger.summary?.p3_polity_relation_dependency_total) !== 14 || Number(ledger.summary?.p3_polity_relation_decisions_applied) !== 14 || Number(ledger.summary?.p3_polity_relation_decisions_unresolved) !== 0) throw new Error('P3 Polity relation closure summary drift');
if (Number(ledger.summary?.p3_polity_relation_assertions_reviewed) !== 10 || Number(ledger.summary?.p3_polity_relation_new_polity_classes) !== 11 || Number(ledger.summary?.p3_polity_relation_activity_corrections_required) !== 12) throw new Error('P3 Polity relation handoff count drift');
if (Number(ledger.summary?.dependency_counts?.polity_relation_model || 0) !== 0) throw new Error('polity_relation_model remains in ledger');

const expectedIds = new Set((decisions.decisions || []).map((decision) => decision.activity_id));
const rows = ledger.rows.filter((row) => row.audit?.polity_relation_decision?.status === 'P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING');
if (expectedIds.size !== 14 || rows.length !== 14) throw new Error('Polity relation decision coverage drift');
for (const row of rows) {
  if (!expectedIds.has(row.activity_id)) throw new Error(`unexpected relation decision Activity ${row.activity_id}`);
  if ((row.audit?.dependencies || []).includes('polity_relation_model')) throw new Error(`${row.activity_id}: relation blocker resurfaced`);
  const overlay = row.audit.polity_relation_decision;
  if (overlay.production_mutation_authorized !== false || !overlay.source_contract || !fs.existsSync(overlay.source_contract)) throw new Error(`${row.activity_id}: invalid relation decision overlay`);
}

const p4NewClasses = new Set();
for (const row of ledger.rows) {
  const p4 = row.audit?.polity_identity_decision;
  if (!p4) continue;
  if (p4.target_disposition === 'NEW_POLITY_REQUIRED') p4NewClasses.add(p4.target_identity_class);
  for (const target of p4.split_targets || []) if (target.target_disposition === 'NEW_POLITY_REQUIRED') p4NewClasses.add(target.identity_class);
}
if (p4NewClasses.size !== 15) throw new Error(`P4 new Polity target drift ${p4NewClasses.size}`);
const relationNewClasses = new Set(rows.flatMap((row) => (row.audit.polity_relation_decision.new_polity_targets || []).map((target) => target.identity_class)));
const additional = [...relationNewClasses].filter((identityClass) => !p4NewClasses.has(identityClass));
if (relationNewClasses.size !== 11 || additional.length !== 9) throw new Error(`relation authoring frontier drift relation=${relationNewClasses.size} additional=${additional.length}`);
const combined = new Set([...p4NewClasses, ...relationNewClasses]);
if (combined.size !== 24) throw new Error(`combined P5 new Polity frontier drift ${combined.size}`);

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_RELATION_CLOSURE_OK',
  decisions_applied: 14,
  unresolved: 0,
  relation_assertions_reviewed: 10,
  p4_new_polity_classes: 15,
  additional_relation_new_polity_classes: 9,
  combined_new_polity_classes: 24,
  production_mutation_authorized: false
}, null, 2));
