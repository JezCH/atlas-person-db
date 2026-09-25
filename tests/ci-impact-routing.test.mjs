import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  classifyImpacts,
  classifyPath,
  formatGithubOutputs
} from '../scripts/classify-ci-impact.mjs';

test('durable dependency surfaces classify by role, not historical phase', () => {
  assert.equal(classifyPath('authoring/requests/example.json'), 'registration');
  assert.equal(classifyPath('non-timeline-persons.json'), 'registration');

  assert.equal(classifyPath('README.md'), 'governance');
  assert.equal(classifyPath('docs/operations/example.txt'), 'governance');
  assert.equal(classifyPath('requirements/atlas-requirements.v1.json'), 'governance');

  assert.equal(classifyPath('admin.css'), 'ui');
  assert.equal(classifyPath('public/icon.svg'), 'ui');
  assert.equal(classifyPath('atlas-person-spacetime-model.js'), 'ui');

  assert.equal(classifyPath('server/atlas-person-service.js'), 'full');
  assert.equal(classifyPath('db/schema/001-core.sql'), 'full');
  assert.equal(classifyPath('scripts/some-new-tool.mjs'), 'full');
  assert.equal(classifyPath('.github/workflows/new-workflow.yml'), 'full');
  assert.equal(classifyPath('some-future-surface/value.json'), 'full');
});

test('independent safe impacts compose instead of escalating to an unrelated full suite', () => {
  assert.deepEqual(
    classifyImpacts([
      'docs/change.md',
      'app.js',
      'authoring/requests/example.json'
    ]),
    {
      registration: true,
      governance: true,
      ui: true,
      full: false
    }
  );
});

test('full integrity absorbs generic governance and UI checks but not data-specific registration validation', () => {
  assert.deepEqual(
    classifyImpacts([
      'docs/change.md',
      'app.js',
      'server/atlas-person-service.js',
      'authoring/requests/example.json'
    ]),
    {
      registration: true,
      governance: false,
      ui: false,
      full: true
    }
  );
});

test('missing or unresolvable change information fails closed to full integrity', () => {
  assert.deepEqual(classifyImpacts([]), {
    registration: false,
    governance: false,
    ui: false,
    full: true
  });
});

test('path normalization is platform-neutral', () => {
  assert.equal(classifyPath('.\\authoring\\requests\\example.json'), 'registration');
  assert.equal(classifyPath('.\\docs\\example.md'), 'governance');
});

test('GitHub output format exposes only stable validation lanes', () => {
  assert.equal(
    formatGithubOutputs({ registration: true, governance: false, ui: true, full: false }),
    'registration=true\ngovernance=false\nui=true\nfull=false'
  );
});

test('integrity workflow uses the same classifier for PR and main-push change ranges', () => {
  const workflow = fs.readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:\n\s+branches:\n\s+- main/);
  assert.match(workflow, /PUSH_BEFORE_SHA:/);
  assert.match(workflow, /node scripts\/classify-ci-impact\.mjs/);
  assert.match(workflow, /Enforce every selected integrity lane/);
  assert.doesNotMatch(workflow, /scope=registration|scope=governance|scope=ui/);
});

test('replaceable validation workflows cancel stale runs', () => {
  for (const relative of [
    '../.github/workflows/atlas-integrity.yml',
    '../.github/workflows/atlas-p10-person-duplicate-v2-revalidation.yml',
    '../.github/workflows/atlas-canonical-data-readiness.yml',
    '../.github/workflows/atlas-human-authoring-operational-parity.yml'
  ]) {
    const workflow = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
    assert.match(workflow, /cancel-in-progress: true/);
  }
});

test('Production mutation workflows remain non-cancelling', () => {
  for (const relative of [
    '../.github/workflows/atlas-authoring-apply.yml',
    '../.github/workflows/atlas-namuwiki-link.yml'
  ]) {
    const workflow = fs.readFileSync(new URL(relative, import.meta.url), 'utf8');
    assert.match(workflow, /environment: production/);
    assert.match(workflow, /cancel-in-progress: false/);
  }
});
