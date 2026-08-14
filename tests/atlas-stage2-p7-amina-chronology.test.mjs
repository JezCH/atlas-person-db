import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { readReviewedSourceAuthoringManifest } = require('../server/atlas-stage2-reviewed-source-authoring.js');
const root = path.resolve(new URL('..', import.meta.url).pathname);
const sourcePath = path.join(root, 'stage2/authoring/p7-amina-chronology-sources.v1.json');
const planPath = path.join(root, 'stage2/execution/p7-amina-chronology-execution.v1.json');

test('Amina chronology keeps the traditional years only as approximate disputed reconstruction', () => {
  const { manifest: sources } = readReviewedSourceAuthoringManifest(sourcePath);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  const operation = plan.operations[0];

  assert.equal(sources.result.source_count, 1);
  assert.equal(sources.sources[0].row.id, '7fbfd522-8458-553d-a1d8-dbbc259e49de');
  assert.equal(sources.rules.source_locator_required_when_linked_to_activity_fragment, true);
  assert.equal(sources.rules.traditional_chronology_must_not_be_promoted_to_exact_fact, true);
  assert.equal(sources.rules.alternative_chronologies_must_remain_explicit, true);
  assert.equal(sources.rules.production_mutation_authorized, false);

  assert.equal(operation.activity_id, 'eed067d9-43f3-52dc-9ecc-d5ed540fe65b');
  assert.equal(operation.baseline_before.activity_start, 1576);
  assert.equal(operation.baseline_before.activity_end, 1610);
  assert.equal(operation.after.polity_id, operation.baseline_before.polity_id);
  assert.equal(operation.after.relation_type_id, '7ca4de8f-01d4-542c-acc1-a06848c6742c');
  assert.equal(operation.after.activity_start, 1576);
  assert.equal(operation.after.activity_end, 1610);
  assert.equal(operation.after.activity_start_detail.granularity, 'year');
  assert.equal(operation.after.activity_start_detail.certainty, 'approximate');
  assert.equal(operation.after.activity_start_detail.month, null);
  assert.equal(operation.after.activity_start_detail.day, null);
  assert.equal(operation.after.activity_end_detail.granularity, 'year');
  assert.equal(operation.after.activity_end_detail.certainty, 'approximate');
  assert.equal(operation.after.activity_end_detail.month, null);
  assert.equal(operation.after.activity_end_detail.day, null);
  assert.equal(operation.after.chronology_status, 'reviewed_stage2_traditional_disputed');
  assert.equal(operation.after.notes_policy, 'PRESERVE_EXACT_LIVE_NOTES');
  assert.equal(operation.after.add_source_links.length, 1);
  assert.equal(plan.result.traditional_year_values_changed, false);
  assert.equal(plan.result.alternative_chronologies_resolved, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
});
