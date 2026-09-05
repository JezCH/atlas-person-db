import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { detectPersonDuplicateCandidates } = require("../server/atlas-duplicate-detector.js");

const PERSON_A = "11111111-1111-4111-8111-111111111111";
const PERSON_B = "22222222-2222-4222-8222-222222222222";
const UNRELATED_PERSON = "33333333-3333-4333-8333-333333333333";
const POLITY = "44444444-4444-4444-8444-444444444444";
const RELATION = "55555555-5555-4555-8555-555555555555";
const PERIOD_BASIS = "66666666-6666-4666-8666-666666666666";

function names() {
  return [
    { person_id: PERSON_A, name: "Same Reviewed Person", locale: "en", is_preferred: true },
    { person_id: PERSON_B, name: "Same Reviewed Person", locale: "en", is_preferred: true }
  ];
}

function legacyInvalidActivity(personId, id) {
  return {
    id,
    person_id: personId,
    polity_id: POLITY,
    relation_type_id: RELATION,
    role_id: null,
    period_basis_id: PERIOD_BASIS,
    activity_start: 1000,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: null,
    activity_start_certainty: null,
    activity_start_calendar: null,
    activity_end: 1010,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: null,
    activity_end_certainty: null,
    activity_end_calendar: null
  };
}

test("unrelated legacy Activity does not block an already nominated duplicate pair", () => {
  const candidates = detectPersonDuplicateCandidates({
    names: names(),
    activities: [legacyInvalidActivity(UNRELATED_PERSON, "77777777-7777-4777-8777-777777777777")]
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].person_low_id, PERSON_A);
  assert.equal(candidates[0].person_high_id, PERSON_B);
});

test("legacy Activity belonging to a nominated candidate remains strict-blocking", () => {
  assert.throws(
    () => detectPersonDuplicateCandidates({
      names: names(),
      activities: [legacyInvalidActivity(PERSON_A, "88888888-8888-4888-8888-888888888888")]
    }),
    /P10_ACTIVITY_NOT_SEMANTIC_V2_READY:88888888-8888-4888-8888-888888888888:/
  );
});
