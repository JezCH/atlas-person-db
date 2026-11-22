import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('Integrity preserves Unicode filenames without splitting quoted control characters', t => {
  const root = mkdtempSync(join(tmpdir(), 'atlas-integrity-paths-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  git('init', '-q');
  git('config', 'core.quotepath', 'true');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.org', 'commit', '-qm', 'base', '--allow-empty');
  for (const name of ['연대.md', 'line\nbreak.md']) writeFileSync(join(root, name), '');
  git('add', '.');
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.org', 'commit', '-qm', 'fixture');
  const workflow = readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');
  const args = workflow.match(/git ([^\n]+) "\$base_sha" "\$head_sha" -- > \/tmp\/atlas-changed\.txt/)[1].split(' ');
  const paths = git(...args, 'HEAD^', 'HEAD', '--').trimEnd().split('\n');
  assert.equal(paths.length, 2);
  assert.ok(paths.includes('연대.md'));
  assert.ok(paths.includes('"line\\nbreak.md"'));
});
