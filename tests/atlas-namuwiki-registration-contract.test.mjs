import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import humanAuthoringService from '../server/atlas-human-authoring-service.js';

const { normalizeNamuWikiReference } = humanAuthoringService;
const validator = fs.readFileSync(new URL('../scripts/validate-authoring-request-files.mjs', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../server/atlas-human-authoring-service.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-human-authoring-handler.js', import.meta.url), 'utf8');
const personRead = fs.readFileSync(new URL('../server/atlas-person-read-service.js', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../atlas-admin-identity.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../atlas-person-external-references.js', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../authoring/NAMUWIKI_REGISTRATION_POLICY.md', import.meta.url), 'utf8');
const sop = fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
const humanDoc = fs.readFileSync(new URL('../authoring/HUMAN_AUTHORING.md', import.meta.url), 'utf8');

test('NamuWiki normalizer accepts only explicit linked/not_found decisions', () => {
  assert.deepEqual(
    normalizeNamuWikiReference({
      status:'linked',
      checked_at:'2026-08-21',
      document_title:'임호텝',
      url:'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D'
    }, { allowLegacyOmission:false }),
    {
      status:'linked',
      checked_at:'2026-08-21',
      document_title:'임호텝',
      url:'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D'
    }
  );
  assert.deepEqual(
    normalizeNamuWikiReference({ status:'not_found', checked_at:'2026-08-21' }, { allowLegacyOmission:false }),
    { status:'not_found', checked_at:'2026-08-21' }
  );
  assert.throws(() => normalizeNamuWikiReference(null, { allowLegacyOmission:false }), /HUMAN_AUTHORING_NAMUWIKI_REQUIRED/);
  assert.throws(() => normalizeNamuWikiReference({ status:'unknown', checked_at:'2026-08-21' }, { allowLegacyOmission:false }), /HUMAN_AUTHORING_NAMUWIKI_STATUS_INVALID/);
  assert.throws(() => normalizeNamuWikiReference({ status:'linked', checked_at:'2026-08-21', document_title:'x', url:'https://example.com/x' }, { allowLegacyOmission:false }), /HUMAN_AUTHORING_NAMUWIKI_URL_INVALID/);
  assert.throws(() => normalizeNamuWikiReference({ status:'not_found', checked_at:'2026-08-21', url:'https://namu.wiki/w/x' }, { allowLegacyOmission:false }), /HUMAN_AUTHORING_NAMUWIKI_NOT_FOUND_FIELDS_INVALID/);
});

test('legacy omission remains possible only through the explicit compatibility option', () => {
  assert.equal(normalizeNamuWikiReference(null, { allowLegacyOmission:true }), null);
  assert.match(handler, /allowLegacyNamuWikiOmission:auth\.method === "github_oidc"/);
  assert.match(service, /allowLegacyNamuWikiOmission = true/);
});

test('changed GitHub human-authoring manifests fail closed without a NamuWiki decision', () => {
  assert.match(validator, /external_references\.namuwiki is required/);
  assert.match(validator, /status must be linked or not_found/);
  assert.match(validator, /checked_at must be a valid YYYY-MM-DD date/);
  assert.match(validator, /canonical https:\/\/namu\.wiki\/w\/\.\.\. URL/);
  assert.match(validator, /not_found NamuWiki reference must not contain document_title or url/);
  assert.match(validator, /\[NamuWiki\].*document not found/);
});

test('authoring persists the decision in the existing immutable result snapshot', () => {
  assert.match(service, /external_references:externalReferences/);
  assert.match(service, /externalReferences:request\.external_references/);
  assert.match(service, /result_snapshot/);
  assert.match(service, /external_references:snapshot\.external_references/);
});

test('Person read surfaces the latest explicit stored decision without a new table', () => {
  assert.match(personRead, /authoring_manifest_runs amr/);
  assert.match(personRead, /result_snapshot->'external_references'/);
  assert.match(personRead, /result_snapshot->'external_references'->'namuwiki'/);
  assert.match(personRead, /order by amr\.applied_at desc/);
  assert.match(personRead, /external_references:normalizeExternalReferences/);
});

test('normal Admin registration requires and reports the NamuWiki outcome', () => {
  assert.match(admin, /id="humanNamuWikiStatus" required/);
  assert.match(admin, /id="humanNamuWikiCheckedAt" type="date" required/);
  assert.match(admin, /id="humanNamuWikiTitle"/);
  assert.match(admin, /id="humanNamuWikiUrl"/);
  assert.match(admin, /external_references: \{ namuwiki: namuwikiReference\(\) \}/);
  assert.match(admin, /나무위키: 연결됨/);
  assert.match(admin, /나무위키: 문서 없음/);
});

test('main Person table uses authoritative Person read metadata and preserves Imhotep fallback', () => {
  assert.match(runtime, /READ_ENDPOINT = "\/api\/atlas-person-read"/);
  assert.match(runtime, /external_references\?\.namuwiki/);
  assert.match(runtime, /statusForPerson/);
  assert.match(runtime, /row\.dataset\.namuwikiStatus = status\.status/);
  assert.match(runtime, /person-main-name-link/);
  assert.match(runtime, /da0303c2-1faf-40b8-9dc2-1325b77488d7/);
});

test('registration documentation requires explicit linked or not_found completion reporting', () => {
  for (const source of [policy, sop, humanDoc]) {
    assert.match(source, /linked/);
    assert.match(source, /not_found/);
    assert.match(source, /나무위키: 연결됨/);
    assert.match(source, /나무위키: 문서 없음/);
  }
  assert.match(policy, /same-name/);
  assert.match(sop, /external_references\.namuwiki/);
  assert.match(humanDoc, /authoring_manifest_runs\.result_snapshot/);
});
