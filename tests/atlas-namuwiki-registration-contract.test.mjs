import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const validator = fs.readFileSync(new URL('../scripts/validate-authoring-request-files.mjs', import.meta.url), 'utf8');
const sync = fs.readFileSync(new URL('../scripts/sync-person-namuwiki-registry.mjs', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../atlas-person-external-references.js', import.meta.url), 'utf8');
const integrity = fs.readFileSync(new URL('../.github/workflows/atlas-integrity.yml', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../authoring/NAMUWIKI_REGISTRATION_POLICY.md', import.meta.url), 'utf8');
const sop = fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
const registry = JSON.parse(fs.readFileSync(new URL('../authoring/person-namuwiki-registry.json', import.meta.url), 'utf8'));

test('new human-authoring Person requests require an explicit NamuWiki decision', () => {
  assert.match(validator, /external_references\.namuwiki is required/);
  assert.match(validator, /status must be linked or not_found/);
  assert.match(validator, /checked_at must be a valid YYYY-MM-DD date/);
  assert.match(validator, /https:\/\/namu\.wiki\/w\/\.\.\./);
  assert.match(validator, /not_found NamuWiki reference must not contain document_title or url/);
  assert.match(validator, /\[NamuWiki\].*document not found/);
});

test('registry is a deterministic projection and is enforced on the authoring fast path', () => {
  assert.equal(registry.schema, 'atlas-person-namuwiki-registry/v1');
  assert.equal(registry.generated_from, 'authoring/requests/*.json');
  assert.equal(typeof registry.persons, 'object');
  assert.ok(!Array.isArray(registry.persons));
  assert.match(sync, /atlas-human-authoring\/v1/);
  assert.match(sync, /--check/);
  assert.match(sync, /--write/);
  assert.match(sync, /NamuWiki registry is stale/);
  assert.match(integrity, /authoring\/person-namuwiki-registry\\\.json/);
  assert.match(integrity, /sync-person-namuwiki-registry\.mjs --check/);
});

test('main Person table consumes the generated registry while preserving legacy fallbacks', () => {
  assert.match(runtime, /authoring\/person-namuwiki-registry\.json/);
  assert.match(runtime, /referencesByCanonicalName/);
  assert.match(runtime, /canonical_name_en/);
  assert.match(runtime, /statusForPerson/);
  assert.match(runtime, /row\.dataset\.namuwikiStatus = status\.status/);
  assert.match(runtime, /person-main-name-link/);
  assert.match(runtime, /da0303c2-1faf-40b8-9dc2-1325b77488d7/);
});

test('registration policy and SOP require explicit completion reporting for linked and missing documents', () => {
  for (const source of [policy, sop]) {
    assert.match(source, /나무위키: 연결됨/);
    assert.match(source, /나무위키: 문서 없음/);
  }
  assert.match(policy, /unknown/);
  assert.match(policy, /same-name/i);
  assert.match(sop, /external_references\.namuwiki/);
});
