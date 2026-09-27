import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/atlas-runtime-compile.yml',import.meta.url),'utf8');

test('Runtime publication follows canonical mutation workflows without dummy workflow-file pushes', () => {
  assert.match(workflow,/workflow_run:\s*\n\s*workflows:\s*\n\s*- ATLAS Authoring Apply\s*\n\s*- ATLAS Correction Apply/);
  assert.doesNotMatch(workflow,/paths:\s*\n\s*- ['"]?\.github\/workflows\/atlas-runtime-compile\.yml/);
  assert.match(workflow,/server\/atlas-runtime-compile-service\.js/);
  assert.match(workflow,/contracts\/runtime-projection-contract\.v1\.json/);
  assert.match(workflow,/workflow_dispatch:\s*\n/);
  assert.match(workflow,/workflow_dispatch is recovery-only/);
});

test('data-only publication reuses deployed Runtime code instead of demanding canonical SHA deployment', () => {
  assert.match(workflow,/__atlas_read_surface=runtime-identity/);
  assert.doesNotMatch(workflow,/ATLAS_AUTHORING_ENDPOINT/);
  assert.match(workflow,/require_exact_runtime=false/);
  assert.match(workflow,/if \[\[ "\$\{\{ github\.event_name \}\}" == "push" \]\]; then\s*\n\s*require_exact_runtime=true/);
  assert.match(workflow,/--arg runtime_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(workflow,/--arg authoring_sha "\$GITHUB_SHA"/);
  assert.match(workflow,/\.runtime_sha==\$runtime/);
  assert.match(workflow,/\.authoring_sha==\$authoring/);
});

test('Runtime publication verification is fingerprint-exact and disposition-explicit', () => {
  assert.match(workflow,/__atlas_read_surface=runtime-publication/);
  assert.match(workflow,/\.outcome\.disposition_counts\.published == \.outcome\.output_row_count/);
  assert.match(workflow,/\.outcome\.disposition_counts\.excluded == \.outcome\.excluded_row_count/);
  assert.match(workflow,/\.authoring_matches_active_compile==true/);
  assert.match(workflow,/\.publication_current==true/);
  assert.match(workflow,/\.current_authoring_input_fingerprint==\$out\.input_fingerprint/);
  assert.match(workflow,/\.active_compile\.output_fingerprint==\$out\.output_fingerprint/);
  assert.match(workflow,/\.activation_history\.latest_matches_projection==true/);
});
