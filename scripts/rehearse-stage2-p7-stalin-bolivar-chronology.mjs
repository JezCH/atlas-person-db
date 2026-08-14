import assert from 'node:assert/strict';
import { rehearseP7SingleRewrite } from './lib/rehearse-stage2-p7-single-rewrite.mjs';

const sourceManifestPath='stage2/authoring/p7-stalin-bolivar-chronology-sources.v1.json';

await rehearseP7SingleRewrite({
  planPath:'stage2/execution/p7-stalin-chronology-execution.v1.json',
  sourceManifestPath,
  marker:'ATLAS_STAGE2_P7_STALIN_CHRONOLOGY_REHEARSAL_OK',
  verifyAfter:({actual,sourceLinks,baselineRow})=>{
    assert.equal(actual.person_id,baselineRow.person_id);
    assert.equal(actual.polity_id,baselineRow.polity_id);
    assert.equal(actual.role_id,baselineRow.role_id);
    assert.equal(actual.period_basis_id,baselineRow.period_basis_id);
    assert.equal(actual.relation_type_id,'7ca4de8f-01d4-542c-acc1-a06848c6742c');
    assert.equal(actual.activity_start,1924);
    assert.equal(actual.activity_start_month,null);
    assert.equal(actual.activity_start_day,null);
    assert.equal(actual.activity_start_granularity,'year');
    assert.equal(actual.activity_start_certainty,'approximate');
    assert.equal(actual.activity_start_calendar,'gregorian');
    assert.equal(actual.activity_end,1953);
    assert.equal(actual.activity_end_month,3);
    assert.equal(actual.activity_end_day,5);
    assert.equal(actual.activity_end_granularity,'day');
    assert.equal(actual.activity_end_certainty,'exact');
    assert.equal(actual.activity_end_calendar,'gregorian');
    assert.equal(actual.chronology_status,'reviewed_stage2_de_facto_leadership_approximate_start_exact_death');
    assert.equal(actual.legacy_source_key,baselineRow.legacy_source_key);
    assert.equal(sourceLinks.length,2);
    assert.deepEqual(new Set(sourceLinks.map(x=>x.source_id)),new Set(['a30be4b7-5a35-5781-8a41-eb6c1d836180','067f54f2-04ff-5b40-b2aa-54a4c51bee4b']));
  }
});

await rehearseP7SingleRewrite({
  planPath:'stage2/execution/p7-bolivar-bolivia-chronology-execution.v1.json',
  sourceManifestPath,
  marker:'ATLAS_STAGE2_P7_BOLIVAR_BOLIVIA_CHRONOLOGY_REHEARSAL_OK',
  verifyAfter:({actual,sourceLinks,baselineRow})=>{
    assert.equal(actual.person_id,baselineRow.person_id);
    assert.equal(actual.polity_id,baselineRow.polity_id);
    assert.equal(actual.role_id,baselineRow.role_id);
    assert.equal(actual.period_basis_id,baselineRow.period_basis_id);
    assert.equal(actual.relation_type_id,'7ca4de8f-01d4-542c-acc1-a06848c6742c');
    assert.equal(actual.activity_start,1825);
    assert.equal(actual.activity_start_month,null);
    assert.equal(actual.activity_start_day,null);
    assert.equal(actual.activity_start_granularity,'year');
    assert.equal(actual.activity_start_certainty,'exact');
    assert.equal(actual.activity_start_calendar,'gregorian');
    assert.equal(actual.activity_end,1825);
    assert.equal(actual.activity_end_month,12);
    assert.equal(actual.activity_end_day,29);
    assert.equal(actual.activity_end_granularity,'day');
    assert.equal(actual.activity_end_certainty,'exact');
    assert.equal(actual.activity_end_calendar,'gregorian');
    assert.equal(actual.chronology_status,'reviewed_stage2_bolivia_1825_delegation_end');
    assert.equal(actual.legacy_source_key,baselineRow.legacy_source_key);
    assert.equal(sourceLinks.length,2);
    assert.deepEqual(new Set(sourceLinks.map(x=>x.source_id)),new Set(['6ab43c8c-2d16-526a-8a2f-8159877becfe','597d13f4-c609-51ea-820d-780fc19b0fca']));
  }
});

console.log(JSON.stringify({marker:'ATLAS_STAGE2_P7_STALIN_BOLIVAR_CHRONOLOGY_BATCH_OK',activity_targets:2,chronology_corrections:2,production_mutation_authorized:false,production_or_vercel_contacted:false},null,2));
