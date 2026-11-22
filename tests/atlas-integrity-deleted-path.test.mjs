import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { classifyImpacts } from '../scripts/classify-ci-impact.mjs';

test('Integrity classifies deleted runtime paths even when another file changes', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'atlas-integrity-delete-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q');
  writeFileSync(join(cwd, 'runtime.js'), 'export const enabled = true;\n');
  git('add', 'runtime.js');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '-qm', 'baseline');
  renameSync(join(cwd, 'runtime.js'), join(cwd, 'archive.md'));
  git('add', '-A');

  const workflow = readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');
  const args = /git ((?:-c core\.quotepath=false )?diff [^"\n]+) "\$base_sha" "\$head_sha" -- > \/tmp\/atlas-changed\.txt/.exec(workflow)?.[1].trim().split(' ');
  assert.ok(args, 'locate the classifier diff command');
  const paths = git(...args, '--cached', 'HEAD', '--').trim().split('\n');
  assert.deepEqual(paths, ['archive.md', 'runtime.js']);
  assert.equal(classifyImpacts(paths).full, true);
});
