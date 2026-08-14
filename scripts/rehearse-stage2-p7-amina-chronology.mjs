import assert from 'node:assert/strict';
import { rehearseP7SingleRewrite } from './lib/rehearse-stage2-p7-single-rewrite.mjs';

await rehearseP7SingleRewrite({
  planPath: 'stage2/execution/p7-amina-chronology-execution.v1.json',
  sourceManifestPath: 'stage2/authoring/p7-amina-chronology-sources.v1.json',
  marker: 'ATLAS_STAGE2_P7_AMINA_CHRONOLOGY_REHEARSAL_OK',
  verifyAfter: ({ actual, sourceLinks, baselineRow }) => {
    assert.equal(actual.person_id, baselineRow.person_id);
    assert.equal(actual.polity_id, baselineRow.polity_id);
    assert.equal(actual.role_id, baselineRow.role_id);
    assert.equal(actual.period_basis_id, baselineRow.period_basis_id);
    assert.equal(actual.relation_type_id, '7ca4de8f-01d4-542c-acc1-a06848c6742c');
    assert.equal(actual.activity_start, 1576);
    assert.equal(actual.activity_start_month, null);
    assert.equal(actual.activity_start_day, null);
    assert.equal(actual.activity_start_granularity, 'year');
    assert.equal(actual.activity_start_certainty, 'approximate');
    assert.equal(actual.activity_start_calendar, 'unspecified_historical');
    assert.equal(actual.activity_end, 1610);
    assert.equal(actual.activity_end_month, null);
    assert.equal(actual.activity_end_day, null);
    assert.equal(actual.activity_end_granularity, 'year');
    assert.equal(actual.activity_end_certainty, 'approximate');
    assert.equal(actual.activity_end_calendar, 'unspecified_historical');
    assert.equal(actual.chronology_status, 'reviewed_stage2_traditional_disputed');
    assert.equal(actual.notes, baselineRow.notes);
    const ids = new Set(sourceLinks.map((row) => row.source_id));
    assert.equal(ids.has('7fbfd522-8458-553d-a1d8-dbbc259e49de'), true);
  }
});
