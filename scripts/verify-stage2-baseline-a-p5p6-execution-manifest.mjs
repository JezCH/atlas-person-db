import fs from 'node:fs';
const [ledgerPath, intakePath, manifestPath] = process.argv.slice(2);
if (!ledgerPath || !intakePath || !manifestPath) throw new Error('usage: node verify <ledger> <intake> <manifest>');
const ledger = JSON.parse(fs.readFileSync(ledgerPath,'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath,'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const expectedDigest='sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment='ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if (manifest?.schema !== 'atlas-stage2-baseline-a-p5p6-execution-manifest/v2') throw new Error('manifest schema drift');
if (manifest.status !== 'P3_P4_CLOSED_P5_P6_PREPRODUCTION_EXECUTION_PLAN_NO_PRODUCTION_MUTATION') throw new Error('manifest status drift');
if (manifest.production_execution_authorized !== false || manifest.summary?.production_mutation_authorized !== false) throw new Error('Production execution must remain forbidden');
if (ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest || manifest.derived_from?.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline digest drift');
if (ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment || manifest.derived_from?.baseline?.deployment_sha !== expectedDeployment) throw new Error('deployment SHA drift');
const expected={p4_decided_activity_count:49,p4_unresolved_identity_count:0,p3_polity_relation_decision_count:14,p3_polity_relation_unresolved_count:0,p3_reviewed_polity_relation_assertion_count:10,p3_polity_relation_activity_correction_count:12,p3_polity_relation_p4_overlap_count:4,correction_v2_activity_count:57,p4_new_polity_target_count:15,p3_relation_new_polity_class_count:11,additional_p3_relation_new_polity_target_count:9,new_polity_target_count:24,existing_p4_target_binding_count:46,unique_existing_p4_target_polity_uuids:26,merge_reconciliation_count:7,entity_migration_count:3};
for (const [key,value] of Object.entries(expected)) if (Number(manifest.summary?.[key]) !== value) throw new Error(`${key} drift ${manifest.summary?.[key]} != ${value}`);
if (Number(ledger.summary?.p3_polity_relation_decisions_applied) !== 14 || Number(ledger.summary?.p3_polity_relation_decisions_unresolved) !== 0 || Number(ledger.summary?.dependency_counts?.polity_relation_model || 0) !== 0) throw new Error('ledger P3 relation closure drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0) throw new Error('ledger P4 identity closure drift');
if (!Array.isArray(manifest.correction_activities) || manifest.correction_activities.length !== 57 || new Set(manifest.correction_activities.map((row)=>row.activity_id)).size !== 57) throw new Error('Correction v2 Activity coverage drift');
for (const activity of manifest.correction_activities) if (!activity.p5_p6_dependencies?.includes('CORRECTION_V2') || !Array.isArray(activity.required_later_actions) || activity.required_later_actions.length === 0) throw new Error(`${activity.activity_id}: invalid Correction v2 handoff`);
if (!Array.isArray(manifest.new_polity_targets) || manifest.new_polity_targets.length !== 24 || new Set(manifest.new_polity_targets.map((row)=>row.identity_class)).size !== 24 || manifest.new_polity_targets.some((row)=>row.target_polity_uuid !== null)) throw new Error('new Polity authoring frontier drift');
if (!Array.isArray(manifest.polity_relation_decisions) || manifest.polity_relation_decisions.length !== 14) throw new Error('Polity relation decision manifest coverage drift');
if (!Array.isArray(manifest.polity_relation_assertions) || manifest.polity_relation_assertions.length !== 10) throw new Error('Polity relation assertion manifest coverage drift');
const baselinePolities=new Set((intake.identity_catalogs?.polities||[]).map((row)=>row.id));
for (const assertion of manifest.polity_relation_assertions) {
  for (const endpoint of [assertion.subject, assertion.object]) {
    if (endpoint.kind==='existing_polity' && !baselinePolities.has(endpoint.polity_uuid)) throw new Error(`relation endpoint absent from Baseline A ${endpoint.polity_uuid}`);
    if (endpoint.kind==='new_polity' && (endpoint.polity_uuid !== null || !manifest.new_polity_targets.some((target)=>target.identity_class===endpoint.identity_class))) throw new Error(`invalid new relation endpoint ${endpoint.identity_class}`);
  }
  if (!assertion.source_contract || !fs.existsSync(assertion.source_contract)) throw new Error(`${assertion.decision_id}: source contract missing`);
}
console.log(JSON.stringify({marker:'ATLAS_BASELINE_A_P5P6_EXECUTION_MANIFEST_V2_OK', p3_relation_decisions:14, p4_identity_decisions:49, correction_v2_activities:57, new_polity_targets:24, polity_relation_assertions:10, production_mutation_authorized:false}, null, 2));
