import fs from 'node:fs';

const [ledgerPath, intakePath] = process.argv.slice(2);
if (!ledgerPath || !intakePath) throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-closure.mjs <ledger> <intake>');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2' || intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported closure input schema');
if (ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest) throw new Error('closure Baseline digest drift');
if (ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment) throw new Error('closure deployment drift');
if (ledger.rows?.length !== 338) throw new Error('closure Activity count drift');

const identityDeps = ledger.rows.filter((row) => (row.audit?.dependencies || []).includes('polity_identity_model'));
if (identityDeps.length !== 0) throw new Error(`P4 closure still has unresolved polity_identity_model rows: ${identityDeps.map((r) => r.activity_id).join(',')}`);
if (Number(ledger.summary?.dependency_counts?.polity_identity_model || 0) !== 0) throw new Error('P4 closure summary still reports polity_identity_model');
if (Number(ledger.summary?.p4_polity_identity_dependency_total) !== 49) throw new Error('P4 closure total drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49) throw new Error('P4 closure applied count drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0) throw new Error('P4 closure unresolved count drift');
if (Number(ledger.summary?.p4_polity_identity_decided_execution_pending) !== 49) throw new Error('P4 closure execution-pending count drift');
if (Number(ledger.summary?.p4_polity_identity_corrections_applied) !== 1) throw new Error('P4 closure correction count drift');

const decidedRows = ledger.rows.filter((row) => row.audit?.polity_identity_decision?.status === 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING');
if (decidedRows.length !== 49) throw new Error(`P4 closure decided row count drift ${decidedRows.length}`);

const sunCe = decidedRows.find((row) => row.activity_id === '4c91cb84-5e53-5bcf-a4d6-d82a8a0c903f');
if (sunCe?.audit?.polity_identity_decision?.correction_id !== 'sun_ce_split_target_stable_sun_wu_correction') throw new Error('P4 closure lost Sun Ce continuity correction');
if (!sunCe.audit.polity_identity_decision.split_targets?.some((t) => t.polity_uuid === '8768ce4f-26fe-5de9-a501-c19525461fdb' && t.relation === 'rules')) throw new Error('P4 closure lost Sun Ce stable Sun-Wu target');

const shi = decidedRows.find((row) => row.activity_id === '4d543d48-a041-5f07-a900-560a50abaeee');
if (shi?.audit?.polity_identity_decision?.id !== 'shi_xie_jiaozhou_governance_split_han_stable_sun_wu') throw new Error('P4 closure lost Shi Xie final decision');
if (shi.audit.polity_identity_decision.target_disposition !== 'REPLACE_WITH_GOVERNANCE') throw new Error('P4 closure Shi Xie disposition drift');
if (!shi.audit.polity_identity_decision.split_targets?.some((t) => t.polity_uuid === '3a29a08a-d111-50d5-916f-f5c11b5eabaf' && t.relation === 'serves')) throw new Error('P4 closure Shi Xie Eastern Han target missing');
if (!shi.audit.polity_identity_decision.split_targets?.some((t) => t.polity_uuid === '8768ce4f-26fe-5de9-a501-c19525461fdb' && t.relation === 'serves')) throw new Error('P4 closure Shi Xie stable Sun-Wu target missing');

for (const row of decidedRows) {
  if (row.audit.polity_identity_decision.production_mutation_authorized !== false) throw new Error(`P4 closure contains production-authorized decision ${row.activity_id}`);
}

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_P4_POLITY_IDENTITY_CLOSED',
  baseline_digest: expectedDigest,
  polity_identity_dependency_total: 49,
  decisions_applied: 49,
  decisions_unresolved: 0,
  decided_execution_pending: 49,
  corrections_applied: 1,
  production_mutation_authorized: false
}, null, 2));
