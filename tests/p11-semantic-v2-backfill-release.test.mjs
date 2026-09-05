import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/atlas-p11-semantic-v2-backfill.yml'), 'utf8');
const release = JSON.parse(fs.readFileSync(path.join(root, 'stage2/releases/p11-semantic-v2-backfill-release.v1.json'), 'utf8'));
const exceptions = JSON.parse(fs.readFileSync(path.join(root, 'stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json'), 'utf8'));

test('P11 semantic-v2 backfill release is exact-SHA, current-delta-safe, Baseline-B-scoped, dry-run-first, and non-destructive', () => {
  assert.equal(release.status, 'APPROVED_FOR_EXACT_SHA_PRODUCTION_CORRECTION_WORKFLOW');
  assert.equal(release.execution_request, 'p11-semantic-v2-current-production-delta-20260906');
  assert.deepEqual(release.expected, {
    blocking_semantic_v2_incomplete_after: 0
  });
  assert.equal(release.rules.current_production_delta_only, true);
  assert.equal(release.rules.fixed_prebackfill_row_count_forbidden, true);
  assert.equal(release.rules.strict_live_exception_filter_matches_baseline_b, true);
  assert.equal(release.rules.reviewed_relation_exceptions_are_not_mutation_targets_when_temporally_complete, true);
  assert.equal(release.rules.exact_production_sha_required, true);
  assert.equal(release.rules.read_only_inventory_before_apply_required, true);
  assert.equal(release.rules.dry_run_before_each_apply_required, true);
  assert.equal(release.rules.generic_relation_default_forbidden, true);
  assert.equal(release.rules.runtime_compile_override_writeback_forbidden, true);
  assert.equal(release.rules.territory_geometry_mutation_forbidden, true);
  assert.equal(release.rules.physical_person_merge_forbidden, true);

  assert.equal(exceptions.exceptions.length, 23);
  assert.equal(new Set(exceptions.exceptions.map((row) => row.activity_id)).size, 23);
  assert.equal(exceptions.rules.exception_scope, 'relation_type_id_only');
  assert.equal(exceptions.rules.temporal_boundary_metadata_must_be_complete, true);
  assert.equal(exceptions.rules.unknown_incomplete_activity_outside_this_list_blocks_p11, true);
  assert.equal(exceptions.summary.declared_exception_ids, 23);
  assert.equal(exceptions.summary.additional_reviewed_unresolved_relations, 3);
  const spartacus = exceptions.exceptions.find((row) => row.activity_id === '6c7e0f1c-d843-4b8a-a436-fad247840b31');
  assert.ok(spartacus);
  assert.match(spartacus.reason, /SPARTACUS_PRIMARY_POLITY_INTENTIONALLY_NULL/);

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /push:\s*\n\s*branches:\s*\n\s*- main/);
  assert.match(workflow, /stage2\/releases\/p11-semantic-v2-backfill-release\.v1\.json/);
  assert.match(workflow, /stage2\/contracts\/p11-reviewed-semantic-v2-exceptions\.v1\.json/);
  assert.match(workflow, /scripts\/build-p11-semantic-v2-backfill-execution\.mjs/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /mode:\"full_stage2_baseline\"/);
  assert.match(workflow, /for mode in dry_run apply/);
  assert.match(workflow, /--chunk-size 100/);
  assert.equal(workflow.includes('--data-binary "@${payload_file}"'), true);
  assert.equal(workflow.includes('--data "$payload"'), false);
  assert.match(workflow, /\/tmp\/atlas-p11-backfill\/requests/);
  assert.equal(workflow.includes('.operation_count == .blocking_semantic_v2_incomplete_before'), true);
  assert.equal(workflow.includes('.audit_semantic_v2_incomplete_before == (.semantic_v2_incomplete_before + .baseline_b_transport_exempt_before)'), true);
  assert.equal(workflow.includes('$transport_exempt_ids == ($summary[0].baseline_b_transport_exempt_ids_before | sort)'), true);
  assert.equal(workflow.includes('($baseline_incomplete | length) == $summary[0].reviewed_relation_exceptions_expected_after'), true);
  assert.equal(workflow.includes('.semantic_v2_breakdown.null_counts.relation_type_id == $summary[0].reviewed_relation_exceptions_expected_after'), true);
  assert.doesNotMatch(workflow, /semantic_v2_incomplete == 301/);
  assert.doesNotMatch(workflow, /semantic_v2_incomplete == 21/);
  assert.doesNotMatch(workflow, /null_counts\.relation_type_id == 21/);
  assert.doesNotMatch(workflow, /atlas-person-merge/i);
});
