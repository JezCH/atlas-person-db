import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const inventory = fileURLToPath(new URL('../migration/phase-8/scripts/phase8c-c7-runtime-dependency-inventory.mjs', import.meta.url));

test('follows server side-effect module imports but ignores commented import examples', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-runtime-inventory-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'api'));
  const entry = path.join(root, 'api/atlas-session.js');
  fs.writeFileSync(path.join(root, 'legacy.mjs'), 'export const legacy = "public.person_politics";\n');
  const run = (source) => {
    fs.writeFileSync(entry, source);
    const result = spawnSync(process.execPath, [inventory, root], { encoding: 'utf8' });
    return { status: result.status, report: JSON.parse(result.stdout) };
  };

  const decoy = run('// from "../legacy.mjs"\n');
  assert.equal(decoy.status, 0);
  assert.equal(decoy.report.status, 'ZERO_REACHABLE_LEGACY_RUNTIME');

  const reachable = run('import /* initialisation */ "../legacy.mjs";\n');
  assert.equal(reachable.status, 2);
  assert.equal(reachable.report.status, 'RETIREMENT_REQUIRED');
  assert.deepEqual(reachable.report.public_runtime_forbidden_hits, [
    { file: 'legacy.mjs', code: 'legacy_public_table' }
  ]);
});
