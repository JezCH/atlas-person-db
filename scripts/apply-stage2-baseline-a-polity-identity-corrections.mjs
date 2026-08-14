import fs from 'node:fs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ledgerPath = arg('--ledger');
const intakePath = arg('--intake');
const correctionsPath = arg('--corrections', 'stage2/integration/baseline-a-polity-identity-corrections.v1.json');
if (!ledgerPath || !intakePath) throw new Error('missing --ledger/--intake');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const corrections = JSON.parse(fs.readFileSync(correctionsPath, 'utf8'));

const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported intake schema');
if (corrections?.schema !== 'atlas-stage2-baseline-a-polity-identity-corrections/v1') throw new Error('unsupported correction schema');
if (corrections.status !== 'P4_IDENTITY_CORRECTION_NO_PRODUCTION_MUTATION') throw new Error('unexpected correction status');
if (corrections.production_mutation_authorized !== false) throw new Error('correction must remain non-mutating');
if (intake.baseline_digest !== expectedDigest || ledger.baseline?.baseline_digest !== expectedDigest || corrections.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline digest drift');
if (intake.deployment_sha !== expectedDeployment || ledger.baseline?.deployment_sha !== expectedDeployment || corrections.baseline?.deployment_sha !== expectedDeployment) throw new Error('Baseline deployment drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 48 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 1) throw new Error('correction must run after batch 5');
if (!Array.isArray(corrections.corrections) || corrections.corrections.length !== 1) throw new Error('expected one P4 correction');

const activityById = new Map((intake.activity_rows || []).map((row) => [row.activity_id, row]));
const polityById = new Map((intake.identity_catalogs?.polities || []).map((row) => [row.id, row]));
const ledgerById = new Map((ledger.rows || []).map((row) => [row.activity_id, row]));

const correction = corrections.corrections[0];
if (correction.id !== 'sun_ce_split_target_stable_sun_wu_correction') throw new Error('unexpected correction id');
if (!fs.existsSync(correction.source_contract)) throw new Error(`missing correction source contract ${correction.source_contract}`);

const sunCeActivity = activityById.get(correction.activity_id);
const sunCeRow = ledgerById.get(correction.activity_id);
if (!sunCeActivity || !sunCeRow) throw new Error('Sun Ce exact Activity missing');
if (sunCeActivity.person_id !== correction.person_id || sunCeRow.person?.uuid !== correction.person_id) throw new Error('Sun Ce Person UUID drift');
if (sunCeActivity.person_name_en !== correction.person || sunCeRow.person?.canonical !== correction.person) throw new Error('Sun Ce canonical drift');

const current = sunCeRow.audit?.polity_identity_decision;
if (!current || current.id !== correction.supersedes_decision_id) throw new Error('Sun Ce prior P4 decision missing');
if (current.status !== 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING') throw new Error('Sun Ce prior P4 decision status drift');
if (current.execution_kind !== 'POLITY_SPLIT_TARGET_AUTHORING_PENDING') throw new Error('Sun Ce expected prior authoring-pending execution kind');
if (!Array.isArray(current.split_targets) || current.split_targets.length !== 2) throw new Error('Sun Ce prior split target drift');
const priorNew = current.split_targets.find((t) => t?.target_disposition === 'NEW_POLITY_REQUIRED');
if (!priorNew || priorNew.polity_uuid !== null || priorNew.identity_class !== 'SUN_CE_JIANGDONG_POLITICAL_ACTOR') throw new Error('Sun Ce superseded new-polity target drift');

const easternHan = '3a29a08a-d111-50d5-916f-f5c11b5eabaf';
const stableSunWu = '8768ce4f-26fe-5de9-a501-c19525461fdb';
const easternWuCatalog = polityById.get(stableSunWu);
if (!easternWuCatalog || easternWuCatalog.canonical_key !== 'Eastern Wu') throw new Error('stable Sun-Wu Baseline UUID drift');
const easternWuRefs = (intake.activity_rows || []).filter((row) => row.polity_id === stableSunWu);
if (easternWuRefs.length !== 1 || easternWuRefs[0].person_name_en !== 'Sun Quan') throw new Error('stable Sun-Wu survivor evidence drift');

const corrected = correction.corrected_decision;
if (corrected.target_polity_uuid !== easternHan || corrected.target_disposition !== 'KEEP_DISTINCT') throw new Error('Sun Ce corrected primary target drift');
if (!Array.isArray(corrected.split_targets) || corrected.split_targets.length !== 2) throw new Error('Sun Ce corrected split target drift');
if (!corrected.split_targets.some((t) => t.target_disposition === 'REUSE_CURRENT_UUID' && t.polity_uuid === easternHan && t.relation === 'serves')) throw new Error('Sun Ce Eastern Han split missing');
if (!corrected.split_targets.some((t) => t.target_disposition === 'REUSE_CURRENT_UUID' && t.polity_uuid === stableSunWu && t.relation === 'rules')) throw new Error('Sun Ce stable Sun-Wu split missing');

sunCeRow.audit.superseded_polity_identity_decision = structuredClone(current);
sunCeRow.audit.polity_identity_decision = {
  id: current.id,
  correction_id: correction.id,
  batch_id: current.batch_id,
  batch_sequence: current.batch_sequence,
  status: 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING',
  reviewed_decision: corrected.reviewed_decision,
  target_disposition: corrected.target_disposition,
  target_polity_uuid: corrected.target_polity_uuid,
  target_identity_class: corrected.target_identity_class,
  execution_kind: corrected.execution_kind,
  source_contract: correction.source_contract,
  required_later_actions: [...corrected.required_later_actions],
  p5_p6_dependencies: [...corrected.p5_p6_dependencies],
  split_targets: corrected.split_targets,
  production_mutation_authorized: false
};

ledger.summary.p4_polity_identity_corrections_applied = Number(ledger.summary.p4_polity_identity_corrections_applied || 0) + 1;
const generated = ledger.generated_from.polity_identity_corrections;
ledger.generated_from.polity_identity_corrections = Array.isArray(generated)
  ? [...generated, correctionsPath]
  : generated ? [generated, correctionsPath] : [correctionsPath];

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_CORRECTION_APPLIED',
  correction_id: correction.id,
  activity_id: correction.activity_id,
  stable_sun_wu_uuid: stableSunWu,
  p4_polity_identity_decisions_applied: ledger.summary.p4_polity_identity_decisions_applied,
  p4_polity_identity_decisions_unresolved: ledger.summary.p4_polity_identity_decisions_unresolved,
  production_mutation_authorized: false
}, null, 2));
