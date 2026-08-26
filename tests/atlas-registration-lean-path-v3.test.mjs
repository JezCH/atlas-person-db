import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import humanModule from '../server/atlas-human-authoring-service.js';

const {
  resolveNamuWikiReference,
  resolveOrCreateSources,
  createHumanAuthoringService
} = humanModule;

const PERSON_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ID = '66666666-6666-4666-8666-666666666666';

test('existing reviewed NamuWiki state is reused when a new Activity omits re-review', async () => {
  const client = {
    async query(sql) {
      assert.match(String(sql), /person_external_references/);
      return {
        rows:[{
          status:'linked',
          checked_at:'2026-08-25',
          document_title:'Existing Person',
          url:'https://namu.wiki/w/Existing%20Person'
        }]
      };
    }
  };
  const result = await resolveNamuWikiReference(client, {
    requestId:'admin:test-existing',
    person:{ id:PERSON_ID, disposition:'reused' },
    requested:null,
    allowLegacyNamuWikiOmission:false
  });
  assert.equal(result.status, 'linked');
  assert.equal(result.document_title, 'Existing Person');
});

test('new or unreviewed Person still fails closed when NamuWiki decision is omitted', async () => {
  const client = { query:async()=>({rows:[]}) };
  await assert.rejects(
    () => resolveNamuWikiReference(client, {
      requestId:'admin:test-new',
      person:{ id:PERSON_ID, disposition:'created' },
      requested:null,
      allowLegacyNamuWikiOmission:false
    }),
    /HUMAN_AUTHORING_NAMUWIKI_REQUIRED/
  );
});

test('Human Authoring persists a reviewed NamuWiki decision and writes profile audit in the same outer transaction', async () => {
  const statements=[];
  const requested={
    status:'linked',
    checked_at:'2026-08-26',
    document_title:'Razia Sultan',
    url:'https://namu.wiki/w/Razia%20Sultan'
  };
  const client={
    async query(sql) {
      const text=String(sql);
      statements.push(text);
      if (/select status,checked_at/.test(text)) return {rows:[]};
      if (/insert into atlas_v2\.person_external_references/.test(text)) return {rows:[requested]};
      if (/insert into atlas_v2\.person_profile_mutation_audits/.test(text)) return {rows:[]};
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
  const result=await resolveNamuWikiReference(client, {
    requestId:'admin:test-persist',
    person:{id:PERSON_ID,disposition:'created'},
    requested,
    allowLegacyNamuWikiOmission:false
  });
  assert.deepEqual(result, requested);
  assert.ok(statements.some((sql)=>/person_external_references/.test(sql) && /insert into/.test(sql)));
  assert.ok(statements.some((sql)=>/person_profile_mutation_audits/.test(sql)));
});

test('canonical Source URL reuses one exact live Source instead of creating a request-specific duplicate', async () => {
  const statements=[];
  const client={
    async query(sql) {
      const text=String(sql);
      statements.push(text);
      if (/where canonical_url=\$1/.test(text)) return {rows:[{id:SOURCE_ID}]};
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
  const result=await resolveOrCreateSources(client, 'admin:test-source', [{
    mode:'create',
    title:'Shared source',
    canonical_url:'https://example.test/source',
    citation_text:'Shared source',
    source_type:'web_bibliographic_reference',
    locator:'https://example.test/source'
  }]);
  assert.deepEqual(result, [{id:SOURCE_ID,locator:'https://example.test/source',disposition:'reused'}]);
  assert.equal(statements.some((sql)=>/insert into atlas_v2\.sources/.test(sql)), false);
});

test('batch authoring isolates transactions so one failed Person does not roll back later independent registrations', async () => {
  const statements=[];
  const applied=[];
  const client={
    async query(sql) {
      statements.push(String(sql).trim().toLowerCase());
      return {rows:[]};
    }
  };
  const service=createHumanAuthoringService({
    client,
    prepare(raw) {
      return { request:{requestId:raw.request_id}, hash:`hash:${raw.request_id}`, rawRequest:raw };
    },
    async applyPrepared(_client, prepared) {
      const id=prepared.request.requestId;
      applied.push(id);
      if (id==='b') throw new Error('TRANSIENT_B_FAILURE');
      return {request_id:id,committed:true};
    }
  });

  await assert.rejects(
    () => service.applyBatch([{request_id:'a'},{request_id:'b'},{request_id:'c'}]),
    /TRANSIENT_B_FAILURE/
  );
  assert.deepEqual(applied, ['a','b','c']);
  assert.equal(statements.filter((sql)=>sql==='begin isolation level serializable').length, 3);
  assert.equal(statements.filter((sql)=>sql==='commit').length, 2);
  assert.equal(statements.filter((sql)=>sql==='rollback').length, 1);
});

test('Admin and SOP encode SCREEN-first and optional re-review rather than the old mandatory NamuWiki loop', () => {
  const admin=fs.readFileSync(new URL('../atlas-admin-identity.js', import.meta.url), 'utf8');
  const sop=fs.readFileSync(new URL('../authoring/REGISTRATION_SOP.md', import.meta.url), 'utf8');
  assert.match(admin, /기존 검토값 재사용/);
  assert.doesNotMatch(admin, /id="humanNamuWikiStatus" required/);
  assert.match(admin, /if \(!status\) return null;/);
  assert.match(sop, /SCREEN\n→ REVIEW\n→ COMMIT\n→ VERIFY/);
  assert.match(sop, /Do not begin full historical research before checking whether the intended Person is already in Production/);
  assert.match(sop, /each logical registration has its own `SERIALIZABLE` transaction/);
});
