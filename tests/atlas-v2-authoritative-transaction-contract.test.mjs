import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const txModule = require("../server/atlas-postgres-v2-authoritative-transaction.js");

const txSource = fs.readFileSync(new URL("../server/atlas-postgres-v2-authoritative-transaction.js", import.meta.url), "utf8");
const serviceSource = fs.readFileSync(new URL("../server/atlas-v2-authoritative-mutation-service.js", import.meta.url), "utf8");

test("v2-authoritative persistence source has zero legacy table/view dependency", () => {
  assert.equal(txSource.includes("public.person_politics"), false);
  assert.equal(txSource.includes("atlas_person_politics_compat_v1"), false);
  assert.equal(txSource.includes("executeLegacy"), false);
  assert.equal(serviceSource.includes("executeLegacy"), false);
  assert.equal(serviceSource.includes("parityVerifier"), false);
  assert.match(serviceSource, /write_mode:\s*"v2-only"/);
});

test("runtime source key is deterministic and row-index scoped", () => {
  assert.equal(txModule.runtimeSourceKey("request-1", 0), "v2-runtime:request-1:0");
  assert.equal(txModule.runtimeSourceKey("request-1", 1), "v2-runtime:request-1:1");
  assert.notEqual(txModule.runtimeSourceKey("request-1", 0), txModule.runtimeSourceKey("request-2", 0));
});

test("content hash is stable across object key order and preserves explicit null role", () => {
  const a = txModule.comparablePayload({
    person_name: " A ", politic_name: " P ", activity_start: 1, activity_end: 2,
    role: "", period_basis: "reign", notes: ""
  });
  assert.deepEqual(a, {
    person_name: "A", politic_name: "P", activity_start: 1, activity_end: 2,
    role: null, period_basis: "reign", notes: null
  });
  assert.equal(txModule.contentHash({ a: 1, b: 2 }), txModule.contentHash({ b: 2, a: 1 }));
});

test("semantic key distinguishes null role from reviewed role", () => {
  const base = {
    person_id: "person", polity_id: "polity", activity_start: 1, activity_end: 2, period_basis_id: "basis"
  };
  assert.notEqual(
    txModule.semanticKey({ ...base, role_id: null }),
    txModule.semanticKey({ ...base, role_id: "role" })
  );
});

test("verification accepts localized role aliases instead of requiring English source label", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{
        activity_start: 10,
        activity_end: 20,
        notes: null,
        period_basis: "reign",
        person_match: true,
        polity_match: true,
        role_match: true
      }] };
    }
  };
  const verify = txModule.createV2VerificationVerifier(client);
  const result = await verify({
    operation: "update",
    payload: {
      value: {
        person_name: "키루스 2세",
        politic_name: "아케메네스 제국",
        activity_start: 10,
        activity_end: 20,
        role: "왕중왕",
        period_basis: "reign",
        notes: null
      }
    },
    v2: { normalized_relationship_ids: ["11111111-1111-4111-8111-111111111111"] }
  });
  assert.equal(result.match, true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /atlas_v2\.role_names/);
  assert.match(calls[0].sql, /role_match/);
  assert.equal(calls[0].params[3], "왕중왕");
});
