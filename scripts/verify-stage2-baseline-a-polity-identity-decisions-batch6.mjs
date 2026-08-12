import fs from 'node:fs';

const [intakePath, ledgerPath, decisionsPath] = process.argv.slice(2);
if (!intakePath || !ledgerPath || !decisionsPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-decisions-batch6.mjs <intake> <ledger> <decisions>');
}

const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));

const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported Baseline A intake schema');
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported Baseline A ledger schema');
if (decisions?.schema !== 'atlas-stage2-baseline-a-polity-identity-decisions/v1') throw new Error('unsupported Polity identity decision schema');
if (decisions.status !== 'P4_POLITY_IDENTITY_HANDOFF_PARTIAL_NO_PRODUCTION_MUTATION') throw new Error('unexpected P4 handoff status');
if (decisions.closure_status !== 'P4_POLITY_IDENTITY_DECISIONS_COMPLETE_BRANCH_ONLY') throw new Error('missing final P4 closure marker');
if (intake.baseline_digest !== expectedDigest || ledger.baseline?.baseline_digest !== expectedDigest || decisions.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline digest drift');
if (intake.deployment_sha !== expectedDeployment || ledger.baseline?.deployment_sha !== expectedDeployment || decisions.baseline?.deployment_sha !== expectedDeployment) throw new Error('Baseline deployment drift');
if (Number(intake.row_count) !== 338 || ledger.rows?.length !== 338 || Number(decisions.baseline?.activity_count) !== 338) throw new Error('Baseline Activity count drift');
if (decisions.batch?.id !== 'p4_polity_identity_batch_6_shi_xie_final_closure' || Number(decisions.batch?.sequence) !== 6) throw new Error('unexpected batch 6 identity');
if (Number(decisions.batch?.applied_before_batch) !== 48 || Number(decisions.batch?.expected_applied_after_batch) !== 49) throw new Error('batch 6 counters drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 48 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 1) throw new Error('batch 6 must run after batch 5');
if (Number(ledger.summary?.p4_polity_identity_corrections_applied) !== 1) throw new Error('Sun Ce continuity correction must run before batch 6');

const sourceContractPath = 'research/china/stage2-sun-ce-sun-quan-wu-continuity.v1.json';
if (!fs.existsSync(sourceContractPath)) throw new Error('Sun-Wu continuity contract missing');
const continuity = JSON.parse(fs.readFileSync(sourceContractPath, 'utf8'));
if (continuity?.schema !== 'atlas-stage2-sun-ce-sun-quan-wu-continuity-research/v1' || continuity.status !== 'RESEARCH_REVIEWED_NO_PRODUCTION_WRITE') throw new Error('invalid Sun-Wu continuity contract');
if (continuity.baseline?.baseline_digest !== expectedDigest || continuity.baseline?.deployment_sha !== expectedDeployment) throw new Error('Sun-Wu continuity Baseline drift');
if (continuity.identity_decision?.stable_single_polity !== true || continuity.identity_decision?.technical_survivor_uuid !== '8768ce4f-26fe-5de9-a501-c19525461fdb') throw new Error('Sun-Wu stable identity contract drift');
if (continuity.identity_decision?.canonical_label_backprojection_before_formal_wu_forbidden !== true) throw new Error('Sun-Wu label backprojection guard missing');
if (continuity.invariants?.production_mutation_authorized !== false) throw new Error('Sun-Wu contract must remain non-mutating');

const activityById = new Map((intake.activity_rows || []).map((row) => [row.activity_id, row]));
const ledgerById = new Map((ledger.rows || []).map((row) => [row.activity_id, row]));
const polityById = new Map((intake.identity_catalogs?.polities || []).map((row) => [row.id, row]));

const sunCe = ledgerById.get('4c91cb84-5e53-5bcf-a4d6-d82a8a0c903f');
const correctedSunCe = sunCe?.audit?.polity_identity_decision;
if (!correctedSunCe || correctedSunCe.correction_id !== 'sun_ce_split_target_stable_sun_wu_correction') throw new Error('Sun Ce correction not present in ledger');
if (correctedSunCe.execution_kind !== 'POLITY_SEMANTIC_CORRECTION_PENDING') throw new Error('Sun Ce corrected execution kind drift');
if (!correctedSunCe.split_targets?.some((t) => t.polity_uuid === '8768ce4f-26fe-5de9-a501-c19525461fdb' && t.relation === 'rules')) throw new Error('Sun Ce stable Sun-Wu binding missing');

if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 1) throw new Error('batch 6 must contain exactly one decision');
const decision = decisions.decisions[0];
if (decision.id !== 'shi_xie_jiaozhou_governance_split_han_stable_sun_wu') throw new Error('unexpected Shi Xie decision id');
if (decision.source_contract !== sourceContractPath) throw new Error('Shi Xie source contract drift');
if (decision.target_disposition !== 'REPLACE_WITH_GOVERNANCE' || decision.target_polity_uuid !== null) throw new Error('Shi Xie Jiaozhou disposition drift');
if (decision.target_identity_class !== 'JIAOZHOU_ADMINISTRATIVE_JURISDICTION_GOVERNANCE_CONTEXT') throw new Error('Shi Xie governance identity class drift');

const activity = activityById.get(decision.activity_id);
const row = ledgerById.get(decision.activity_id);
if (!activity || !row) throw new Error('Shi Xie exact Activity missing');
if (activity.person_id !== decision.person_id || row.person?.uuid !== decision.person_id || activity.person_name_en !== decision.person) throw new Error('Shi Xie Person binding drift');
if (activity.polity_id !== decision.current_polity?.uuid || row.polity?.uuid !== decision.current_polity?.uuid) throw new Error('Shi Xie current Polity UUID drift');
if (activity.polity_canonical_key !== 'Jiaozhou' || row.polity?.canonical !== 'Jiaozhou') throw new Error('Shi Xie Jiaozhou canonical drift');
if (!(row.audit?.dependencies || []).includes('polity_identity_model') || row.audit?.execution_class !== 'BLOCKED_POLITY_IDENTITY') throw new Error('Shi Xie must be sole unresolved P4 blocker');

const easternHan = '3a29a08a-d111-50d5-916f-f5c11b5eabaf';
const stableSunWu = '8768ce4f-26fe-5de9-a501-c19525461fdb';
if (polityById.get(easternHan)?.canonical_key !== 'Eastern Han') throw new Error('Eastern Han Baseline UUID drift');
if (polityById.get(stableSunWu)?.canonical_key !== 'Eastern Wu') throw new Error('stable Sun-Wu Baseline UUID drift');
if (!Array.isArray(decision.split_targets) || decision.split_targets.length !== 2) throw new Error('Shi Xie split target count drift');
if (!decision.split_targets.some((t) => t.target_disposition === 'REUSE_CURRENT_UUID' && t.polity_uuid === easternHan && t.relation === 'serves')) throw new Error('Shi Xie pre-210 Eastern Han target missing');
if (!decision.split_targets.some((t) => t.target_disposition === 'REUSE_CURRENT_UUID' && t.polity_uuid === stableSunWu && t.relation === 'serves')) throw new Error('Shi Xie post-210 stable Sun-Wu target missing');
if (!decision.chronology_policy?.includes('210')) throw new Error('Shi Xie 210 transition policy missing');
if (!Array.isArray(decision.required_later_actions) || decision.required_later_actions.length === 0) throw new Error('Shi Xie downstream actions missing');
if (!Array.isArray(decision.p5_p6_dependencies) || !decision.p5_p6_dependencies.includes('GOVERNANCE_CONTEXT') || !decision.p5_p6_dependencies.includes('CORRECTION_V2')) throw new Error('Shi Xie downstream dependency handoff incomplete');

const unresolved = ledger.rows.filter((r) => (r.audit?.dependencies || []).includes('polity_identity_model')).map((r) => r.activity_id);
if (unresolved.length !== 1 || unresolved[0] !== decision.activity_id) throw new Error(`batch 6 must close sole remaining P4 blocker; got ${JSON.stringify(unresolved)}`);

const result = decisions.result || {};
if (Number(result.decisions_recorded) !== 1 || Number(result.activity_dependencies_applied_before_batch) !== 48 || Number(result.activity_dependencies_applied_after_batch) !== 49 || Number(result.activity_dependencies_remaining_after_batch) !== 0) throw new Error('batch 6 result counters drift');
if (Number(result.replace_with_governance_decisions_in_this_batch) !== 1 || Number(result.new_polities_required_in_this_batch) !== 0) throw new Error('batch 6 disposition counters drift');
if (result.production_mutation_authorized !== false || decisions.rules?.production_mutation_authorized !== false) throw new Error('batch 6 must remain non-mutating');

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_BATCH6_OK',
  baseline_digest: expectedDigest,
  decisions_verified: 1,
  applied_before_batch: 48,
  applied_after_batch: 49,
  dependencies_remaining_after_batch: 0,
  stable_sun_wu_uuid: stableSunWu,
  production_mutation_authorized: false
}, null, 2));
