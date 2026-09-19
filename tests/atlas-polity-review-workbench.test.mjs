import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const candidates = fs.readFileSync(new URL('../atlas-polity-review-candidates.js', import.meta.url), 'utf8');
const workbench = fs.readFileSync(new URL('../atlas-polity-review-workbench.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-polity-review-workbench.css', import.meta.url), 'utf8');

test('polity review candidate registry separates confirmed merges, review candidates, and split candidates', () => {
  assert.match(candidates, /confirmed_merges/);
  assert.match(candidates, /review_candidates/);
  assert.match(candidates, /split_candidates/);
  assert.match(candidates, /Ming Dynasty \/ Ming dynasty/);
  assert.match(candidates, /Liao Dynasty \/ Liao dynasty/);
  assert.match(candidates, /Israel identity 과통합/);
  assert.match(candidates, /Kingdom of Italy identity 과통합/);
});

test('polity review exposes explicit human decision options without direct Production mutation', () => {
  for (const code of ['merge','keep_left','keep_right','keep_both','retire_left','retire_right','split_required','hold']) {
    assert.match(candidates, new RegExp(`code: "${code}"`));
  }
  assert.match(workbench, /이 화면의 선택은 검토 기록이며 Production을 직접 변경하지 않습니다/);
  assert.match(workbench, /localStorage/);
  assert.match(workbench, /atlas-polity-review-decisions\/v1/);
  assert.match(workbench, /결정 JSON 내보내기/);
  assert.doesNotMatch(workbench, /\/api\/|atlas-mutate|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/);
});

test('polity review layout remains responsive for desktop and mobile review', () => {
  assert.match(css, /polity-review-kpis/);
  assert.match(css, /polity-review-pair/);
  assert.match(css, /polity-review-controls/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
});
