import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const p9 = require('../server/atlas-stage2-p9-db-cutover.js');
const roles = require('../server/atlas-stage2-reviewed-role-authoring.js');

test('historical P9 DB identity evidence exactly matches canonical v2 dimensions', () => {
  const sql = p9.CREATE_SQL.toLowerCase();
  for (const token of [
    'person_id','polity_id','relation_type_id','role_id','period_basis_id',
    'activity_start_month','activity_start_day','activity_start_granularity','activity_start_calendar',
    'activity_end_month','activity_end_day','activity_end_granularity','activity_end_calendar',
    'nulls not distinct'
  ]) assert.match(sql, new RegExp(token));
  assert.doesNotMatch(sql, /activity_start_certainty|activity_end_certainty/);
  assert.equal(p9.OLD_INDEX, 'person_politics_v2_null_role_semantic_uidx');
  assert.equal(p9.NEW_INDEX, 'person_politics_v2_stage2_semantic_identity_uq');
});

test('historical reviewed role prerequisite remains exact-row evidence and never self-authorizing', () => {
  const manifest = roles.readManifest();
  assert.equal(manifest.rules.production_mutation_authorized, false);
  assert.equal(manifest.roles.length, 1);
  assert.equal(manifest.roles[0].role.id, 'c48b2b1b-ff24-54ec-ba48-d2e00db0872d');
});

test('historical Train 2 plan builder still deterministically reconstructs reviewed release evidence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-train2-history-'));
  execFileSync(process.execPath, ['scripts/build-stage2-train2-correction-plan-list.mjs', dir], { stdio:'ignore' });
  const plan = JSON.parse(fs.readFileSync(path.join(dir, 'plan-list.json'), 'utf8'));
  assert.equal(plan.p6_reviewed_plans, 18);
  assert.ok(plan.p6_execution_units >= 18);
  assert.ok(plan.p7_plan_files >= 20);
  assert.equal(plan.total_execution_units, plan.p6_execution_units + plan.p7_plan_files);
});
