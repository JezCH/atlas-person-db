import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isReviewedMergeDataOnly,
  isRuntimeDataOnly,
  isSafeToSkipPath,
  requiresAuthoringRuntimeDeployment
} from '../scripts/vercel-ignore-build.mjs';

const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-reviewed-person-merge.yml', import.meta.url), 'utf8');

test('reviewed merge manifests are runtime-safe reviewed data', () => {
  const manifest = 'corrections/reviewed-person-merges/example.json';
  assert.equal(isReviewedMergeDataOnly([manifest]), true);
  assert.equal(isRuntimeDataOnly([manifest]), true);
  assert.equal(isSafeToSkipPath(manifest), true);
  assert.equal(requiresAuthoringRuntimeDeployment([manifest]), false);
});

test('reviewed merge compatibility remains fail-closed for runtime code', () => {
  assert.equal(requiresAuthoringRuntimeDeployment(['api/atlas-authoring.js']), true);
  assert.equal(requiresAuthoringRuntimeDeployment(['server/atlas-reviewed-person-merge-handler.js']), true);
});

test('reviewed merge workflow separates deployed runtime SHA from workflow SHA', () => {
  assert.match(workflow, /name: Resolve compatible Production runtime/);
  assert.match(workflow, /--arg deployment_sha "\$ATLAS_RUNTIME_SHA"/);
  assert.match(workflow, /--arg workflow_sha "\$GITHUB_SHA"/);
  assert.match(workflow, /requiresAuthoringRuntimeDeployment/);
  assert.doesNotMatch(workflow, /Wait for exact Production runtime/);
  assert.doesNotMatch(workflow, /--arg deployment_sha "\$GITHUB_SHA"/);
});
