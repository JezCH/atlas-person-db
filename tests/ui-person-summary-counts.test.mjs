import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

test('current-result Person and Polity counts are owned by the era navigator', () => {
  const main = fs.readFileSync(new URL('../atlas-person-main.js', import.meta.url), 'utf8');
  const nav = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(main, /visiblePolityCount/);
  assert.match(main, /visiblePolityCount: polityCount/);
  assert.match(nav, /person-era-nav-summary/);
  assert.match(nav, /인물 \$\{state\.visibleCount\}명 · 정치체 \$\{state\.visiblePolityCount\}개/);
  assert.match(nav, /person-era-jump-count/);
  assert.doesNotMatch(index, /atlas-person-summary-counts\.js/);
  assert.equal(fs.existsSync(new URL('../atlas-person-summary-counts.js', import.meta.url)), false);
});
