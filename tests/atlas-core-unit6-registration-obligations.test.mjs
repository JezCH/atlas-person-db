import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const obligations=require('../server/atlas-registration-obligations.js');

test('Unit 6 registry is machine-readable, unique, and definition-only', () => {
  const registry=obligations.loadRegistry();
  assert.equal(registry.schema,'atlas-core/registration-obligations/v1');
  assert.equal(registry.value_storage_forbidden,true);
  assert.equal(new Set(registry.obligations.map((item)=>item.key)).size,registry.obligations.length);
  assert.deepEqual(
    [...new Set(registry.obligations.map((item)=>item.applies_to))].sort(),
    ['activity','new_person','new_polity','publication']
  );
});

test('Unit 6 covers the master-plan baseline obligations', () => {
  const expected={
    new_person:[
      'person.life_status_review','person.identity_historicity_review','person.timeline_disposition_review',
      'person.representative_domain_review','person.external_reference_namuwiki_review','person.evidence_source_basis'
    ],
    activity:[
      'activity.person_polity_resolution','activity.explicit_relation','activity.role','activity.period_basis',
      'activity.temporal_boundaries','activity.certainty_calendar','activity.confidence_notes','activity.source_provenance'
    ],
    new_polity:[
      'polity.continuity_identity_resolution','polity.designation_collision_reuse_review','polity.spatial_disposition'
    ],
    publication:[
      'publication.authoring_verified','publication.compile_disposition','publication.runtime_verified'
    ]
  };
  for (const [scope,keys] of Object.entries(expected)) {
    assert.deepEqual(obligations.obligationsFor(scope).map((item)=>item.key),keys);
  }
});

test('Unit 6 rejects duplicate obligations and canonical historical values', () => {
  const base=obligations.loadRegistry();
  assert.throws(
    ()=>obligations.validateRegistry({...base,obligations:[...base.obligations,base.obligations[0]]}),
    /REGISTRATION_OBLIGATION_KEY_DUPLICATE/
  );
  const polluted=structuredClone(base);
  polluted.obligations[0].canonical_value='deceased';
  assert.throws(()=>obligations.validateRegistry(polluted),/REGISTRATION_OBLIGATION_CANONICAL_VALUE_FORBIDDEN/);
});
