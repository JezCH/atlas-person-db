import assert from 'node:assert/strict';
import { rehearseP7SingleRewrite } from './lib/rehearse-stage2-p7-single-rewrite.mjs';

await rehearseP7SingleRewrite({
  planPath: 'stage2/execution/p7-himiko-chronology-execution.v1.json',
  sourceManifestPath: 'stage2/authoring/p7-himiko-chronology-sources.v1.json',
  marker: 'ATLAS_STAGE2_P7_HIMIKO_CHRONOLOGY_REHEARSAL_OK',
  verifyAfter: ({ actual, sourceLinks, baselineRow }) => {
    assert.equal(actual.person_id, baselineRow.person_id);
    assert.equal(actual.polity_id, baselineRow.polity_id);
    assert.equal(actual.role_id, baselineRow.role_id);
    assert.equal(actual.period_basis_id, baselineRow.period_basis_id);
    assert.equal(actual.relation_type_id, '7ca4de8f-01d4-542c-acc1-a06848c6742c');
    assert.equal(actual.activity_start, 183);
    assert.equal(actual.activity_start_month, null);
    assert.equal(actual.activity_start_day, null);
    assert.equal(actual.activity_start_granularity, 'year');
    assert.equal(actual.activity_start_certainty, 'approximate');
    assert.equal(actual.activity_start_calendar, 'unspecified_historical');
    assert.equal(actual.activity_end, 248);
    assert.equal(actual.activity_end_month, null);
    assert.equal(actual.activity_end_day, null);
    assert.equal(actual.activity_end_granularity, 'year');
    assert.equal(actual.activity_end_certainty, 'approximate');
    assert.equal(actual.activity_end_calendar, 'unspecified_historical');
    assert.equal(actual.notes, baselineRow.notes);
    const ids = new Set(sourceLinks.map((row) => row.source_id));
    assert.equal(ids.has('63fa169b-cf86-5396-874e-8d0065d9a9a0'), true);
    assert.equal(ids.has('41f02eb1-f20c-5366-8f1a-170effabafce'), true);
  }
});
