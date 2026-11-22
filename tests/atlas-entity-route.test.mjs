import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const route=require("../atlas-entity-route.js");

const PERSON_ID="ABCDEF01-2345-6789-ABCD-EF0123456789";
const POLITY_ID="12345678-90AB-CDEF-1234-567890ABCDEF";

test("entity route preserves existing domain-only hashes",()=>{
  assert.deepEqual(route.parseHash("#atlas-dashboard"),{
    domain:"dashboard",
    entity_type:null,
    entity_id:null,
    canonical_hash:"#atlas-dashboard"
  });
  assert.deepEqual(route.parseHash("#atlas-persons"),{
    domain:"persons",
    entity_type:null,
    entity_id:null,
    canonical_hash:"#atlas-persons"
  });
  assert.deepEqual(route.parseHash("#atlas-registration"),{
    domain:"registration",
    entity_type:null,
    entity_id:null,
    canonical_hash:"#atlas-registration"
  });
});

test("entity route canonicalizes exact Person and Polity UUID deep links",()=>{
  assert.deepEqual(route.parseHash(`#atlas-persons/person/${PERSON_ID}`),{
    domain:"persons",
    entity_type:"person",
    entity_id:PERSON_ID.toLowerCase(),
    canonical_hash:`#atlas-persons/person/${PERSON_ID.toLowerCase()}`
  });
  assert.deepEqual(route.parseHash(`#atlas-polities/polity/${POLITY_ID}`),{
    domain:"polities",
    entity_type:"polity",
    entity_id:POLITY_ID.toLowerCase(),
    canonical_hash:`#atlas-polities/polity/${POLITY_ID.toLowerCase()}`
  });
});

test("entity route never guesses identity from names, malformed UUIDs, or mismatched entity types",()=>{
  for(const hash of [
    "#atlas-persons/person/Yi-Sun-sin",
    "#atlas-persons/person/not-a-uuid",
    `#atlas-persons/polity/${POLITY_ID}`,
    `#atlas-polities/person/${PERSON_ID}`,
    "#atlas-polities/polity/Roman-Empire"
  ]){
    const parsed=route.parseHash(hash);
    assert.equal(parsed.entity_id,null,hash);
    assert.equal(parsed.entity_type,null,hash);
    assert.equal(parsed.canonical_hash,route.domainHash(parsed.domain),hash);
  }
});

test("entityHash fails closed to the domain route for unsupported or invalid identity",()=>{
  assert.equal(route.entityHash("persons","person",PERSON_ID),`#atlas-persons/person/${PERSON_ID.toLowerCase()}`);
  assert.equal(route.entityHash("polities","polity",POLITY_ID),`#atlas-polities/polity/${POLITY_ID.toLowerCase()}`);
  assert.equal(route.entityHash("persons","polity",POLITY_ID),"#atlas-persons");
  assert.equal(route.entityHash("events","event",PERSON_ID),"#atlas-events");
  assert.equal(route.entityHash("persons","person","Napoleon"),"#atlas-persons");
});

test("Activity deep links name one verified Person and Activity UUID without changing legacy routes",()=>{
  const activityId="AA000001-BB02-CC03-DD04-EE0000000005";
  const hash=route.activityHash(PERSON_ID,activityId);
  assert.equal(hash,`#atlas-spacetime/person/${PERSON_ID.toLowerCase()}/activity/${activityId.toLowerCase()}`);
  assert.deepEqual(route.parseHash(hash),{
    domain:"spacetime",
    entity_type:"person",
    entity_id:PERSON_ID.toLowerCase(),
    activity_id:activityId.toLowerCase(),
    canonical_hash:hash
  });
  assert.equal(route.activityHash(PERSON_ID,"not-uuid"),route.entityHash("spacetime","person",PERSON_ID));
  for(const candidate of [
    `#atlas-spacetime/person/${PERSON_ID}/activity/not-a-uuid`,
    `#atlas-spacetime/person/not-a-uuid/activity/${activityId}`,
    `#atlas-polities/polity/${POLITY_ID}/activity/${activityId}`,
    `#atlas-spacetime/person/${PERSON_ID}/activity/${activityId}/more`
  ]){
    const parsed=route.parseHash(candidate);
    assert.equal(parsed.entity_id,null,candidate);
    assert.equal(parsed.activity_id,undefined,candidate);
    assert.equal(parsed.canonical_hash,route.domainHash(parsed.domain),candidate);
  }
});

test("deep links preserve trailing separators without collapsing missing interior segments",()=>{
  const activityId="AA000001-BB02-CC03-DD04-EE0000000005";
  const canonical=route.activityHash(PERSON_ID,activityId);
  assert.equal(route.parseHash(canonical+"/").canonical_hash,canonical);
  for(const hash of [
    `#atlas-persons//person/${PERSON_ID}`,
    `#atlas-persons/person//${PERSON_ID}`,
    `#atlas-spacetime/person/${PERSON_ID}//activity/${activityId}`,
    `#atlas-spacetime/person/${PERSON_ID}/activity//${activityId}`
  ]){
    const parsed=route.parseHash(hash);
    assert.equal(parsed.entity_id,null,hash);
    assert.equal(parsed.activity_id,undefined,hash);
    assert.equal(parsed.canonical_hash,route.domainHash(parsed.domain),hash);
  }
});
