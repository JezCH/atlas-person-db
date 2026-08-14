import assert from 'node:assert/strict';
import { rehearseP7Split } from './lib/rehearse-stage2-p7-split.mjs';

const survivorId = 'b37993f9-df6c-52a6-b27a-ad931e3aa99e';
const restoredId = '2335619a-fe8a-59b7-b6c5-47d7a2c2f41b';
const rulesRelationId = '7ca4de8f-01d4-542c-acc1-a06848c6742c';
const reviewedSourceIds = new Set([
  '5cc21ee9-642c-5fac-92d1-500e65cfb67c',
  '8f333846-f0d9-596e-9a27-58df8a31c63f'
]);

await rehearseP7Split({
  planPath: 'stage2/execution/p7-lakshmibai-jhansi-split-execution.v1.json',
  sourceManifestPath: 'stage2/authoring/p7-lakshmibai-jhansi-sources.v1.json',
  marker: 'ATLAS_STAGE2_P7_LAKSHMIBAI_JHANSI_SPLIT_REHEARSAL_OK',
  verifyAfter: ({ actualRows, sourceLinks, baselineRow, operation }) => {
    const byId = new Map(actualRows.map((row) => [row.id, row]));
    const survivor = byId.get(survivorId);
    const restored = byId.get(restoredId);
    assert.ok(survivor);
    assert.ok(restored);

    for (const row of [survivor, restored]) {
      assert.equal(row.person_id, baselineRow.person_id);
      assert.equal(row.polity_id, baselineRow.polity_id);
      assert.equal(row.role_id, baselineRow.role_id);
      assert.equal(row.period_basis_id, baselineRow.period_basis_id);
      assert.equal(row.relation_type_id, rulesRelationId);
      assert.equal(row.chronology_status, 'reviewed_stage2_discontinuous_jhansi_rule');
    }

    assert.deepEqual([survivor.activity_start, survivor.activity_start_month, survivor.activity_start_day], [1853, null, null]);
    assert.equal(survivor.activity_start_granularity, 'year');
    assert.equal(survivor.activity_start_certainty, 'approximate');
    assert.deepEqual([survivor.activity_end, survivor.activity_end_month, survivor.activity_end_day], [1854, null, null]);
    assert.equal(survivor.activity_end_granularity, 'year');
    assert.equal(survivor.activity_end_certainty, 'exact');
    assert.equal(survivor.legacy_source_key, baselineRow.legacy_source_key);
    assert.equal(survivor.notes, operation.fragments[0].reviewed_notes);

    assert.deepEqual([restored.activity_start, restored.activity_start_month, restored.activity_start_day], [1857, 6, null]);
    assert.equal(restored.activity_start_granularity, 'month');
    assert.equal(restored.activity_start_certainty, 'exact');
    assert.deepEqual([restored.activity_end, restored.activity_end_month, restored.activity_end_day], [1858, null, null]);
    assert.equal(restored.activity_end_granularity, 'year');
    assert.equal(restored.activity_end_certainty, 'exact');
    assert.equal(restored.legacy_source_key, null);
    assert.equal(restored.notes, operation.fragments[1].reviewed_notes);

    assert.equal(sourceLinks.length, 6);
    for (const id of [survivorId, restoredId]) {
      const perActivity = sourceLinks.filter((row) => row.person_politics_id === id);
      assert.equal(perActivity.length, 3);
      for (const sourceId of reviewedSourceIds) {
        assert.equal(perActivity.some((row) => row.source_id === sourceId), true);
      }
    }
  }
});
