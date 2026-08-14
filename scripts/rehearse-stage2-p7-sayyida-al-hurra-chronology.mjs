import assert from 'node:assert/strict';
import { rehearseP7SingleRewrite } from './lib/rehearse-stage2-p7-single-rewrite.mjs';

await rehearseP7SingleRewrite({
  planPath: 'stage2/execution/p7-sayyida-al-hurra-chronology-execution.v1.json',
  sourceManifestPath: 'stage2/authoring/p7-sayyida-al-hurra-chronology-sources.v1.json',
  marker: 'ATLAS_STAGE2_P7_SAYYIDA_AL_HURRA_CHRONOLOGY_REHEARSAL_OK',
  verifyAfter: ({ actual, sourceLinks, baselineRow, operation }) => {
    assert.equal(actual.person_id, baselineRow.person_id);
    assert.equal(actual.polity_id, baselineRow.polity_id);
    assert.equal(actual.role_id, baselineRow.role_id);
    assert.equal(actual.period_basis_id, baselineRow.period_basis_id);
    assert.equal(actual.relation_type_id, '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6');
    assert.equal(actual.activity_start, 1519);
    assert.equal(actual.activity_start_month, null);
    assert.equal(actual.activity_start_day, null);
    assert.equal(actual.activity_start_granularity, 'year');
    assert.equal(actual.activity_start_certainty, 'exact');
    assert.equal(actual.activity_start_calendar, 'unspecified_historical');
    assert.equal(actual.activity_end, 1542);
    assert.equal(actual.activity_end_month, null);
    assert.equal(actual.activity_end_day, null);
    assert.equal(actual.activity_end_granularity, 'year');
    assert.equal(actual.activity_end_certainty, 'exact');
    assert.equal(actual.activity_end_calendar, 'unspecified_historical');
    assert.equal(actual.chronology_status, 'reviewed_stage2_phase');
    assert.equal(actual.notes, operation.after.reviewed_notes);
    const ids = new Set(sourceLinks.map((row) => row.source_id));
    assert.equal(ids.has('3d13ced6-1590-5076-b37e-68cd5ce72b10'), true);
    assert.equal(ids.has('d2c981a1-9d1d-55cf-a6e4-b0eb5b7d4f35'), true);
  }
});
