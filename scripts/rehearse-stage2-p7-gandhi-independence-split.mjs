import assert from 'node:assert/strict';
import { rehearseP7Split } from './lib/rehearse-stage2-p7-split.mjs';

const survivorId = '7a89364b-dacf-5798-9a6d-dd312cbbee4d';
const indiaId = 'b492adb3-afad-5f43-93a2-f42feaf72a65';

await rehearseP7Split({
  planPath: 'stage2/execution/p7-gandhi-independence-split-execution.v1.json',
  sourceManifestPath: 'stage2/authoring/p7-gandhi-phase-sources.v1.json',
  marker: 'ATLAS_STAGE2_P7_GANDHI_INDEPENDENCE_SPLIT_REHEARSAL_OK',
  verifyAfter: ({ actualRows, sourceLinks, baselineRow, operation }) => {
    const byId = new Map(actualRows.map((row) => [row.id, row]));
    const raj = byId.get(survivorId);
    const india = byId.get(indiaId);
    assert.ok(raj);
    assert.ok(india);
    for (const row of [raj, india]) {
      assert.equal(row.person_id, baselineRow.person_id);
      assert.equal(row.role_id, baselineRow.role_id);
      assert.equal(row.period_basis_id, baselineRow.period_basis_id);
      assert.equal(row.chronology_status, 'reviewed_stage2_phase');
    }
    assert.equal(raj.polity_id, baselineRow.polity_id);
    assert.equal(raj.relation_type_id, '5d2d3af6-6e53-5af1-8423-f76c2263afe4');
    assert.deepEqual([raj.activity_start, raj.activity_start_month, raj.activity_start_day], [1915, null, null]);
    assert.equal(raj.activity_start_granularity, 'year');
    assert.equal(raj.activity_start_certainty, 'exact');
    assert.deepEqual([raj.activity_end, raj.activity_end_month, raj.activity_end_day], [1947, 8, 14]);
    assert.equal(raj.activity_end_granularity, 'day');
    assert.equal(raj.activity_end_certainty, 'exact');
    assert.equal(raj.legacy_source_key, baselineRow.legacy_source_key);
    assert.equal(raj.notes, operation.fragments[0].reviewed_notes);

    assert.equal(india.polity_id, '00ec4b0c-6002-5791-825c-43465632102d');
    assert.equal(india.relation_type_id, 'f33d2789-2e65-50c1-af3e-91335bcbd3ca');
    assert.deepEqual([india.activity_start, india.activity_start_month, india.activity_start_day], [1947, 8, 15]);
    assert.deepEqual([india.activity_end, india.activity_end_month, india.activity_end_day], [1948, 1, 30]);
    assert.equal(india.activity_start_granularity, 'day');
    assert.equal(india.activity_end_granularity, 'day');
    assert.equal(india.activity_start_certainty, 'exact');
    assert.equal(india.activity_end_certainty, 'exact');
    assert.equal(india.legacy_source_key, null);
    assert.equal(india.notes, operation.fragments[1].reviewed_notes);

    assert.equal(sourceLinks.length, 6);
    for (const id of [survivorId, indiaId]) {
      const per = sourceLinks.filter((row) => row.person_politics_id === id);
      assert.equal(per.length, 3);
      assert.equal(per.some((row) => row.source_id === 'd3a972b6-5bfd-5619-bd31-e1d6b30595f4'), true);
      assert.equal(per.some((row) => row.source_id === '052aeb06-5330-59dd-8bba-166597d44c3b'), true);
    }
  }
});
