import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('Person summary decorates visible Person count with unique polity UUID count', () => {
  const ui = fs.readFileSync(new URL('../atlas-person-summary-counts.js', import.meta.url), 'utf8');
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(ui, /personMainPolityFilter/);
  assert.match(ui, /new Set/);
  assert.match(ui, /인물 \$\{persons\}명 표시 · 정치체 \$\{polities\}개/);
  assert.match(ui, /atlas-person-main-rendered/);
  assert.match(index, /atlas-person-summary-counts\.js\?v=20260816-polity-count-v1/);
});
