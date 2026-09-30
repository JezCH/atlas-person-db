import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const human=require('../server/atlas-human-authoring-service.js');
const reads=require('../server/atlas-person-read-service.js');
const migrations=require('../server/atlas-authoring-migrations.js');

const manifests=[
  'philosophy-canon-20260930-adi-shankara-person-only.json',
  'philosophy-canon-20260930-kumarila-bhatta-person-only.json',
  'philosophy-canon-20260930-gangesa-person-only.json',
  'philosophy-canon-20260930-kundakunda-person-only.json'
].map((name)=>JSON.parse(fs.readFileSync(new URL('../authoring/requests/'+name, import.meta.url),'utf8')));

test('person-only philosophy manifests use the canonical non-timeline contract', () => {
  for (const manifest of manifests) {
    const prepared=human.prepareAnyHumanAuthoringRequest(manifest,{allowLegacyNamuWikiOmission:false});
    assert.equal(prepared.schema,'atlas-human-person-authoring/v1');
    assert.equal(prepared.request.timeline_disposition.disposition,'chronology_unresolved');
    assert.equal(prepared.request.representative_domain,'knowledge');
    assert.equal(prepared.request.external_references.namuwiki.status,'not_found');
    assert.equal(prepared.request.external_references.namuwiki.review_state,'reviewed_absent');
    assert.equal(prepared.request.external_references.namuwiki.review_reason,'no_exact_document');
    assert.ok(prepared.request.sources.length>=1);
    assert.equal(prepared.request.person.life_status,'deceased');
  }
});

test('person-only authoring rejects timeline inclusion because it must not fabricate an Activity rail', () => {
  const invalid=structuredClone(manifests[1]);
  invalid.timeline_disposition={disposition:'timeline'};
  assert.throws(
    ()=>human.prepareAnyHumanAuthoringRequest(invalid,{allowLegacyNamuWikiOmission:false}),
    /HUMAN_PERSON_AUTHORING_NON_TIMELINE_DISPOSITION_REQUIRED/
  );
});

test('Person read projection exposes representative domain and timeline disposition', () => {
  const projected=reads.projectPersonIdentity({
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
    external_references:{}
  });
  assert.equal(projected.representative_domain,'knowledge');
  assert.equal(projected.timeline_disposition.disposition,'chronology_unresolved');
  assert.equal(projected.timeline_disposition.reason,'reviewed chronology gap');
});

test('authoring apply migrations include person-only ledger schema migration', () => {
  const paths=migrations.AUTHORING_APPLY_MIGRATION_PATHS.map((value)=>String(value));
  assert.ok(paths.some((value)=>value.endsWith('20260930_human_person_authoring_manifest_schema.sql')));
});
