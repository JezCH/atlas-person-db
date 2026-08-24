"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createHumanAuthoringService
} = require("../server/atlas-human-authoring-service.js");
const {
  HUMAN_AUTHORING_BATCH_MARKER,
  HUMAN_AUTHORING_BATCH_SCHEMA,
  batchFailureBody,
  statusForError
} = require("../server/atlas-human-authoring-handler.js");

function createRecordingClient() {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql:String(sql), params });
      return { rows:[] };
    }
  };
}

function prepareStub(rawRequest) {
  if (rawRequest.failPrepare) throw new Error("HUMAN_AUTHORING_PERSON_REQUIRED");
  return Object.freeze({
    rawRequest,
    request:Object.freeze({ requestId:String(rawRequest.request_id) }),
    hash:`hash:${rawRequest.request_id}`
  });
}

function countSql(client, exact) {
  return client.calls.filter((call) => call.sql.trim().toLowerCase() === exact).length;
}

function lockIds(client) {
  return client.calls
    .filter((call) => call.sql.includes("pg_advisory_xact_lock"))
    .map((call) => String(call.params[0]).replace(/^atlas-human-authoring:/, ""));
}

test("single apply keeps one serializable transaction boundary", async () => {
  const client = createRecordingClient();
  const service = createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async (_client, prepared) => ({ request_id:prepared.request.requestId })
  });

  const result = await service.apply({ request_id:"single" });
  assert.equal(result.request_id, "single");
  assert.equal(countSql(client, "begin isolation level serializable"), 1);
  assert.equal(countSql(client, "commit"), 1);
  assert.equal(countSql(client, "rollback"), 0);
  assert.deepEqual(lockIds(client), ["single"]);
});

test("batch uses one transaction, sorted locks, and preserves input result order", async () => {
  const client = createRecordingClient();
  const executionOrder = [];
  const service = createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async (_client, prepared) => {
      executionOrder.push(prepared.request.requestId);
      return { request_id:prepared.request.requestId };
    }
  });

  const results = await service.applyBatch([
    { request_id:"request-b" },
    { request_id:"request-a" }
  ], {
    transports:[{ manifest_path:"authoring/requests/b.json" }, { manifest_path:"authoring/requests/a.json" }]
  });

  assert.equal(countSql(client, "begin isolation level serializable"), 1);
  assert.equal(countSql(client, "commit"), 1);
  assert.equal(countSql(client, "rollback"), 0);
  assert.deepEqual(lockIds(client), ["request-a", "request-b"]);
  assert.deepEqual(executionOrder, ["request-b", "request-a"]);
  assert.deepEqual(results.map((result) => result.request_id), ["request-b", "request-a"]);
});

test("failure on a later batch item rolls the whole transaction back", async () => {
  const client = createRecordingClient();
  let applied = 0;
  const service = createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async (_client, prepared) => {
      applied += 1;
      if (prepared.request.requestId === "request-b") throw new Error("HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS");
      return { request_id:prepared.request.requestId };
    }
  });

  await assert.rejects(
    service.applyBatch(
      [{ request_id:"request-a" }, { request_id:"request-b" }],
      { transports:[{ manifest_path:"authoring/requests/a.json" }, { manifest_path:"authoring/requests/b.json" }] }
    ),
    (error) => {
      assert.equal(error.message, "HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS");
      assert.equal(error.batchIndex, 1);
      assert.equal(error.manifestPath, "authoring/requests/b.json");
      return true;
    }
  );

  assert.equal(applied, 2);
  assert.equal(countSql(client, "begin isolation level serializable"), 1);
  assert.equal(countSql(client, "commit"), 0);
  assert.equal(countSql(client, "rollback"), 1);
});

test("duplicate request ids are rejected before opening a transaction", async () => {
  const client = createRecordingClient();
  const service = createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async () => { throw new Error("should not run"); }
  });

  await assert.rejects(
    service.applyBatch(
      [{ request_id:"duplicate" }, { request_id:"duplicate" }],
      { transports:[{ manifest_path:"authoring/requests/a.json" }, { manifest_path:"authoring/requests/b.json" }] }
    ),
    (error) => {
      assert.equal(error.message, "HUMAN_AUTHORING_BATCH_DUPLICATE_REQUEST_ID");
      assert.equal(error.batchIndex, 1);
      assert.equal(error.manifestPath, "authoring/requests/b.json");
      return true;
    }
  );

  assert.equal(client.calls.length, 0);
});

test("all batch requests are normalized before opening a transaction", async () => {
  const client = createRecordingClient();
  const service = createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async () => { throw new Error("should not run"); }
  });

  await assert.rejects(
    service.applyBatch(
      [{ request_id:"valid" }, { request_id:"invalid", failPrepare:true }],
      { transports:[{ manifest_path:"authoring/requests/a.json" }, { manifest_path:"authoring/requests/b.json" }] }
    ),
    (error) => {
      assert.equal(error.message, "HUMAN_AUTHORING_PERSON_REQUIRED");
      assert.equal(error.batchIndex, 1);
      assert.equal(error.manifestPath, "authoring/requests/b.json");
      return true;
    }
  );

  assert.equal(client.calls.length, 0);
});

test("batch failure contract exposes rollback state without partial-success payloads", () => {
  const auth = {
    method:"github_oidc",
    batch:{ requests:[{}, {}] }
  };
  const error = new Error("HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS");
  error.batchIndex = 1;
  error.manifestPath = "authoring/requests/b.json";

  const body = batchFailureBody(auth, error, error.message);
  assert.equal(statusForError(error.message), 409);
  assert.deepEqual(body, {
    ok:false,
    auth_method:"github_oidc",
    marker:HUMAN_AUTHORING_BATCH_MARKER,
    schema:HUMAN_AUTHORING_BATCH_SCHEMA,
    code:"HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS",
    committed:false,
    count:2,
    failed_index:1,
    manifest_path:"authoring/requests/b.json"
  });
  assert.equal(Object.hasOwn(body, "results"), false);
  assert.equal(Object.hasOwn(body, "succeeded_count"), false);
});
