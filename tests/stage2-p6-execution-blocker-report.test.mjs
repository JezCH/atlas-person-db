import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('P6 execution blocker report covers the complete effective prebinding activity frontier', () => {
  execFileSync(process.execPath, ['scripts/build-stage2-p6-execution-blocker-report.mjs'], { cwd: root, stdio: 'pipe' });
  const report = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/stage2-p6-execution-blockers.json'), 'utf8'));
  assert.equal(report.summary.prebinding_batches, 18);
  assert.equal(report.summary.unique_activity_ids_seen, 54);
  assert.equal(report.summary.already_execution_planned_activities, 9);
  console.log(`P6_EXECUTION_BLOCKERS batches=${report.summary.batches_with_branch_blockers} blockers=${report.summary.branch_blocker_count}`);
  for (const batch of report.batches.filter((item) => item.branch_blockers.length)) {
    console.log(`P6_BLOCKED_BATCH ${batch.batch}: ${batch.branch_blockers.map((item) => `${item.code}@${item.pointer}`).join(', ')}`);
  }
});
