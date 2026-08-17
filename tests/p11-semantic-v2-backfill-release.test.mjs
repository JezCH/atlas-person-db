import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/atlas-p11-semantic-v2-backfill.yml'), 'utf8');
const release = JSON.parse(fs.readFileSync(path.join(root, 'stage2/releases/p11-semantic-v2-backfill-release.v1.json'), 'utf8'));
const exceptions = JSON.parse(fs.readFileSync(path.join(root, 'stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json'), 'utf8'));

test('P11 semantic-v2 backfill release is exact-SHA, dry-run-first, bounded, and non-destructive', () => {
  assert.equal(release.status, 'APPROVED_FOR_EXACT_SHA_PRODUCTION_CORRECTION_WORKFLOW');
  assert.equal(release.execution_request, 'p11-semantic-v2-backfill-oidc-retry-20260817');
  assert.deepEqual(release.expected, {
    semantic_v2_incomplete_before: 301,
    relation_missing_before: 259,
    relation_backfill_rows: 238,
    temporal_backfill_rows: 301,
    reviewed_relation_exceptions_live_after: 21,
    blocking_semantic_v2_incomplete_after: 0
  });
  assert.equal(release.rules.exact_production_sha_required, true);
  assert.equal(release.rules.read_only_inventory_before_apply_required, true);
  assert.equal(release.rules.dry_run_before_each_apply_required, true);
  assert.equal(release.rules.generic_relation_default_forbidden, true);
  assert.equal(release.rules.runtime_compile_override_writeback_forbidden, true);
  assert.equal(release.rules.territory_geometry_mutation_forbidden, true);
  assert.equal(release.rules.physical_person_merge_forbidden, true);

  assert.equal(exceptions.exceptions.length, 22);
  assert.equal(new Set(exceptions.exceptions.map((row) => row.activity_id)).size, 22);
  assert.equal(exceptions.rules.exception_scope, 'relation_type_id_only');
  assert.equal(exceptions.rules.temporal_boundary_metadata_must_be_complete, true);
  assert.equal(exceptions.rules.unknown_incomplete_activity_outside_this_list_blocks_p11, true);

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /stage2\/releases\/p11-semantic-v2-backfill-release\.v1\.json/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /mode:\"full_stage2_baseline\"/);
  assert.match(workflow, /for mode in dry_run apply/);
  assert.match(workflow, /--chunk-size 100/);
  assert.match(workflow, /semantic_v2_incomplete == 21/);
  assert.match(workflow, /null_counts\.relation_type_id == 21/);
  assert.doesNotMatch(workflow, /atlas-person-merge/i);
});
