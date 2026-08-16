import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowUrl = new URL('../.github/workflows/atlas-audit-inventory.yml', import.meta.url);
const workflow = await readFile(workflowUrl, 'utf8');

test('automatic audit pushes capture the current full Stage 2 baseline', () => {
  assert.match(
    workflow,
    /ATLAS_AUDIT_MODE:\s*\$\{\{\s*github\.event_name == 'workflow_dispatch' && inputs\.mode \|\| 'full_stage2_baseline'\s*\}\}/,
  );
});

test('manual audit dispatch preserves the reviewed targeted mode', () => {
  assert.match(workflow, /workflow_dispatch:[\s\S]*default:\s*targeted/);
  assert.match(workflow, /options:[\s\S]*- targeted[\s\S]*- full_stage2_baseline/);
});
