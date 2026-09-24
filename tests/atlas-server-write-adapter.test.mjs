import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createAdapter } = require("../atlas-server-write-adapter.js");

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() { return body; }
  };
}

function committed(operation, normalizedIds = ["v2-id"]) {
  return {
    ok: true,
    outcome: {
      write_mode: "v2-only",
      request_id: `request-${operation}`,
      operation,
      committed: true,
      legacy: { attempted: false, committed: false, record_ids: [] },
      v2: { committed: true, normalized_relationship_ids: normalizedIds },
      verification: { checked: true, match: true },
      parity: null,
      rollback: false,
      validation_failures: [],
      transaction_failure: null
    }
  };
}

test("server adapter uses HttpOnly session flow and exposes v2-only outcome", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/atlas-session") return jsonResponse(200, { ok: true, authenticated: true });
    return jsonResponse(200, committed("create"));
  };

  const adapter = createAdapter({ fetchImpl, credentialProvider: async () => { throw new Error("prompt should not run"); } });
  const result = await adapter.createActivity({ person_name: "A" });
  assert.equal(result.committed, true);
  assert.equal(result.legacy.attempted, false);
  assert.equal(result.legacy.committed, false);
  assert.equal(result.v2.committed, true);
  assert.equal(result.mode, "server-v2-only");
  assert.equal(result.write_mode, "v2-only");
  assert.equal(result.errors.length, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls.every((call) => call.options.credentials === "same-origin"), true);
  assert.equal(calls.some((call) => Object.keys(call.options.headers || {}).some((key) => key.toLowerCase() === "authorization")), false);
});

test("server adapter sends normalized relationship id unchanged for update", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/atlas-session" && options.method === "GET") return jsonResponse(200, { ok: true, authenticated: false });
    if (url === "/api/atlas-session" && options.method === "POST") {
      assert.deepEqual(JSON.parse(options.body), { password: "admin-pass" });
      return jsonResponse(200, { ok: true, authenticated: true });
    }
    const request = JSON.parse(options.body);
    assert.equal(request.operation, "update");
    assert.equal(request.payload.id, "normalized-1");
    return jsonResponse(200, committed("update", ["normalized-1"]));
  };

  let credentialCalls = 0;
  const adapter = createAdapter({
    fetchImpl,
    credentialProvider: async () => { credentialCalls += 1; return "admin-pass"; }
  });
  const result = await adapter.updateActivity("normalized-1", { person_name: "A" });
  assert.equal(result.v2.committed, true);
  assert.deepEqual(result.v2.normalized_relationship_ids, ["normalized-1"]);
  assert.equal(credentialCalls, 1);
  assert.deepEqual(calls.map((call) => `${call.options.method}:${call.url}`), [
    "GET:/api/atlas-session",
    "POST:/api/atlas-session",
    "POST:/api/atlas-mutate"
  ]);
});

test("server adapter fails closed when administrator credential is cancelled", async () => {
  const fetchImpl = async () => jsonResponse(200, { ok: true, authenticated: false });
  const adapter = createAdapter({ fetchImpl, credentialProvider: async () => null });
  const result = await adapter.deleteActivity("normalized-1");
  assert.equal(result.committed, false);
  assert.equal(result.v2.committed, false);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /authentication is required/);
  assert.equal(result.http_status, 401);
});

test("server adapter re-authenticates once when mutation session expires", async () => {
  let mutationCalls = 0;
  let credentialCalls = 0;
  const fetchImpl = async (url, options = {}) => {
    if (url === "/api/atlas-session" && options.method === "GET") return jsonResponse(200, { ok: true, authenticated: true });
    if (url === "/api/atlas-session" && options.method === "POST") return jsonResponse(200, { ok: true, authenticated: true });
    mutationCalls += 1;
    if (mutationCalls === 1) return jsonResponse(401, { ok: false, error: "unauthorized" });
    return jsonResponse(200, committed("delete", ["normalized-1"]));
  };
  const adapter = createAdapter({
    fetchImpl,
    credentialProvider: async () => { credentialCalls += 1; return "admin-pass"; }
  });
  const result = await adapter.deleteActivity("normalized-1");
  assert.equal(result.v2.committed, true);
  assert.equal(mutationCalls, 2);
  assert.equal(credentialCalls, 1);
});

test("server adapter rejects a stale dual-write server deployment", async () => {
  const fetchImpl = async (url) => {
    if (url === "/api/atlas-session") return jsonResponse(200, { ok: true, authenticated: true });
    return jsonResponse(200, {
      ok: true,
      outcome: {
        write_mode: "dual-write",
        committed: true,
        legacy: { committed: true },
        v2: { committed: true, normalized_relationship_ids: ["v2-id"] }
      }
    });
  };
  const adapter = createAdapter({ fetchImpl, credentialProvider: async () => "unused" });
  const result = await adapter.createActivity({ person_name: "A" });
  assert.equal(result.committed, false);
  assert.match(result.errors[0], /unexpected server write mode/);
});


test("server adapter uploads Person portrait through authenticated consolidated portrait mutation surface", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/atlas-session") return jsonResponse(200, { ok:true, authenticated:true });
    assert.equal(url, "/api/atlas-mutate?__atlas_mutation_surface=person-portrait");
    assert.equal(options.method, "PUT");
    const body = JSON.parse(options.body);
    assert.equal(body.person_id, "11111111-1111-4111-8111-111111111111");
    assert.equal(body.image_base64, "QUJD");
    return jsonResponse(200, {
      ok:true,
      schema:"atlas-person-portrait/v1",
      committed:true,
      replay:false,
      person_id:body.person_id,
      portrait:{ asset_sha256:"a".repeat(64) }
    });
  };
  const adapter = createAdapter({ fetchImpl, credentialProvider:async () => "unused" });
  const result = await adapter.setPersonPortrait({
    person_id:"11111111-1111-4111-8111-111111111111",
    image_base64:"QUJD"
  });
  assert.equal(result.committed, true);
  assert.equal(result.operation, "set_person_portrait");
  assert.equal(result.errors.length, 0);
  assert.deepEqual(calls.map((call) => `${call.options.method}:${call.url}`), [
    "GET:/api/atlas-session",
    "PUT:/api/atlas-mutate?__atlas_mutation_surface=person-portrait"
  ]);
});

test("server adapter deletes Person portrait through authenticated consolidated portrait mutation surface", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === "/api/atlas-session") return jsonResponse(200, { ok:true, authenticated:true });
    assert.equal(url, "/api/atlas-mutate?__atlas_mutation_surface=person-portrait");
    assert.equal(options.method, "DELETE");
    assert.deepEqual(JSON.parse(options.body), {
      person_id:"11111111-1111-4111-8111-111111111111"
    });
    return jsonResponse(200, {
      ok:true,
      schema:"atlas-person-portrait/v1",
      committed:true,
      replay:false,
      person_id:"11111111-1111-4111-8111-111111111111",
      portrait:null,
      storage_cleanup:{ attempted:true, ok:true }
    });
  };
  const adapter = createAdapter({ fetchImpl, credentialProvider:async () => "unused" });
  const result = await adapter.deletePersonPortrait("11111111-1111-4111-8111-111111111111");
  assert.equal(result.committed, true);
  assert.equal(result.operation, "delete_person_portrait");
  assert.equal(result.portrait, null);
  assert.deepEqual(calls.map((call) => `${call.options.method}:${call.url}`), [
    "GET:/api/atlas-session",
    "DELETE:/api/atlas-mutate?__atlas_mutation_surface=person-portrait"
  ]);
});

test("portrait mutation surfaces server error codes through the same adapter failure contract", async () => {
  const fetchImpl = async (url) => {
    if (url === "/api/atlas-session") return jsonResponse(200, { ok:true, authenticated:true });
    return jsonResponse(400, { ok:false, schema:"atlas-person-portrait/v1", code:"PERSON_PORTRAIT_WEBP_REQUIRED" });
  };
  const adapter = createAdapter({ fetchImpl, credentialProvider:async () => "unused" });
  const result = await adapter.setPersonPortrait({
    person_id:"11111111-1111-4111-8111-111111111111",
    image_base64:"QUJD"
  });
  assert.equal(result.committed, false);
  assert.deepEqual(result.errors, ["PERSON_PORTRAIT_WEBP_REQUIRED"]);
  assert.equal(result.http_status, 400);
});
