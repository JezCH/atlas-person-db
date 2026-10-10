import test from "node:test";
import assert from "node:assert/strict";
import { analyzePublicPolityCensus, REPORT_SCHEMA } from "../scripts/audit-polity-public-production-census.mjs";

const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const U="33333333-3333-4333-8333-333333333333";
const P="44444444-4444-4444-8444-444444444444";
const Q="55555555-5555-4555-8555-555555555555";
const R="66666666-6666-4666-8666-666666666666";
const sha="a".repeat(40);

function good() {
  return {
    ok:true, schema:"atlas-polity-read/v1", mode:"list",
    polities:[
      {id:A, canonical_key:"song-dynasty", polity_type:"dynasty",canonical_name_en:"Song Dynasty",
       preferred_name_ko:"송나라",names:[],activity_count:2,
       activities:[
         {id:U,person_id:P,activity_start:960,activity_end:976,chronology_status:"reviewed"},
         {id:R,person_id:Q,activity_start:1067,activity_end:1085,chronology_status:"reviewed"}
       ]},
      {id:B, canonical_key:"ancient-song", polity_type:"state",canonical_name_en:"Ancient Song",
       preferred_name_ko:"송나라",names:[],activity_count:0,activities:[]}
    ],
    summary:{total_polities:2,activity_count:2,linked_polities:1,orphan_polities:1,
      unique_linked_persons:2,unresolved_activity_count:0}
  };
}

test("entire Production census distinguishes a Korean homonym from identity duplication", () => {
  const result=analyzePublicPolityCensus(good(),{deployedSha:sha});
  assert.equal(result.schema,REPORT_SCHEMA);
  assert.equal(result.coverage.polities,2);
  assert.equal(result.coverage.activity_occurrences,2);
  assert.equal(result.coverage.unique_activity_uuids,2);
  assert.equal(result.coverage.orphan_polities,1);
  assert.equal(result.candidate_counts.exact_preferred_ko_collisions,1);
  assert.deepEqual(result.candidates.preferred_ko_collisions[0].polities.map(x=>x.id).sort(),[A,B]);
  assert.equal(result.candidate_counts.duplicate_activity_owners,0);
  assert.equal(result.candidate_counts.malformed_activity_temporal_boundaries,0);
  assert.equal(result.coverage.internal_polity_source_joins_scanned,0);
  assert.equal(result.coverage.authoring_runtime_equivalence_proven,false);
  assert.equal(result.source_boundary.orphan_is_not_retirement_authorization,true);
});

test("real anomalies are explicit review candidates, never automatically corrected", () => {
  const body=good();
  body.polities[1].activity_count=1;
  body.polities[1].activities=[{id:U,person_id:P,activity_start:100,activity_end:99,chronology_status:"reviewed"}];
  body.summary.activity_count=3;
  body.summary.linked_polities=2;
  body.summary.orphan_polities=0;
  const result=analyzePublicPolityCensus(body);
  assert.equal(result.candidate_counts.duplicate_activity_owners,1);
  assert.equal(result.candidate_counts.malformed_activity_temporal_boundaries,1);
  assert.equal(result.coverage.activity_occurrences,3);
  assert.equal(result.coverage.unique_activity_uuids,2);
});

test("unknown chronological end is separate from legitimate ongoing activity", () => {
  const body=good();
  body.polities[0].activities[0].activity_end=null;
  body.polities[0].activities[0].chronology_status="ongoing";
  body.polities[0].activities[1].activity_end=null;
  body.summary.unresolved_activity_count=1;
  const result=analyzePublicPolityCensus(body);
  assert.equal(result.candidate_counts.unresolved_activity_boundaries,1);
  assert.equal(result.candidates.unresolved_activity_boundaries[0].activity_id,R);
});

test("fail closed on mismatched summary, duplicate polity ids, missing activities, malformed UUID or undocumented schema", () => {
  const badSummary=good();badSummary.summary.activity_count=99;
  assert.throws(()=>analyzePublicPolityCensus(badSummary),/LIST_SUMMARY_DRIFT/);
  const duplicate=good();duplicate.polities[1].id=A;
  assert.throws(()=>analyzePublicPolityCensus(duplicate),/DUPLICATE_POLITY_UUID/);
  const noActivities=good();delete noActivities.polities[1].activities;
  assert.throws(()=>analyzePublicPolityCensus(noActivities),/PROJECTION_INCOMPLETE/);
  const badUuid=good();badUuid.polities[1].id="not-an-identity";
  assert.throws(()=>analyzePublicPolityCensus(badUuid),/INVALID_UUID/);
  const invalidSchema=good();invalidSchema.schema="some-other-schema";
  assert.throws(()=>analyzePublicPolityCensus(invalidSchema),/UNTRUSTED_PUBLIC_LIST_RESPONSE/);
  assert.throws(()=>analyzePublicPolityCensus(good(),{deployedSha:"main"}),/DEPLOYMENT_SHA_REQUIRED/);
});
