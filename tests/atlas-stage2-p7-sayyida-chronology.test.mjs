import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readReviewedSourceAuthoringManifest } = require('../server/atlas-stage2-reviewed-source-authoring.js');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const sourcePath = path.join(root, 'stage2/authoring/p7-sayyida-al-hurra-chronology-sources.v1.json');
const planPath = path.join(root, 'stage2/execution/p7-sayyida-al-hurra-chronology-execution.v1.json');

test('Sayyida al-Hurra chronology package is literal, source-backed, and preserves the pre-1519 phase as separate', () => {
  const { manifest: sources } = readReviewedSourceAuthoringManifest(sourcePath);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const operation = plan.operations[0];

  assert.equal(sources.result.source_count, 2);
  assert.deepEqual(sources.sources.map((item) => item.row.id), [
    '3d13ced6-1590-5076-b37e-68cd5ce72b10',
    'd2c981a1-9d1d-55cf-a6e4-b0eb5b7d4f35'
  ]);
  assert.equal(sources.rules.source_locator_required_when_linked_to_activity_fragment, true);
  assert.equal(sources.rules.pre_1519_informal_co_governance_must_not_be_silently_erased, true);
  assert.equal(sources.rules.production_mutation_authorized, false);

  assert.equal(plan.operations.length, 1);
  assert.equal(operation.type, 'rewrite_activity');
  assert.equal(operation.activity_id, '789bdf2e-5431-595c-a7a1-7f289b8cd4fd');
  assert.deepEqual(operation.baseline_before, {
    person_id: '6b6ab27c-6f68-55f7-ada4-4c9a4da7beb4',
    polity_id: '1186dd7c-a02f-54dd-8d95-893c51b07dfc',
    role_id: '6054cb1e-b47a-5ca7-b7d4-add9d7a2bc38',
    period_basis_id: '19bbe662-2a30-5a7e-8073-8d19e1e2299c',
    activity_start: 1515,
    activity_end: 1542,
    confidence: 'legacy_asserted',
    chronology_status: 'exact_as_recorded',
    legacy_source_key: 'pending-records-supplement-4.json:10:0444992bdaa4ec41',
    source_count: 1
  });
  assert.equal(operation.after.polity_id, operation.baseline_before.polity_id);
  assert.equal(operation.after.relation_type_id, '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6');
  assert.equal(operation.after.activity_start, 1519);
  assert.equal(operation.after.activity_end, 1542);
  assert.deepEqual(operation.after.activity_start_detail, { year: 1519, month: null, day: null, granularity: 'year', certainty: 'exact', calendar: 'unspecified_historical' });
  assert.deepEqual(operation.after.activity_end_detail, { year: 1542, month: null, day: null, granularity: 'year', certainty: 'exact', calendar: 'unspecified_historical' });
  assert.equal(operation.after.chronology_status, 'reviewed_stage2_phase');
  assert.equal(operation.after.notes_policy, 'REPLACE_WITH_REVIEWED_NOTES');
  assert.match(operation.after.reviewed_notes, /separate future Activity/i);
  assert.equal(operation.after.add_source_links.length, 2);
  assert.equal(plan.execution_rules.pre_1519_advisory_and_informal_co_governance_not_erased, true);
  assert.equal(plan.execution_rules.pre_1519_phase_is_separate_future_activity_candidate, true);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
});
