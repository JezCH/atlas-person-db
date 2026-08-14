import assert from 'node:assert/strict';
import test from 'node:test';

import humanModule from '../server/atlas-human-authoring-service.js';
const {
  HUMAN_AUTHORING_SCHEMA,
  HUMAN_AUTHORING_MARKER,
  normalizeHumanAuthoringRequest,
  roleCodeFromLabel,
  roleCategoryForRelation,
  activityPayload,
  resolveCatalogCode,
  resolveOrCreatePerson,
  resolveOrCreatePolity,
  resolveOrCreateRole,
  loadHumanAuthoringCatalogs
} = humanModule;

const UUIDS = {
  person:'11111111-1111-4111-8111-111111111111',
  polity:'22222222-2222-4222-8222-222222222222',
  relation:'33333333-3333-4333-8333-333333333333',
  role:'44444444-4444-4444-8444-444444444444',
  period:'55555555-5555-4555-8555-555555555555',
  source:'66666666-6666-4666-8666-666666666666'
};

function request(overrides = {}) {
  return {
    schema:HUMAN_AUTHORING_SCHEMA,
    request_id:'admin:test-razia',
    person:{ canonical_name_en:'Razia Sultan', display_name_ko:'라지아 술탄' },
    polity:{ canonical_name_en:'Delhi Sultanate', display_name_ko:'델리 술탄국' },
    activity:{
      relation_type:'rules',
      period_basis:'reign',
      role:'Sultan',
      role_display_name_ko:'술탄',
      start_year:1236,
      start_month:null,
      start_day:null,
      start_certainty:'exact',
      start_calendar:'unspecified_historical',
      end_year:1240,
      end_month:null,
      end_day:null,
      end_certainty:'exact',
      end_calendar:'unspecified_historical',
      confidence:'well_established',
      chronology_status:'reviewed'
    },
    sources:[{ title:'Reviewed source', canonical_url:'https://example.test/razia' }],
    ...overrides
  };
}

test('year-only human input compiles to year granularity without operator UUIDs', () => {
  const normalized = normalizeHumanAuthoringRequest(request());
  assert.equal(normalized.person.canonical_name_en, 'Razia Sultan');
  assert.equal(normalized.activity.relation_type, 'rules');
  assert.deepEqual(normalized.activity.start, { year:1236, month:null, day:null, granularity:'year', certainty:'exact', calendar:'unspecified_historical' });
});

test('month and day inputs derive granularity and preserve independent boundary certainty/calendar', () => {
  const raw = request();
  raw.activity = {
    ...raw.activity,
    start_month:10,
    start_day:null,
    start_certainty:'approximate',
    start_calendar:'julian',
    end_month:4,
    end_day:7,
    end_certainty:'uncertain',
    end_calendar:'source_calendar'
  };
  const normalized = normalizeHumanAuthoringRequest(raw);
  assert.deepEqual(normalized.activity.start, { year:1236, month:10, day:null, granularity:'month', certainty:'approximate', calendar:'julian' });
  assert.deepEqual(normalized.activity.end, { year:1240, month:4, day:7, granularity:'day', certainty:'uncertain', calendar:'source_calendar' });
});

test('historical boundary validation rejects year zero and day without month', () => {
  assert.throws(() => normalizeHumanAuthoringRequest(request({ activity:{ ...request().activity, start_year:0 } })), /signed non-zero historical year/);
  assert.throws(() => normalizeHumanAuthoringRequest(request({ activity:{ ...request().activity, start_month:null, start_day:3 } })), /HUMAN_AUTHORING_START_DAY_REQUIRES_MONTH/);
});

test('Relation has no generic default and active catalog resolution remains authoritative', async () => {
  const raw = request();
  delete raw.activity.relation_type;
  assert.throws(() => normalizeHumanAuthoringRequest(raw), /HUMAN_AUTHORING_RELATION_TYPE_REQUIRED/);
  const syntacticallyValidFutureCode = normalizeHumanAuthoringRequest(request({ activity:{ ...request().activity, relation_type:'future_catalog_code' } }));
  assert.equal(syntacticallyValidFutureCode.activity.relation_type, 'future_catalog_code');
  await assert.rejects(
    () => resolveCatalogCode({ query:async()=>({rows:[]}) }, { table:'person_polity_relation_types', code:'future_catalog_code', unresolvedCode:'HUMAN_AUTHORING_RELATION_TYPE_UNRESOLVED' }),
    /HUMAN_AUTHORING_RELATION_TYPE_UNRESOLVED/
  );
});

test('URL and URL-less bibliographic Sources both normalize without fabricated URLs', () => {
  const withUrl = normalizeHumanAuthoringRequest(request());
  assert.equal(withUrl.sources[0].source_type, 'web_bibliographic_reference');
  assert.equal(withUrl.sources[0].canonical_url, 'https://example.test/razia');

  const withoutUrl = normalizeHumanAuthoringRequest(request({ sources:[{ title:'Printed monograph', citation_text:'p. 42' }] }));
  assert.equal(withoutUrl.sources[0].source_type, 'bibliographic_reference');
  assert.equal(withoutUrl.sources[0].canonical_url, null);
  assert.equal(withoutUrl.sources[0].citation_text, 'p. 42');
  assert.equal(withoutUrl.sources[0].locator, 'p. 42');
});

test('source-less authoritative writes remain forbidden', () => {
  assert.throws(() => normalizeHumanAuthoringRequest(request({ sources:[] })), /HUMAN_AUTHORING_SOURCE_REQUIRED/);
});

test('existing Person and Polity reuse succeeds without KO while new identities fail closed without KO', async () => {
  const existingPersonClient = { query:async()=>({rows:[{id:UUIDS.person}]}) };
  assert.deepEqual(await resolveOrCreatePerson(existingPersonClient, { canonical_name_en:'Existing Person', display_name_ko:null }), { id:UUIDS.person, disposition:'reused' });
  await assert.rejects(() => resolveOrCreatePerson({ query:async()=>({rows:[]}) }, { canonical_name_en:'New Person', display_name_ko:null }), /HUMAN_AUTHORING_NEW_PERSON_KO_REQUIRED/);

  const existingPolityClient = { query:async()=>({rows:[{id:UUIDS.polity}]}) };
  assert.deepEqual(await resolveOrCreatePolity(existingPolityClient, { canonical_name_en:'Existing Polity', display_name_ko:null }), { id:UUIDS.polity, disposition:'reused' });
  await assert.rejects(() => resolveOrCreatePolity({ query:async()=>({rows:[]}) }, { canonical_name_en:'New Polity', display_name_ko:null }), /HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED/);
});

test('existing Role reuse succeeds without KO and a missing new Role KO fails closed', async () => {
  const existing = await resolveOrCreateRole({ query:async()=>({rows:[{id:UUIDS.role}]}) }, { role:'Sultan', role_display_name_ko:null });
  assert.deepEqual(existing, { id:UUIDS.role, disposition:'reused' });
  await assert.rejects(() => resolveOrCreateRole({ query:async()=>({rows:[]}) }, { role:'New Role', role_display_name_ko:null }), /HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED/);
});

test('catalog loading never overlaps queries on a single pg client', async () => {
  let inFlight=0;
  let maxInFlight=0;
  const client={
    async query(sql) {
      inFlight += 1;
      maxInFlight=Math.max(maxInFlight,inFlight);
      await new Promise((resolve)=>setImmediate(resolve));
      inFlight -= 1;
      if (String(sql).includes('person_polity_relation_types')) return { rows:[{code:'rules'},{code:'serves'}] };
      return { rows:[{code:'reign'}] };
    }
  };
  const catalogs=await loadHumanAuthoringCatalogs(client);
  assert.equal(maxInFlight,1);
  assert.deepEqual(catalogs.relation_types,['rules','serves']);
  assert.deepEqual(catalogs.period_bases,['reign']);
});

test('role code/category derivation remains deterministic', () => {
  assert.equal(roleCodeFromLabel('Grand Vizier'), 'grand_vizier');
  assert.equal(roleCategoryForRelation('rules'), 'ruler');
  assert.equal(roleCategoryForRelation('serves'), 'service');
});

test('compiled Activity payload is UUID-only and full-temporal before native writer execution', () => {
  const raw=request();
  raw.activity={...raw.activity,start_month:10,start_certainty:'approximate',start_calendar:'julian',end_month:4,end_day:7,end_calendar:'gregorian'};
  const normalized = normalizeHumanAuthoringRequest(raw);
  const payload = activityPayload({ personId:UUIDS.person, polityId:UUIDS.polity, roleId:UUIDS.role, relation:{ id:UUIDS.relation, code:'rules' }, periodBasis:{ id:UUIDS.period, code:'reign' }, activity:normalized.activity, sources:[{ id:UUIDS.source, locator:'p. 1', disposition:'created' }] });
  assert.equal(payload.person_id, UUIDS.person);
  assert.equal(payload.relation_type_id, UUIDS.relation);
  assert.equal(payload.period_basis_id, UUIDS.period);
  assert.equal(payload.activity_start_granularity, 'month');
  assert.equal(payload.activity_start_certainty, 'approximate');
  assert.equal(payload.activity_start_calendar, 'julian');
  assert.equal(payload.activity_end_granularity, 'day');
  assert.equal(payload.activity_end_calendar, 'gregorian');
  assert.deepEqual(payload.source_links, [{ source_id:UUIDS.source, source_locator_key:'p. 1' }]);
  for (const forbidden of ['person_name','polity_name','politic_name','relation_type','period_basis','role']) assert.equal(Object.hasOwn(payload, forbidden), false);
  assert.equal(HUMAN_AUTHORING_MARKER, 'ATLAS_HUMAN_AUTHORING_V1');
});
