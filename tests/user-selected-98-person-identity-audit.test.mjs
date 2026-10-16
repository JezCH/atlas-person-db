import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { identityKey, validateIdentityProjection, reconcileSelected98 } from '../scripts/audit-user-selected-98-person-identities.mjs';

const roster = JSON.parse(fs.readFileSync(
  new URL('../research/person-registration/user-selected-98-identity-reconciliation-20261016.v1.json', import.meta.url),'utf8'));

test('selected roster is exact and 57+3+0+38 evidence classes are disjoint', () => {
  assert.equal(roster.entries.length,98);
  assert.deepEqual(roster.counts,{snapshot_uuid:57,pr_confirmed:3,request_no_readback:0,unresolved:38});
  assert.equal(roster.entries.filter(x=>x.historical_uuid_evidence.length>0).length,57);
  assert.equal(roster.entries.filter(x=>x.prior_evidence_kind==='approved_authoring_request_no_current_readback').length,0);
  assert.equal(roster.entries[2].historical_uuid_evidence.length,2);
  assert.equal(roster.entries[28].expected_name_en,'Muhammad V of Granada');
});

test('full identity projection fails closed on missing or partial data', () => {
  assert.throws(()=>validateIdentityProjection({ok:true,persons:[]},{minPersons:1}),/INVALID_PRODUCTION_IDENTITY_PROJECTION/);
  assert.throws(()=>validateIdentityProjection({ok:true,schema:'atlas-person-read/v1',mode:'list',projection:'identity',persons:[]},{minPersons:1}),/INCOMPLETE_PRODUCTION/);
});

test('snapshot UUIDs beat formatting differences; Baybars duplicate remains explicit HOLD', () => {
  const persons=[];
  for(const x of roster.entries) for(const id of x.historical_uuid_evidence){
    persons.push({id,names:[{name:id===x.historical_uuid_evidence[0]?x.expected_name_en:'Baibars',locale:'en'}]});
  }
  const audit=reconcileSelected98(roster,validateIdentityProjection({
    ok:true,schema:'atlas-person-read/v1',mode:'list',projection:'identity',persons
  },{minPersons:50}));
  assert.equal(audit.entries.length,98);
  assert.equal(audit.counts.ALREADY_REGISTERED_UUID,56);
  assert.equal(audit.counts.MULTIPLE_PERSON_UUIDS_HOLD,1);
  assert.equal(audit.entries[2].matched_person_ids.length,2);
  assert.equal(audit.counts.NO_EXACT_NAME_MATCH_HUMAN_REVIEW_REQUIRED,38);
  assert.equal(audit.counts.PRIOR_APPROVED_MANIFEST_NOT_FOUND_REVIEW || 0,0);
  assert.equal(audit.counts.HISTORIC_PRODUCTION_CONFIRMATION_DRIFT_REVIEW,3);
  assert.equal(audit.registration_approved,false);
});

test('true exact name match excludes even if historical proposals have no UUID', () => {
  const person={id:'a0000000-0000-4000-8000-000000000001',
    names:[{name:'Hugues de Payens',locale:'en'},{name:'위그 드 파앵',locale:'ko'}]};
  const audit=reconcileSelected98(roster,[person]);
  assert.equal(audit.entries[4].verdict,'ALREADY_REGISTERED_EXACT_NAME');
  assert.deepEqual(audit.entries[4].matched_person_ids,[person.id]);
});

test('normalization only connects whole comparable names; no Muhammad Ali boxer false positive',()=>{
  assert.equal(identityKey('Hernán-Cortés'),identityKey('hernan cortes'));
  const person={id:'a0000000-0000-4000-8000-000000000002',
    names:[{name:'Muhammad Ali',locale:'en'}]};
  const result=reconcileSelected98(roster,[person]);
  assert.equal(result.entries[90].verdict,'NO_EXACT_NAME_MATCH_HUMAN_REVIEW_REQUIRED');
});

test('five retrospective Production UUID crosswalks exclude registration but not current-readback validation',()=>{
  const crosswalk=[14,20,38,85,96];
  for(const n of crosswalk) {
    const row=roster.entries[n-1];
    assert.equal(row.prior_evidence_kind,'production_youtube_20261009_registered');
    assert.equal(row.historical_uuid_evidence.length,1);
    assert.match(row.historical_evidence_source,/20261009\.csv/);
  }
  assert.equal(roster.production_snapshot_uuid_provenance.person_representative_domain_review,50);
  assert.equal(roster.production_snapshot_uuid_provenance.youtube_6358_registration_screen_20261009,5);
});

test('Muhammad V has same historical Person UUID and two independently verified reigns despite overall workflow failure',()=>{
 const row=roster.entries[28];
 assert.equal(row.prior_evidence_kind,'production_authoring_verified_20260902');
 assert.deepEqual(row.historical_uuid_evidence,['f39ebb79-783e-4d03-b941-af5605144691']);
 assert.deepEqual(row.existing_activity_periods.map(x=>[x.start_year,x.end_year]),[[1354,1359],[1362,1391]]);
 assert.equal(new Set(row.existing_activity_periods.map(x=>x.request_id)).size,2);
 assert.match(row.historical_evidence_source,/read-back VERIFIED/);
});
