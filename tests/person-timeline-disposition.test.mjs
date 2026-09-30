import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const timeline=require("../server/atlas-person-timeline-service.js");

test("timeline disposition vocabulary keeps identity separate from timeline eligibility", () => {
  assert.deepEqual(timeline.DISPOSITIONS,["timeline","chronology_unresolved","legendary","mythical","other_reviewed_exclusion"]);
});
test("timeline inclusion forbids exclusion-only metadata", () => {
  assert.deepEqual(timeline.normalizeTimelineDisposition({disposition:"timeline"}),{disposition:"timeline",reason:null,basis_code:null,traditional_year:null,traditional_year_alternative:null,review_evidence:{}});
  assert.throws(()=>timeline.normalizeTimelineDisposition({disposition:"timeline",reason:"legacy residue"}),/PERSON_TIMELINE_INCLUDED_PAYLOAD_MUST_BE_EMPTY/);
});
test("reviewed exclusions require reason and preserve evidence", () => {
  const row=timeline.normalizeTimelineDisposition({disposition:"chronology_unresolved",reason:"individual activity chronology cannot be defended",basis_code:"reviewed_non_timeline",traditional_year:1200,review_evidence:{source:"reviewed migration"}});
  assert.equal(row.disposition,"chronology_unresolved");
  assert.deepEqual(row.review_evidence,{source:"reviewed migration"});
  assert.throws(()=>timeline.normalizeTimelineDisposition({disposition:"legendary"}),/PERSON_TIMELINE_EXCLUSION_REASON_REQUIRED/);
});
test("timeline disposition equality is semantic, not JSON key-order dependent", () => {
  const left={person_id:"00000000-0000-4000-8000-000000000001",disposition:"chronology_unresolved",reason:"reviewed",basis_code:"source",traditional_year:null,traditional_year_alternative:null,review_evidence:{a:1,b:2}};
  const right={...left,review_evidence:{b:2,a:1}};
  assert.equal(timeline.sameTimelineDisposition(left,right),true);
  assert.deepEqual(timeline.timelineDispositionMismatchFields(left,right),[]);
});
