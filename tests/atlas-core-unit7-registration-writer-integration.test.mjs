import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const coordinator=require('../server/atlas-registration-coordinator.js');
const registry=require('../server/atlas-registration-obligations.js');

function writer(phase, completed, calls) {
  return {
    phase,
    async run(input) {
      calls.push({ phase, input });
      return { completed_obligations:completed.filter((key)=>input.obligation_keys.includes(key)), canonical_ref:`canonical:${phase}` };
    }
  };
}

test('Unit 7 runs applicable obligations through one ordered completion chain without copying canonical values', async () => {
  const calls=[];
  const c=coordinator.createRegistrationCoordinator({
    writers:{
      person_registration:writer('authoring',['person.life_status_review','person.identity_historicity_review'],calls),
      activity_authoring:writer('authoring',['activity.person_polity_resolution','activity.explicit_relation','activity.role','activity.period_basis','activity.temporal_boundaries','activity.certainty_calendar','activity.confidence_notes'],calls),
      source_provenance:writer('authoring',['person.evidence_source_basis','activity.source_provenance'],calls),
      external_reference:writer('companion_writers',['person.external_reference_namuwiki_review'],calls),
      person_timeline:writer('companion_writers',['person.timeline_disposition_review'],calls),
      person_profile:writer('companion_writers',['person.representative_domain_review'],calls),
      registration_coordinator:writer('authoring_readback',['publication.authoring_verified'],calls),
      runtime_publication:writer('compile',['publication.compile_disposition'],calls)
    }
  });
  const result=await c.execute({
    scopes:['new_person','activity','publication'],
    applicability:{
      'publication.runtime_verified':false,
      'activity.role':false,
      'activity.certainty_calendar':false
    },
    context:{ canonical_revision:'opaque-ref-only' }
  });
  assert.equal(result.status,'COMPLETE');
  assert.equal(result.pending_obligations.length,0);
  assert.deepEqual([...new Set(result.trace.map((item)=>item.phase))],['authoring','authoring_readback','companion_writers','compile']);
  assert.equal(JSON.stringify(result).includes('opaque-ref-only'),false);
});

test('Unit 7 fails closed when a required canonical writer does not close its obligation', async () => {
  const c=coordinator.createRegistrationCoordinator({
    writers:{ person_registration:{ phase:'authoring', async run(){ return { completed_obligations:[] }; } } }
  });
  const result=await c.execute({ scopes:['new_person'] });
  assert.equal(result.status,'HOLD');
  assert.ok(result.pending_obligations.includes('person.life_status_review'));
  assert.ok(result.pending_obligations.includes('person.external_reference_namuwiki_review'));
});

test('Unit 7 rejects a writer claiming another canonical writer obligation', async () => {
  const c=coordinator.createRegistrationCoordinator({
    writers:{ person_registration:{ phase:'authoring', async run(){ return { completed_obligations:['person.timeline_disposition_review'] }; } } }
  });
  await assert.rejects(()=>c.execute({ scopes:['new_person'] }),/REGISTRATION_COORDINATOR_WRITER_OWNERSHIP_MISMATCH/);
});

test('Unit 7 preserves explicit HOLD and never advances to later phases', async () => {
  let compileCalls=0;
  const c=coordinator.createRegistrationCoordinator({
    writers:{
      person_registration:{ phase:'authoring', async run(){ return { completed_obligations:['person.life_status_review'], hold:'IDENTITY_REVIEW_REQUIRED' }; } },
      runtime_publication:{ phase:'compile', async run(){ compileCalls+=1; return { completed_obligations:['publication.compile_disposition'] }; } }
    }
  });
  const result=await c.execute({ scopes:['new_person','publication'] });
  assert.equal(result.status,'HOLD');
  assert.equal(result.hold,'IDENTITY_REVIEW_REQUIRED');
  assert.equal(compileCalls,0);
});


test('Unit 7 closes new-Polity spatial disposition and included Runtime read-back through their owning writers', async () => {
  const c=coordinator.createRegistrationCoordinator({
    writers:{
      polity_identity:writer('authoring',['polity.continuity_identity_resolution','polity.designation_collision_reuse_review'],[]),
      spatial_authoring:writer('companion_writers',['polity.spatial_disposition'],[]),
      registration_coordinator:writer('authoring_readback',['publication.authoring_verified'],[]),
      runtime_publication:{
        phases:['compile','runtime_readback'],
        async run(input) {
          const completed=input.obligation_keys.filter((key)=>[
            'publication.compile_disposition','publication.runtime_verified'
          ].includes(key));
          return { completed_obligations:completed, canonical_ref:'publication:opaque' };
        }
      }
    }
  });
  const result=await c.execute({ scopes:['new_polity','publication'] });
  assert.equal(result.status,'COMPLETE');
  assert.deepEqual(result.pending_obligations,[]);
  assert.deepEqual(result.trace.filter((item)=>item.writer==='runtime_publication').map((item)=>item.phase),['compile','runtime_readback']);
});
