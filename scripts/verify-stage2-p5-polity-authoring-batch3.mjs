import fs from 'node:fs';

const [manifestPath, batch1Path, batch2Path, batch3Path] = process.argv.slice(2);
if (!manifestPath || !batch1Path || !batch2Path || !batch3Path) throw new Error('usage: node verify <p5p6-manifest> <batch1> <batch2> <batch3>');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const batch1 = JSON.parse(fs.readFileSync(batch1Path, 'utf8'));
const batch2 = JSON.parse(fs.readFileSync(batch2Path, 'utf8'));
const batch3 = JSON.parse(fs.readFileSync(batch3Path, 'utf8'));
if (manifest?.schema !== 'atlas-stage2-baseline-a-p5p6-execution-manifest/v2') throw new Error('P5/P6 manifest v2 required');
for (const pkg of [batch1,batch2,batch3]) if (pkg?.schema !== 'atlas-stage2-p5-polity-authoring-package/v1' || pkg.status !== 'REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION') throw new Error('invalid P5 Polity authoring package');
if (batch3.batch_id !== 'p5_polity_authoring_batch3_community_and_coalition_boundaries') throw new Error('unexpected Batch 3 id');
if (batch3.rules?.broad_people_group_auto_promoted_to_polity !== false || batch3.rules?.people_affiliation_and_polity_identity_are_separate !== true || batch3.rules?.wartime_coalition_does_not_imply_unitary_people_polity !== true || batch3.rules?.production_mutation_authorized !== false) throw new Error('community boundary safety rules missing');

const expectedBatch3 = new Set([
  'AUTONOMOUS_NON_TREATY_HUNKPAPA_LAKOTA_POLITICAL_FOLLOWING','POUNDMAKER_OWN_BAND_POLITICAL_COMMUNITY','RED_PHEASANT_BAND_POLITICAL_COMMUNITY','SOURCE_BACKED_MAPUCHE_WARTIME_COALITION_OR_AGGREGATION','SPECIFIC_POCATELLO_LED_BAND_POLITICAL_ACTOR'
]);
const manifestTargets = new Set((manifest.new_polity_targets || []).map((target) => target.identity_class));
if (manifestTargets.size !== 24) throw new Error(`authoritative new Polity frontier drift ${manifestTargets.size}`);
const p4DecisionIds = new Set((manifest.correction_activities || []).map((row) => row.p4_identity_decision?.id).filter(Boolean));
const earlier = new Set([...(batch1.targets||[]).map((t)=>t.identity_class), ...(batch2.targets||[]).map((t)=>t.identity_class)]);
if (earlier.size !== 19) throw new Error(`Batch 1+2 prepared frontier drift ${earlier.size}`);
const seen = new Set();
const labels = new Set();
const forbiddenBroadLabels = new Set(['Lakota','Hunkpapa Lakota','Cree','Mapuche','Reche','Shoshone','Northwestern Shoshone']);
for (const target of batch3.targets || []) {
  if (!expectedBatch3.has(target.identity_class) || seen.has(target.identity_class)) throw new Error(`unexpected/duplicate Batch 3 target ${target.identity_class}`);
  seen.add(target.identity_class);
  if (!manifestTargets.has(target.identity_class)) throw new Error(`${target.identity_class}: absent from authoritative P5/P6 frontier`);
  if (earlier.has(target.identity_class)) throw new Error(`${target.identity_class}: overlaps earlier P5 package`);
  if (target.polity_uuid !== null || target.baseline_absence_verified !== true) throw new Error(`${target.identity_class}: UUID must remain unassigned`);
  if (target.polity_type !== 'historical_polity' || target.historicity !== 'historical') throw new Error(`${target.identity_class}: Polity type/historicity drift`);
  if (target.semantic_name_kind !== 'editorial_catalog_label' || target.historical_name_claim !== false) throw new Error(`${target.identity_class}: community/coalition names must remain explicit editorial labels`);
  if (!target.proposed_catalog_label || labels.has(target.proposed_catalog_label) || forbiddenBroadLabels.has(target.proposed_catalog_label)) throw new Error(`${target.identity_class}: invalid or broad PeopleGroup label`);
  labels.add(target.proposed_catalog_label);
  if (!target.people_group_context || target.broad_people_group_polity_rejected !== true || target.people_group_migration_required !== true) throw new Error(`${target.identity_class}: PeopleGroup separation missing`);
  if (!target.source_contract || !fs.existsSync(target.source_contract)) throw new Error(`${target.identity_class}: source contract missing`);
  if (!target.identity_decision_id || !p4DecisionIds.has(target.identity_decision_id)) throw new Error(`${target.identity_class}: P4 decision linkage missing`);
  if (!['rules','serves'].includes(target.person_relation)) throw new Error(`${target.identity_class}: reviewed Person relation missing`);
  if (!target.chronology_policy) throw new Error(`${target.identity_class}: chronology handoff missing`);
  if (target.territory_geometry_status !== 'P14_DEFERRED') throw new Error(`${target.identity_class}: geometry must remain P14-deferred`);
}
if (seen.size !== 5) throw new Error(`Batch 3 target count drift ${seen.size}`);
const leftraru = batch3.targets.find((target)=>target.identity_class==='SOURCE_BACKED_MAPUCHE_WARTIME_COALITION_OR_AGGREGATION');
if (!leftraru || leftraru.person_relation !== 'serves' || leftraru.historical_event_context_required !== true || leftraru.sovereign_head_of_unitary_people_claimed !== false) throw new Error('Leftraru coalition boundary drift');
const sittingBull = batch3.targets.find((target)=>target.identity_class==='AUTONOMOUS_NON_TREATY_HUNKPAPA_LAKOTA_POLITICAL_FOLLOWING');
if (!sittingBull || sittingBull.person_relation !== 'rules' || !String(sittingBull.chronology_policy).includes('start_unresolved')) throw new Error('Sitting Bull uncertainty boundary drift');
const redPheasant = batch3.targets.find((target)=>target.identity_class==='RED_PHEASANT_BAND_POLITICAL_COMMUNITY');
const poundmaker = batch3.targets.find((target)=>target.identity_class==='POUNDMAKER_OWN_BAND_POLITICAL_COMMUNITY');
if (!redPheasant || redPheasant.person_relation !== 'serves' || !poundmaker || poundmaker.person_relation !== 'rules') throw new Error('Poundmaker split relation drift');
const allPrepared = new Set([...earlier, ...seen]);
if (allPrepared.size !== 24 || [...manifestTargets].some((identityClass)=>!allPrepared.has(identityClass))) throw new Error('P5 Polity authoring frontier not fully covered');
if (Number(batch3.result?.batch_target_count) !== 5 || Number(batch3.result?.prepared_total_after_batch) !== 24 || Number(batch3.result?.combined_manifest_new_polity_target_count) !== 24 || Number(batch3.result?.remaining_new_polity_targets_after_batch) !== 0 || Number(batch3.result?.uuid_assignments) !== 0 || Number(batch3.result?.editorial_catalog_labels) !== 5 || Number(batch3.result?.people_group_contexts_separated) !== 5 || batch3.result?.production_mutation_authorized !== false) throw new Error('Batch 3 summary drift');

console.log(JSON.stringify({marker:'ATLAS_P5_POLITY_AUTHORING_BATCH3_OK',batch3_prepared:5,prepared_total:24,remaining:0,people_group_boundaries_separated:5,uuid_assignments:0,production_mutation_authorized:false}, null, 2));
