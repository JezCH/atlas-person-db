import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ui=fs.readFileSync(new URL('../atlas-admin-identity.js',import.meta.url),'utf8');
const gate=fs.readFileSync(new URL('../atlas-admin-session-gate.js',import.meta.url),'utf8');

test('normal admin registration remains human-readable and UUID-free',()=>{
  assert.match(ui,/const authoringEndpoint = "\/api\/atlas-authoring"/);
  assert.match(ui,/id="humanAuthoringForm"/);
  assert.match(ui,/인물 영문명/);
  assert.match(ui,/정치체 영문명/);
  assert.match(ui,/Person \+ Activity \+ Source 한 번에 등록/);
  assert.match(ui,/crypto\.randomUUID\(\)/);
  assert.match(ui,/schema:\s*"atlas-human-authoring\/v1"/);
  assert.doesNotMatch(ui,/id="human[^\"]*Uuid/i);
  assert.doesNotMatch(ui,/new Date\(|Date\.parse\(/);
});

test('Relation and Period Basis choices come from the authenticated live catalog',()=>{
  assert.match(ui,/body\.catalogs\?\.relation_types/);
  assert.match(ui,/body\.catalogs\?\.period_bases/);
  assert.match(ui,/appendCatalogOptions\(relationSelect, relationTypes/);
  assert.match(ui,/appendCatalogOptions\(periodSelect, periodBases\)/);
  assert.doesNotMatch(ui,/<option value="rules">/);
  assert.doesNotMatch(ui,/select\.value\s*=\s*"reign"/);
  assert.doesNotMatch(ui,/periodSelect\.value\s*=\s*"reign"/);
});

test('admin temporal input exposes separate full boundaries without asking for granularity',()=>{
  for (const id of [
    'humanStartYear','humanStartMonth','humanStartDay','humanStartCertainty','humanStartCalendar',
    'humanEndYear','humanEndMonth','humanEndDay','humanEndCertainty','humanEndCalendar'
  ]) assert.match(ui,new RegExp(`id="${id}"`));
  for (const calendar of ['gregorian','julian','unspecified_historical','source_calendar']) assert.match(ui,new RegExp(`value="${calendar}"`));
  assert.match(ui,/start_month/);
  assert.match(ui,/start_day/);
  assert.match(ui,/start_certainty/);
  assert.match(ui,/start_calendar/);
  assert.match(ui,/end_month/);
  assert.match(ui,/end_day/);
  assert.match(ui,/end_certainty/);
  assert.match(ui,/end_calendar/);
  assert.doesNotMatch(ui,/humanStartGranularity|humanEndGranularity/);
  assert.match(ui,/year === 0/);
  assert.match(ui,/day !== null && month === null/);
});

test('existing entity reuse does not force Korean labels in the browser',()=>{
  assert.match(ui,/id="humanPersonKo" \/>/);
  assert.match(ui,/id="humanPolityKo" \/>/);
  assert.match(ui,/신규 Person 생성 시 필수/);
  assert.match(ui,/신규 Polity 생성 시 필수/);
  assert.match(ui,/HUMAN_AUTHORING_NEW_PERSON_KO_REQUIRED/);
  assert.match(ui,/HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED/);
  assert.match(ui,/HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED/);
});

test('Source URL is optional and selects the bibliographic source type without fake URLs',()=>{
  assert.match(ui,/id="humanSourceTitle" required/);
  assert.match(ui,/id="humanSourceUrl" type="url" \/>/);
  assert.match(ui,/sourceUrl \? "web_bibliographic_reference" : "bibliographic_reference"/);
  assert.match(ui,/canonical_url:\s*sourceUrl \|\| null/);
  assert.match(ui,/citation_text:\s*value\("humanSourceCitation"\) \|\| null/);
});

test('normal registration submits one semantic request and session expiry protects the route',()=>{
  assert.match(ui,/person:\s*\{ canonical_name_en:/);
  assert.match(ui,/polity:\s*\{ canonical_name_en:/);
  assert.match(ui,/relation_type:\s*value\("humanRelation"\)/);
  assert.match(ui,/period_basis:\s*value\("humanPeriodBasis"\)/);
  assert.match(ui,/sources:\s*\[\{/);
  assert.match(gate,/"\/api\/atlas-authoring"/);
});
