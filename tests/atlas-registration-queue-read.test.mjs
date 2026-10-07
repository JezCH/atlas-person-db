import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  QUEUE_TABLE,
  QUEUE_MEMBERSHIP_RULE,
  PENDING_SQL,
  SUMMARY_SQL,
  readCurrentRegistrationQueue,
  admitRegistrationQueueCandidate,
  bindRegistrationQueueCandidate
} = require("../server/atlas-registration-queue-read-service.js");
const { createHumanAuthoringService } = require("../server/atlas-human-authoring-service.js");
const { registrationQueueCandidateFromReview } = require("../server/atlas-reviewed-candidate-registration-service.js");

const PERSON_ID = "11111111-1111-4111-8111-111111111111";

test("registration queue is derived from current Production identity, not a queue-binding flag", () => {
  assert.equal(QUEUE_TABLE, "atlas_v2.person_registration_candidates");
  assert.match(QUEUE_MEMBERSHIP_RULE, /Production persons\/person_names/i);
  assert.match(PENDING_SQL, /atlas_v2\.person_names/i);
  assert.match(PENDING_SQL, /review_metadata->'lookup_names'/i);
  assert.match(PENDING_SQL, /candidate_identity_matches/i);
  assert.match(PENDING_SQL, /matched_person_count/i);
  assert.match(PENDING_SQL, /<> 1/);
  assert.doesNotMatch(PENDING_SQL, /where\s+person_id\s+is\s+null/i);
});

test("queue read exposes only unresolved current candidates and keeps ledger counts diagnostic-only", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      if (String(sql) === PENDING_SQL) {
        return { rows:[
          { candidate_id:"candidate-a", name:"Candidate A", representative_domain:"commerce", priority:"SS", review_metadata:{review_state:"APPROVED",origin:"fixture"}, identity_match_count:0 },
          { candidate_id:"candidate-b", name:"Candidate B", representative_domain:null, priority:null, review_metadata:{}, identity_match_count:2 }
        ] };
      }
      if (String(sql) === SUMMARY_SQL) {
        return { rows:[{ ledger_candidate_total:7, legacy_bound_count:3 }] };
      }
      throw new Error("unexpected query");
    }
  };

  const queue = await readCurrentRegistrationQueue({ client });
  assert.equal(queue.authority, "atlas_v2.person_registration_candidates");
  assert.match(queue.membership_rule, /unique exact normalized identity match/i);
  assert.deepEqual(queue.candidates.map((row) => row.candidate_id), ["candidate-a","candidate-b"]);
  assert.equal(queue.summary.pending_count, 2);
  assert.equal(queue.summary.current_total, 2);
  assert.equal(queue.summary.candidate_total, 2);
  assert.equal(queue.summary.ambiguous_identity_count, 1);
  assert.equal(queue.summary.ledger_candidate_total, 7);
  assert.equal(queue.summary.legacy_bound_count, 3);
  assert.equal(calls.length, 2);
});

test("approved review materializes canonical queue candidate metadata", () => {
  const candidate = registrationQueueCandidateFromReview({
    candidate_id:"commerce-new-001",
    review_state:"APPROVED",
    review_checkpoint:"review-1",
    payload_hash:"hash-1",
    reviewed_payload:{
      authoring_request:{
        person:{ canonical_name_en:"Example Merchant" },
        representative_domain:"commerce"
      },
      priority:"SS",
      origin:"reviewed_intake"
    }
  });
  assert.deepEqual(candidate, {
    candidate_id:"commerce-new-001",
    name:"Example Merchant",
    representative_domain:"commerce",
    priority:"SS",
    review_metadata:{
      review_state:"APPROVED",
      review_checkpoint:"review-1",
      payload_hash:"hash-1",
      origin:"reviewed_intake"
    }
  });
});

test("queue admission refreshes candidate metadata but does not establish Person membership state", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql:String(sql), params });
      if (/insert into atlas_v2\.person_registration_candidates/i.test(String(sql))) {
        return { rowCount:1, rows:[{ candidate_id:"candidate-new" }] };
      }
      throw new Error("unexpected query");
    }
  };

  const admitted = await admitRegistrationQueueCandidate(client, {
    candidate_id:"candidate-new",
    name:"Candidate New",
    representative_domain:"commerce",
    priority:"SS",
    review_metadata:{ review_state:"APPROVED" }
  });
  assert.equal(admitted.candidate_id, "candidate-new");
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /person_id=null/i);
});

test("legacy queue binder is validation-only and never writes candidate.person_id", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql:String(sql), params });
      if (/select candidate_id\s+from atlas_v2\.person_registration_candidates/i.test(String(sql))) {
        return { rowCount:1, rows:[{ candidate_id:"candidate-a" }] };
      }
      if (/select id::text from atlas_v2\.persons/i.test(String(sql))) {
        return { rowCount:1, rows:[{ id:PERSON_ID }] };
      }
      throw new Error("unexpected query");
    }
  };

  const result = await bindRegistrationQueueCandidate(client, {
    candidate_id:"candidate-a",
    person_id:PERSON_ID,
    required:true
  });
  assert.equal(result.membership_mutated, false);
  assert.equal(result.replay, true);
  assert.equal(calls.some((call)=>/update atlas_v2\.person_registration_candidates/i.test(call.sql)), false);
});

test("Human Authoring registration does not depend on queue binding", async () => {
  const events = [];
  const client = {
    async query(sql) {
      const command = String(sql).trim().toLowerCase();
      events.push(command);
      return { rows:[] };
    }
  };
  const service = createHumanAuthoringService({
    client,
    prepare:(raw) => ({ request:{ requestId:raw.request_id }, hash:"fixture" }),
    applyPrepared:async() => {
      events.push("apply-person");
      return { request_id:"request-a", person_id:PERSON_ID };
    }
  });

  const result = await service.apply({ request_id:"request-a" }, { candidate_id:"candidate-a" });
  assert.equal(result.person_id, PERSON_ID);
  assert.ok(events.indexOf("apply-person") < events.indexOf("commit"));
  assert.equal(events.some((event)=>event.includes("person_registration_candidates")), false);
  assert.equal(events.includes("rollback"), false);
});

test("reviewed-candidate lifecycle records registration state without mutating queue membership", () => {
  const source = fs.readFileSync(new URL("../server/atlas-reviewed-candidate-registration-service.js", import.meta.url), "utf8");
  assert.match(source, /admitRegistrationQueueCandidate/);
  assert.match(source, /await admitQueueCandidate\(/);
  assert.doesNotMatch(source, /bindRegistrationQueueCandidate/);
  assert.doesNotMatch(source, /await bindQueueCandidate\(/);
  assert.match(source, /registration_state:"REGISTERED"/);
});

test("bootstrap JSON is retained only as historical audit input, not live queue authority", () => {
  const source = JSON.parse(fs.readFileSync(new URL("../data/core/person-registration-queue-source.v1.json", import.meta.url), "utf8"));
  assert.equal(source.live_authority, false);
  assert.equal(source.authority, "historical_bootstrap_artifact");
  assert.match(source.semantics.current_view_rule, /Production/i);
  assert.match(source.semantics.current_view_rule, /identity/i);
  assert.match(source.semantics.future_add_rule, /do not append here/i);
  assert.match(source.semantics.future_add_rule, /person_registration_candidates/i);
  assert.match(source.semantics.completion_rule, /regardless of registration path/i);
});

test("legacy nullable Person FK is not the live queue membership rule", () => {
  const sql = fs.readFileSync(new URL("../db/migrations/20261003_person_registration_queue_authority.sql", import.meta.url), "utf8");
  assert.match(sql, /person_id uuid REFERENCES atlas_v2\.persons\(id\) ON DELETE RESTRICT/i);
  assert.match(QUEUE_MEMBERSHIP_RULE, /Production persons\/person_names/i);
});
