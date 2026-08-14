import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readReviewedSourceAuthoringManifest } = require('../server/atlas-stage2-reviewed-source-authoring.js');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const sourcePath = path.join(root, 'stage2/authoring/p7-gandhi-phase-sources.v1.json');
const planPath = path.join(root, 'stage2/execution/p7-gandhi-independence-split-execution.v1.json');

test('Gandhi split removes British Raj overhang and preserves post-independence India activity', () => {
  const { manifest: sources } = readReviewedSourceAuthoringManifest(sourcePath);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const operation = plan.operations[0];
  const [raj, india] = operation.fragments;

  assert.equal(sources.result.source_count, 2);
  assert.deepEqual(sources.sources.map((item) => item.row.id), [
    'd3a972b6-5bfd-5619-bd31-e1d6b30595f4',
    '052aeb06-5330-59dd-8bba-166597d44c3b'
  ]);
  assert.equal(sources.rules.independence_boundary_must_split_colonial_and_postcolonial_polity_context, true);
  assert.equal(sources.rules.production_mutation_authorized, false);

  assert.equal(operation.type, 'split_activity');
  assert.equal(operation.activity_id, '7a89364b-dacf-5798-9a6d-dd312cbbee4d');
  assert.equal(operation.baseline_before.polity_id, '82203ec1-60b7-5f5c-bab2-9b8df1fd8040');
  assert.equal(operation.baseline_before.activity_start, 1915);
  assert.equal(operation.baseline_before.activity_end, 1948);
  assert.equal(operation.fragments.length, 2);

  assert.equal(raj.survivor, true);
  assert.equal(raj.activity_id, operation.activity_id);
  assert.equal(raj.polity_id, '82203ec1-60b7-5f5c-bab2-9b8df1fd8040');
  assert.equal(raj.relation_type_id, '5d2d3af6-6e53-5af1-8423-f76c2263afe4');
  assert.deepEqual(raj.activity_end_detail, { year: 1947, month: 8, day: 14, granularity: 'day', certainty: 'exact', calendar: 'gregorian' });

  assert.equal(india.survivor, false);
  assert.equal(india.activity_id, 'b492adb3-afad-5f43-93a2-f42feaf72a65');
  assert.equal(india.polity_id, '00ec4b0c-6002-5791-825c-43465632102d');
  assert.equal(india.relation_type_id, 'f33d2789-2e65-50c1-af3e-91335bcbd3ca');
  assert.equal(india.legacy_source_key, null);
  assert.deepEqual(india.activity_start_detail, { year: 1947, month: 8, day: 15, granularity: 'day', certainty: 'exact', calendar: 'gregorian' });
  assert.deepEqual(india.activity_end_detail, { year: 1948, month: 1, day: 30, granularity: 'day', certainty: 'exact', calendar: 'gregorian' });
  assert.equal(operation.gap_overlap_policy, 'BRITISH_RAJ_FRAGMENT_ENDS_1947_08_14_AND_INDIA_FRAGMENT_STARTS_1947_08_15_NO_COLONIAL_OVERHANG');
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
});
