import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const human=require('../server/atlas-human-authoring-service.js');
const reads=require('../server/atlas-person-read-service.js');
const migrations=require('../server/atlas-authoring-migrations.js');

function personOnlyFixture() {
  return {
    schema:'atlas-human-person-authoring/v1',
    review_status:'approved',
    request_id:'authoring:test:person-only:v1',
    person:{
      canonical_name_en:'Example Thinker',
      display_name_ko:'예시 사상가',
      person_type:'historical',
      historicity:'historical',
      life_status:'deceased',
      life_status_checked_at:'2026-09-30',
      life_status_basis:'historical_certainty'
    },
    external_references:{
      namuwiki:{
        status:'not_found',
        checked_at:'2026-09-30',
        review_reason:'no_exact_document'
      }
    },
    timeline_disposition:{
      disposition:'chronology_unresolved',
      reason:'Reviewed historical identity without a defensible person-specific timeline rail.',
      basis_code:'reviewed_person_specific_chronology_unresolved',
      traditional_year:null,
      traditional_year_alternative:null,
      review_evidence:{authority_scope:'timeline_disposition_review_evidence_only'}
    },
    representative_domain:'knowledge',
    sources:[{
      source_type:'academic_reference',
      title:'Example academic reference',
      canonical_url:'https://example.org/reference',
      citation_text:'Example evidence used only for contract testing.',
      locator:'example'
    }]
  };
}

test('person-only request normalizes through the canonical non-timeline contract', () => {
  const prepared=human.prepareAnyHumanAuthoringRequest(personOnlyFixture(),{allowLegacyNamuWikiOmission:false});
  assert.equal(prepared.schema,'atlas-human-person-authoring/v1');
  assert.equal(prepared.request.timeline_disposition.disposition,'chronology_unresolved');
  assert.equal(prepared.request.representative_domain,'knowledge');
  assert.equal(prepared.request.external_references.namuwiki.status,'not_found');
  assert.equal(prepared.request.external_references.namuwiki.review_state,'reviewed_absent');
  assert.equal(prepared.request.external_references.namuwiki.review_reason,'no_exact_document');
  assert.equal(prepared.request.sources.length,1);
  assert.equal(prepared.request.person.life_status,'deceased');
});

test('person-only authoring rejects timeline inclusion because it must not fabricate an Activity rail', () => {
  const invalid=personOnlyFixture();
  invalid.timeline_disposition={disposition:'timeline'};
  assert.throws(
    ()=>human.prepareAnyHumanAuthoringRequest(invalid,{allowLegacyNamuWikiOmission:false}),
    /HUMAN_PERSON_AUTHORING_NON_TIMELINE_DISPOSITION_REQUIRED/
  );
});

test('person-only authoring rejects an existing Person that already has canonical Activities before profile mutation', async () => {
  const client={
    async query(sql) {
      assert.match(String(sql),/from atlas_v2\.person_politics_v2/);
      return { rows:[{activity_count:1}], rowCount:1 };
    }
  };
  await assert.rejects(
    ()=>human.assertPersonOnlyTargetHasNoActivities(client,'00000000-0000-4000-8000-000000000001'),
    /HUMAN_PERSON_AUTHORING_EXISTING_ACTIVITY_CONFLICT/
  );
});

test('person-only authoring allows an Activity-free existing Person target', async () => {
  const client={
    async query() {
      return { rows:[{activity_count:0}], rowCount:1 };
    }
  };
  assert.equal(
    await human.assertPersonOnlyTargetHasNoActivities(client,'00000000-0000-4000-8000-000000000001'),
    0
  );
});

test('Person read projection exposes representative domain and timeline disposition', () => {
  const projected=reads.projectPerson({
    id:'00000000-0000-4000-8000-000000000001',
    person_type:'historical',
    historicity:'historical',
    representative_domain:'knowledge',
    timeline_disposition:{
      disposition:'chronology_unresolved',
      reason:'reviewed chronology gap',
      basis_code:'reviewed_basis',
      review_evidence:{source:'test'}
    },
    names:[
      {locale:'en',name:'Example',name_type:'canonical',is_preferred:true},
      {locale:'ko',name:'예시',name_type:'display',is_preferred:true}
    ],
    descriptions:[],
    external_references:{},
    activity_count:0,
    first_activity_year:null,
    last_activity_year:null
  });
  assert.equal(projected.representative_domain,'knowledge');
  assert.equal(projected.timeline_disposition.disposition,'chronology_unresolved');
  assert.equal(projected.timeline_disposition.reason,'reviewed chronology gap');
});

test('authoring apply migrations include person-only ledger schema migration', () => {
  const paths=migrations.AUTHORING_APPLY_MIGRATION_PATHS.map((value)=>String(value));
  assert.ok(paths.some((value)=>value.endsWith('20260930_human_person_authoring_manifest_schema.sql')));
});
