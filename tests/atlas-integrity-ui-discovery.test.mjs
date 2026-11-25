import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');
const step = workflow.split('      - name: Run focused UI contract tests\n')[1]
  .split('\n  full_test:')[0].split('run: |\n')[1];

test('focused UI lane reports a test discovery failure', () => {
  const result = spawnSync('bash', ['-c', 'find() { echo discovery-failed >&2; return 7; }\n' + step], { encoding: 'utf8' });
  assert.equal(result.status, 7, result.stderr);
  assert.match(result.stderr, /discovery-failed/);
  assert.equal(result.stdout, '');
});

test('focused UI lane preserves NUL-delimited test names', () => {
  const stub = "find() { printf '%s\\0' 'tests/한글 ui.test.mjs'; }\nnode() { printf '%s\\n' \"$#\" \"$@\"; }\n";
  const result = spawnSync('bash', ['-c', stub + step], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '2\n--test\ntests/한글 ui.test.mjs\n');
});
