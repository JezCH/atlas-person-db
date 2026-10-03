import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  QUEUE_TABLE,
  PENDING_SQL,
  SUMMARY_SQL,
  readCurrentRegistrationQueue,
  admitRegistrationQueueCandidate,
  bindRegistrationQueueCandidate
} = require("../server/atlas-registration-queue-read-service.js");
const { createHumanAuthoringService } = require("../server/atlas-human-authoring-service.js");
const { registrationQueueCandidateFromReview } = require("../server/atlas-reviewed-candidate-registration-service.js");

const PERSON_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_PERSON_ID = "22222222-2222-4222-8222-222222222222";

test("registration queue membership is a single canonical DB predicate", () => {
  assert.equal(QUEUE_TABLE, "atlas_v2.person_registration_candidates");
  assert.match(PENDING_SQL, /from atlas_v2\.person_registration_candidates/i);
  assert.match(PENDING_SQL, /where person_id is null/i);
  assert.doesNotMatch(PENDING_SQL, /person_names|lookup_names|registration_state|similarity|alias/i);

  const serviceSource = fs.readFileSync(new URL("../server/atlas-registration-queue-read-service.js", import.meta.url), "utf8");
  assert.doesNotMatch(serviceSource, /person-registration-queue-source|readFileSync|normalizeLookupName|exactPersonMatches/i);
});

test("queue read returns every DB row whose person_id is NULL with usable candidate metadata", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      if (String(sql) === SUMMARY_SQL) {
        return { rows:[{ candidate_total:3, current_total:2, registered_bound:1, dangling_person_ids:0 }] };
      }
      if (String(sql) === PENDING_SQL) {
        return { rows:[
          { candidate_id:"candidate-a", name:"Candidate A", representative_domain:"commerce", priority:"SS", review_metadata:{review_state:"APPROVED",origin:"fixture"} },
          { candidate_id:"candidate-b", name:"Candidate B", representative_domain:null, priority:null, review_metadata:{} }
        ] };
      }
      throw new Error("unexpected query");
    }
  };

  const queue = await readCurrentRegistrationQueue({ client });
  assert.equal(queue.authority, "atlas_v2.person_registration_candidates");
  assert.equal(queue.membership_rule, "person_id IS NULL");
  assert.deepEqual(queue.candidates.map((row) => row.candidate_id), ["candidate-a","candidate-b"]);
  assert.equal(queue.candidates[0].priority, "SS");
  assert.equal(queue.candidates[0].representative_domain, "commerce");
  assert.equal(queue.summary.current_total, 2);
  assert.equal(queue.summary.registered_bound, 1);
  assert.equal(queue.summary.dangling_person_ids, 0);
  assert.equal(calls.length, 2);
});

test("approved review materializes canonical queue candidate metadata without name matching", () => {
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

test("canonical queue admission inserts or refreshes the same DB row with person_id NULL", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql:String(sql), params });
      if (/insert into atlas_v2\.person_registration_candidates/i.test(String(sql))) {
        return { rowCount:1, rows:[{ candidate_id:"candidate-new", person_id:null }] };
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
  assert.equal(admitted.person_id, null);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /person_id\s*\)\s*values\([^)]*null\)/i);
  assert.match(calls[0].sql, /where atlas_v2\.person_registration_candidates\.person_id is null/i);
});

test("binding writes the canonical Person UUID onto the same candidate row and is idempotent", async () => {
  let currentPersonId = null;
  const client = {
    async query(sql, params) {
      const text = String(sql);
      if (/select candidate_id,person_id::text/.test(text)) {
        return { rows:[{ candidate_id:"candidate-a", person_id:currentPersonId }] };
      }
      if (/update atlas_v2\.person_registration_candidates/.test(text)) {
        currentPersonId = String(params[1]);
        return { rowCount:1, rows:[{ candidate_id:"candidate-a", person_id:currentPersonId }] };
      }
      throw new Error("unexpected query");
    }
  };

  const first = await bindRegistrationQueueCandidate(client, { candidate_id:"candidate-a", person_id:PERSON_ID, required:true });
  assert.equal(first.replay, false);
  assert.equal(currentPersonId, PERSON_ID);

  const replay = await bindRegistrationQueueCandidate(client, { candidate_id:"candidate-a", person_id:PERSON_ID, required:true });
  assert.equal(replay.replay, true);

  await assert.rejects(
    bindRegistrationQueueCandidate(client, { candidate_id:"candidate-a", person_id:OTHER_PERSON_ID, required:true }),
    /REGISTRATION_QUEUE_PERSON_BINDING_CONFLICT/
  );
});

test("Human Authoring closes Person write and queue binding inside one serializable mutation boundary", async () => {
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
    },
    bindQueueCandidate:async(_client,input) => {
      events.push(`bind:${input.candidate_id}:${input.person_id}`);
      return { ...input, replay:false };
    }
  });

  await service.apply({ request_id:"request-a" }, { candidate_id:"candidate-a" });
  assert.ok(events.indexOf("apply-person") < events.indexOf(`bind:candidate-a:${PERSON_ID}`));
  assert.ok(events.indexOf(`bind:candidate-a:${PERSON_ID}`) < events.indexOf("commit"));
  assert.equal(events.includes("rollback"), false);
});

test("queue-binding failure rolls the Person mutation back instead of accepting a partial success", async () => {
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
    applyPrepared:async() => ({ request_id:"request-a", person_id:PERSON_ID }),
    bindQueueCandidate:async() => { throw new Error("REGISTRATION_QUEUE_PERSON_BINDING_FAILED"); }
  });

  await assert.rejects(
    service.apply({ request_id:"request-a" }, { candidate_id:"candidate-a" }),
    /REGISTRATION_QUEUE_PERSON_BINDING_FAILED/
  );
  assert.equal(events.includes("commit"), false);
  assert.equal(events.includes("rollback"), true);
});

test("reviewed-candidate lifecycle admits approved candidates and binds them before terminal success", () => {
  const source = fs.readFileSync(new URL("../server/atlas-reviewed-candidate-registration-service.js", import.meta.url), "utf8");
  assert.match(source, /admitRegistrationQueueCandidate/);
  assert.match(source, /await admitQueueCandidate\(/);
  assert.match(source, /bindRegistrationQueueCandidate/);
  assert.ok((source.match(/await bindQueueCandidate\(/g) || []).length >= 2);
  assert.match(source, /registration_state:"REGISTERED"/);
});

test("bootstrap JSON is retained only as historical audit input, not live authority", () => {
  const source = JSON.parse(fs.readFileSync(new URL("../data/core/person-registration-queue-source.v1.json", import.meta.url), "utf8"));
  assert.equal(source.live_authority, false);
  assert.equal(source.authority, "historical_bootstrap_artifact");
  assert.match(source.semantics.current_view_rule, /person_registration_candidates.*person_id IS NULL/i);
  assert.match(source.semantics.future_add_rule, /do not append here/i);
  assert.match(source.semantics.future_add_rule, /insert new candidates directly into atlas_v2\.person_registration_candidates/i);
});

test("canonical queue migration encodes the nullable Person FK invariant without a binding table", () => {
  const sql = fs.readFileSync(new URL("../db/migrations/20261003_person_registration_queue_authority.sql", import.meta.url), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_registration_candidates/i);
  assert.match(sql, /person_id uuid REFERENCES atlas_v2\.persons\(id\) ON DELETE RESTRICT/i);
  assert.match(sql, /WHERE person_id IS NULL/i);
  assert.doesNotMatch(sql, /candidate_person_bind|binding_table|fuzzy|similarity/i);
});


test("Person merge preserves queue bindings by rebinding source UUIDs to the survivor", () => {
  const source = fs.readFileSync(new URL("../server/atlas-person-merge-service.js", import.meta.url), "utf8");
  assert.match(source, /update atlas_v2\.person_registration_candidates[\s\S]*set person_id=\$2::uuid/);
  assert.match(source, /registration_candidates_moved/);
});
