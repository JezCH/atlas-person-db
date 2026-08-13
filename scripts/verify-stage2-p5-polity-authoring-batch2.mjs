import fs from 'node:fs';

const [manifestPath, batch1Path, batch2Path] = process.argv.slice(2);
if (!manifestPath || !batch1Path || !batch2Path) throw new Error('usage: node verify <p5p6-manifest> <batch1> <batch2>');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const batch1 = JSON.parse(fs.readFileSync(batch1Path, 'utf8'));
const batch2 = JSON.parse(fs.readFileSync(batch2Path, 'utf8'));
if (manifest?.schema !== 'atlas-stage2-baseline-a-p5p6-execution-manifest/v2') throw new Error('P5/P6 manifest v2 required');
if (batch1?.schema !== 'atlas-stage2-p5-polity-authoring-package/v1' || batch2?.schema !== 'atlas-stage2-p5-polity-authoring-package/v1') throw new Error('unsupported P5 authoring package schema');
if (batch2.batch_id !== 'p5_polity_authoring_batch2_historical_and_editorial_polities') throw new Error('unexpected Batch 2 id');
if (batch2.status !== 'REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION') throw new Error('unexpected Batch 2 status');
if (batch2.rules?.uuid_is_identity !== true || batch2.rules?.polity_uuid_must_remain_null_until_authoring !== true || batch2.rules?.name_only_binding_forbidden !== true || batch2.rules?.production_mutation_authorized !== false) throw new Error('Batch 2 safety rules missing');

const expectedBatch2 = new Set([
  'ARVERNI_POLITICAL_ACTOR','EARLY_NORTHERN_RUS_AUTHORITY','HEROD_ANTIPAS_GALILEE_TETRARCHY','HUAINAN_POLITICAL_ACTOR_UNDER_YING_BU','LI_KEYONG_POST907_JIN_POLITICAL_ACTOR','ODA_NOBUNAGA_SOURCE_BACKED_TERRITORIAL_POLITICAL_ACTOR','UESUGI_KENSHIN_SOURCE_BACKED_TERRITORIAL_POLITICAL_ACTOR','SOURCE_BACKED_EASTERN_ZHEJIANG_REGIONAL_POLITY','SOURCE_BACKED_HOLLAND_POLITICAL_AUTHORITY_FROM_1572','SOURCE_BACKED_ZEELAND_POLITICAL_AUTHORITY_FROM_1572'
]);
const expectedRemaining = new Set([
  'AUTONOMOUS_NON_TREATY_HUNKPAPA_LAKOTA_POLITICAL_FOLLOWING','POUNDMAKER_OWN_BAND_POLITICAL_COMMUNITY','RED_PHEASANT_BAND_POLITICAL_COMMUNITY','SOURCE_BACKED_MAPUCHE_WARTIME_COALITION_OR_AGGREGATION','SPECIFIC_POCATELLO_LED_BAND_POLITICAL_ACTOR'
]);
const manifestTargets = new Set((manifest.new_polity_targets || []).map((target) => target.identity_class));
if (manifestTargets.size !== 24) throw new Error(`authoritative new Polity frontier drift ${manifestTargets.size}`);
const p4DecisionIds = new Set((manifest.correction_activities || []).map((row) => row.p4_identity_decision?.id).filter(Boolean));
const relationDecisionIds = new Set((manifest.polity_relation_decisions || []).map((row) => row.decision?.id).filter(Boolean));
const batch1Targets = new Set((batch1.targets || []).map((target) => target.identity_class));
const batch2Targets = new Set();
const kinds = { historical_attested: 0, historiographic_conventional: 0, editorial_catalog_label: 0 };
const labels = new Set();
for (const target of batch2.targets || []) {
  if (!expectedBatch2.has(target.identity_class) || batch2Targets.has(target.identity_class)) throw new Error(`unexpected/duplicate Batch 2 target ${target.identity_class}`);
  batch2Targets.add(target.identity_class);
  if (!manifestTargets.has(target.identity_class)) throw new Error(`${target.identity_class}: absent from authoritative P5/P6 frontier`);
  if (target.polity_uuid !== null || target.baseline_absence_verified !== true) throw new Error(`${target.identity_class}: UUID must remain unassigned before P5 authoring`);
  if (target.polity_type !== 'historical_polity' || target.historicity !== 'historical') throw new Error(`${target.identity_class}: current Polity type/historicity contract drift`);
  if (target.locale !== 'en' || !Object.hasOwn(kinds, target.semantic_name_kind)) throw new Error(`${target.identity_class}: invalid semantic name kind`);
  kinds[target.semantic_name_kind] += 1;
  if (!target.proposed_catalog_label || labels.has(target.proposed_catalog_label)) throw new Error(`${target.identity_class}: missing/duplicate proposed catalog label`);
  labels.add(target.proposed_catalog_label);
  if (!target.source_contract || !fs.existsSync(target.source_contract)) throw new Error(`${target.identity_class}: source contract missing`);
  if (target.identity_decision_id && !p4DecisionIds.has(target.identity_decision_id)) throw new Error(`${target.identity_class}: P4 identity decision linkage missing`);
  if (target.relation_decision_id && !relationDecisionIds.has(target.relation_decision_id)) throw new Error(`${target.identity_class}: P3 relation decision linkage missing`);
  if (!target.identity_decision_id && !target.relation_decision_id) throw new Error(`${target.identity_class}: no reviewed decision linkage`);
  if (target.territory_geometry_status !== 'P14_DEFERRED') throw new Error(`${target.identity_class}: territory/geometry must remain P14-deferred`);
  if (target.semantic_name_kind === 'historical_attested' && target.historical_name_claim !== true) throw new Error(`${target.identity_class}: historical-attested name must explicitly carry the name claim`);
  if (target.semantic_name_kind !== 'historical_attested' && target.historical_name_claim !== false) throw new Error(`${target.identity_class}: conventional/editorial label cannot claim attested self-designation`);
}
if (batch2Targets.size !== 10) throw new Error(`Batch 2 target count drift ${batch2Targets.size}`);
if (kinds.historical_attested !== 1 || kinds.historiographic_conventional !== 3 || kinds.editorial_catalog_label !== 6) throw new Error(`Batch 2 semantic-name distribution drift ${JSON.stringify(kinds)}`);
const rurik = batch2.targets.find((target) => target.identity_class === 'EARLY_NORTHERN_RUS_AUTHORITY');
if (!rurik || rurik.chronology_status !== 'TRADITIONAL_RETROSPECTIVE_UNCERTAIN') throw new Error('Rurik chronology uncertainty must remain explicit');
for (const identityClass of batch2Targets) if (batch1Targets.has(identityClass)) throw new Error(`Batch 1/2 overlap ${identityClass}`);
const prepared = new Set([...batch1Targets, ...batch2Targets]);
if (batch1Targets.size !== 9 || prepared.size !== 19) throw new Error(`prepared P5 Polity frontier drift batch1=${batch1Targets.size} union=${prepared.size}`);
const remaining = new Set([...manifestTargets].filter((identityClass) => !prepared.has(identityClass)));
if (remaining.size !== expectedRemaining.size || [...expectedRemaining].some((identityClass) => !remaining.has(identityClass))) throw new Error(`remaining P5 Polity frontier drift ${JSON.stringify([...remaining].sort())}`);
if (Number(batch2.result?.batch_target_count) !== 10 || Number(batch2.result?.prepared_total_after_batch) !== 19 || Number(batch2.result?.combined_manifest_new_polity_target_count) !== 24 || Number(batch2.result?.remaining_new_polity_targets_after_batch) !== 5 || Number(batch2.result?.uuid_assignments) !== 0 || batch2.result?.production_mutation_authorized !== false) throw new Error('Batch 2 result summary drift');

console.log(JSON.stringify({marker:'ATLAS_P5_POLITY_AUTHORING_BATCH2_OK',batch2_prepared:10,prepared_total:19,remaining:5,remaining_identity_classes:[...remaining].sort(),semantic_name_kinds:kinds,uuid_assignments:0,production_mutation_authorized:false}, null, 2));
