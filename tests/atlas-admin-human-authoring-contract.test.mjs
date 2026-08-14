import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ui=fs.readFileSync(new URL('../atlas-admin-identity.js',import.meta.url),'utf8');
const gate=fs.readFileSync(new URL('../atlas-admin-session-gate.js',import.meta.url),'utf8');

test('normal admin registration is human-readable and does not ask the operator for UUID or JSON',()=>{
  assert.match(ui,/const authoringEndpoint = "\/api\/atlas-authoring"/);
  assert.match(ui,/id="humanAuthoringForm"/);
  assert.match(ui,/인물 영문명/);
  assert.match(ui,/정치체 영문명/);
  assert.match(ui,/rules · 통치/);
  assert.match(ui,/Period basis/);
  assert.match(ui,/출처 제목/);
  assert.match(ui,/출처 URL/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.match(ui,/schema: "atlas-human-authoring\/v1"/);
  assert.doesNotMatch(ui,/id="human[^\"]*Uuid/i);
});

test('normal registration submits one request containing Person, Polity, Activity and Source provenance',()=>{
  assert.match(ui,/person: \{ canonical_name_en:/);
  assert.match(ui,/polity: \{ canonical_name_en:/);
  assert.match(ui,/relation_type:value\("humanRelation"\)/);
  assert.match(ui,/period_basis:value\("humanPeriodBasis"\)/);
  assert.match(ui,/sources: \[\{/);
  assert.match(ui,/Person \+ Activity \+ Source 한 번에 등록/);
});

test('session expiry gate treats the new authoring endpoint as protected',()=>{assert.match(gate,/"\/api\/atlas-authoring"/);});
