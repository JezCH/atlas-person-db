import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import humanAuthoringService from '../server/atlas-human-authoring-service.js';

const {
  normalizeNamuWikiReference,
  resolveNamuWikiReference
} = humanAuthoringService;
const validator = fs.readFileSync(new URL('../scripts/validate-authoring-request-files.mjs', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('../server/atlas-human-authoring-service.js', import.meta.url), 'utf8');
const handler = fs.readFileSync(new URL('../server/atlas-human-authoring-handler.js', import.meta.url), 'utf8');
const personRead = fs.readFileSync(new URL('../server/atlas-person-read-service.js', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../atlas-admin-identity.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../atlas-person-external-references.js', import.meta.url), 'utf8');
const policy = fs.readFileSync(new URL('../authoring/NAMUWIKI_REGISTRATION_POLICY.md', import.meta.url), 'utf8');
const sop = fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
const humanDoc = fs.readFileSync(new URL('../authoring/HUMAN_AUTHORING.md', import.meta.url), 'utf8');

const PERSON_ID = '11111111-1111-4111-8111-111111111111';

function fakeNamuWikiClient(initialReference = null) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      calls.push({ text, params });
      if (text.includes('from atlas_v2.person_external_references')) {
        return { rows: initialReference ? [{ ...initialReference }] : [] };
      }
      if (text.includes('insert into atlas_v2.person_external_references')) {
        return {
          rows: [{
            status:params[1],
            checked_at:params[2],
            document_title:params[3],
            url:params[4]
          }]
        };
      }
      if (text.includes('insert into atlas_v2.person_profile_mutation_audits')) return { rows:[] };
      throw new Error(`unexpected query: ${text}`);
    }
  };
}

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
    { status:'not_found', checked_at:'2026-08-21', document_title:null, url:null }
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

test('authoring persists a submitted NamuWiki decision and audits the mutation', async () => {
  const requested = Object.freeze({
    status:'linked',
    checked_at:'2026-08-21',
    document_title:'임호텝',
    url:'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D'
  });
  const client = fakeNamuWikiClient();
  const saved = await resolveNamuWikiReference(client, {
    requestId:'test:namuwiki:persist',
    person:{ id:PERSON_ID },
    requested,
    allowLegacyNamuWikiOmission:false
  });
  assert.deepEqual(saved, requested);
  assert.ok(client.calls.some((call) => call.text.includes('insert into atlas_v2.person_external_references')));
  assert.ok(client.calls.some((call) => call.text.includes('insert into atlas_v2.person_profile_mutation_audits')));
  assert.match(service, /externalReferences:Object\.freeze\(\{ namuwiki \}\)/);
  assert.match(service, /result_snapshot/);
  assert.match(service, /external_references:snapshot\.external_references/);
});

test('existing reviewed NamuWiki state is reused without another write', async () => {
  const existing = Object.freeze({
    status:'not_found',
    checked_at:'2026-08-20',
    document_title:null,
    url:null
  });
  const client = fakeNamuWikiClient(existing);
  const reused = await resolveNamuWikiReference(client, {
    requestId:'test:namuwiki:reuse',
    person:{ id:PERSON_ID },
    requested:null,
    allowLegacyNamuWikiOmission:false
  });
  assert.deepEqual(reused, existing);
  assert.equal(client.calls.filter((call) => call.text.includes('insert into atlas_v2.person_external_references')).length, 0);
  assert.equal(client.calls.filter((call) => call.text.includes('person_profile_mutation_audits')).length, 0);
});

test('an unreviewed Person still fails closed when NamuWiki is omitted', async () => {
  const client = fakeNamuWikiClient();
  await assert.rejects(
    resolveNamuWikiReference(client, {
      requestId:'test:namuwiki:required',
      person:{ id:PERSON_ID },
      requested:null,
      allowLegacyNamuWikiOmission:false
    }),
    /HUMAN_AUTHORING_NAMUWIKI_REQUIRED/
  );
});

test('Person read surfaces normalized stored external references without authoring snapshot dependency', () => {
  assert.match(personRead, /atlas_v2\.person_external_references per/);
  assert.match(personRead, /jsonb_object_agg\(/);
  assert.match(personRead, /'status', per\.status/);
  assert.match(personRead, /'document_title', per\.document_title/);
  assert.match(personRead, /'url', per\.url/);
  assert.match(personRead, /external_references:normalizeExternalReferences/);
  assert.doesNotMatch(personRead, /authoring_manifest_runs amr|result_snapshot->'external_references'/);
});

test('normal Admin registration supports reviewed-state reuse while still reporting the outcome', () => {
  assert.match(admin, /id="humanNamuWikiStatus"/);
  assert.doesNotMatch(admin, /id="humanNamuWikiStatus" required/);
  assert.match(admin, /if \(!status\) return null/);
  assert.match(admin, /checkedAt\.required = reviewed/);
  assert.match(admin, /external_references: namuwiki \? \{ namuwiki \} : \{\}/);
  assert.match(admin, /나무위키: 연결됨/);
  assert.match(admin, /나무위키: 문서 없음/);
  assert.match(admin, /나무위키: 기존 검토값 없음/);
});

test('main Person table uses authoritative Person read metadata without hardcoded Person fallback', () => {
  assert.match(runtime, /READ_ENDPOINT = "\/api\/atlas-person-read"/);
  assert.match(runtime, /external_references\?\.namuwiki/);
  assert.match(runtime, /statusForPerson/);
  assert.match(runtime, /row\.dataset\.namuwikiStatus = status\.status/);
  assert.match(runtime, /person-main-name-link/);
  assert.doesNotMatch(runtime, /da0303c2-1faf-40b8-9dc2-1325b77488d7/);
});

test('registration documentation preserves explicit decisions and reviewed-state reuse semantics', () => {
  for (const source of [policy, sop, humanDoc]) {
    assert.match(source, /linked/);
    assert.match(source, /not_found/);
  }
  for (const source of [policy, humanDoc]) {
    assert.match(source, /나무위키: 연결됨/);
    assert.match(source, /나무위키: 문서 없음/);
  }
  assert.match(policy, /same-name/);
  assert.match(sop, /external_references\.namuwiki/);
  assert.match(sop, /reuses its live `linked` or `not_found` NamuWiki state without re-searching it/);
  assert.match(humanDoc, /authoring_manifest_runs\.result_snapshot/);
});
