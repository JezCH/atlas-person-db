import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  loadQueueSource,
  normalizeLookupName,
  readCurrentRegistrationQueue
} = require("../server/atlas-registration-queue-read-service.js");

test("registration queue source bootstraps 646 historical admissions plus 55 approved commerce additions", () => {
  const source = loadQueueSource();
  assert.equal(source.candidates.length, 701);
  assert.equal(source.bootstrap.historical_queued_candidates, 646);
  assert.equal(source.bootstrap.added_commerce_candidates, 55);
  const ids = new Set(source.candidates.map((row) => row.candidate_id));
  assert.equal(ids.size, 701);
  const commerceAdds = source.candidates.filter((row) => row.origin === "commerce_world_history_20261003");
  assert.equal(commerceAdds.length, 55);
  assert.ok(commerceAdds.every((row) => row.representative_domain === "commerce"));
});

test("lookup normalization is exact but tolerant of accents and punctuation", () => {
  assert.equal(normalizeLookupName("Estée Lauder"), normalizeLookupName("Estee Lauder"));
  assert.equal(normalizeLookupName("A.P. Møller"), normalizeLookupName("A P Moller"));
  assert.notEqual(normalizeLookupName("John Law"), normalizeLookupName("John Locke"));
});

test("live queue removes terminal registration states and exact unique canonical persons while retaining ambiguous identities", async () => {
  const source = {
    schema:"atlas-core/person-registration-queue-source/v1",
    version:1,
    generated_at:"2026-10-03",
    candidates:[
      { candidate_id:"a", name:"Already Registered", lookup_names:["Already Registered"], representative_domain:"commerce", origin:"fixture" },
      { candidate_id:"b", name:"Existing Person", lookup_names:["Existing Person"], representative_domain:"commerce", origin:"fixture" },
      { candidate_id:"c", name:"Ambiguous Name", lookup_names:["Ambiguous Name"], representative_domain:"commerce", origin:"fixture" },
      { candidate_id:"d", name:"Pending Person", lookup_names:["Pending Person"], representative_domain:"commerce", origin:"fixture" },
      { candidate_id:"e", name:"Rejected Person", lookup_names:["Rejected Person"], representative_domain:"commerce", origin:"fixture" }
    ]
  };
  const client = {
    async query(sql) {
      if (/person_candidate_registration_states/.test(sql)) {
        return { rows:[
          { candidate_id:"a", review_revision:1, registration_state:"REGISTERED", person_id:"11111111-1111-4111-8111-111111111111" },
          { candidate_id:"d", review_revision:2, registration_state:"QUEUED", person_id:null },
          { candidate_id:"e", review_revision:3, registration_state:"NOT_APPLICABLE", person_id:null }
        ] };
      }
      if (/person_names/.test(sql)) {
        return { rows:[
          { person_id:"22222222-2222-4222-8222-222222222222", name:"Existing Person" },
          { person_id:"33333333-3333-4333-8333-333333333333", name:"Ambiguous Name" },
          { person_id:"44444444-4444-4444-8444-444444444444", name:"Ambiguous Name" }
        ] };
      }
      throw new Error("unexpected query");
    }
  };

  const queue = await readCurrentRegistrationQueue({ client, source });
  assert.deepEqual(queue.candidates.map((row) => row.candidate_id), ["c","d"]);
  assert.equal(queue.candidates[0].identity_resolution, "AMBIGUOUS_EXISTING");
  assert.equal(queue.candidates[1].registration_state, "QUEUED");
  assert.equal(queue.summary.source_admissions, 5);
  assert.equal(queue.summary.current_total, 2);
  assert.equal(queue.summary.removed_registered_state, 1);
  assert.equal(queue.summary.removed_not_applicable, 1);
  assert.equal(queue.summary.removed_existing_person, 1);
  assert.equal(queue.summary.ambiguous_existing_identity, 1);
});
