import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createAdminWriteService } = require("../atlas-admin-write-service.js");

const row = {
  person_name: "Ada Lovelace",
  politic_name: "United Kingdom",
  activity_start: 1842,
  activity_end: 1852,
  role: "Mathematician",
  period_basis: "intellectual_activity",
  notes: null
};

function readResponse(data) {
  return {
    ok: true,
    status: 200,
    async json() { return { ok: true, source: "v2-direct", data }; }
  };
}

function fakeAdapterApi({ fail = false } = {}) {
  const calls = [];
  return {
    calls,
    createAdapter() {
      return {
        mode: "server-v2-only",
        async createActivity(payload) {
          calls.push(["create", payload]);
          return fail
            ? { committed: false, v2: { committed: false }, errors: ["synthetic failure"] }
            : { committed: true, v2: { committed: true, normalized_relationship_ids: [`new-v2-id-${calls.length}`] }, errors: [] };
        },
        async updateActivity(id, payload) {
          calls.push(["update", id, payload]);
          return fail
            ? { committed: false, v2: { committed: false }, errors: ["synthetic failure"] }
            : { committed: true, v2: { committed: true, normalized_relationship_ids: [id] }, errors: [] };
        }
      };
    }
  };
}

test("admin creates through v2-only server adapter after one direct normalized lookup", async () => {
  let reads = 0;
  const adapterApi = fakeAdapterApi();
  const service = createAdminWriteService({
    adapterApi,
    fetchImpl: async () => { reads += 1; return readResponse([]); }
  });
  const result = await service.saveRows([row]);
  assert.equal(reads, 1);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.deepEqual(result.failures, []);
  assert.equal(result.mode, "server-v2-only");
  assert.deepEqual(adapterApi.calls.map((call) => call[0]), ["create"]);
});

test("admin updates exact normalized relationship id from full semantic projection", async () => {
  const adapterApi = fakeAdapterApi();
  const service = createAdminWriteService({
    adapterApi,
    fetchImpl: async () => readResponse([{ ...row, id: "normalized-7" }])
  });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 1);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(adapterApi.calls[0].slice(0, 2), ["update", "normalized-7"]);
});

test("same person polity and dates with a different role remains a distinct relationship", async () => {
  const adapterApi = fakeAdapterApi();
  const service = createAdminWriteService({
    adapterApi,
    fetchImpl: async () => readResponse([{ ...row, id: "normalized-7" }])
  });
  const changedRole = { ...row, role: "Programmer" };
  const result = await service.saveRows([changedRole]);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
  assert.equal(adapterApi.calls[0][0], "create");
});

test("same person polity dates and role with a different period basis remains distinct", async () => {
  const adapterApi = fakeAdapterApi();
  const service = createAdminWriteService({
    adapterApi,
    fetchImpl: async () => readResponse([{ ...row, id: "normalized-7" }])
  });
  const changedBasis = { ...row, period_basis: "general_activity" };
  const result = await service.saveRows([changedBasis]);
  assert.equal(result.inserted, 1);
  assert.equal(result.updated, 0);
});

test("admin fails closed when normalized semantic activity lookup is ambiguous", async () => {
  const adapterApi = fakeAdapterApi();
  const service = createAdminWriteService({
    adapterApi,
    fetchImpl: async () => readResponse([
      { ...row, id: "normalized-1" },
      { ...row, id: "normalized-2" }
    ])
  });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /ambiguous/);
  assert.equal(adapterApi.calls.length, 0);
});

test("admin does not manufacture a browser database fallback when direct read fails", async () => {
  const adapterApi = fakeAdapterApi();
  const service = createAdminWriteService({
    adapterApi,
    fetchImpl: async () => ({
      ok: false,
      status: 503,
      async json() { return { ok: false, error: "read unavailable" }; }
    })
  });
  const result = await service.saveRows([row]);
  assert.equal(result.inserted, 0);
  assert.equal(result.updated, 0);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /read unavailable/);
  assert.equal(adapterApi.calls.length, 0);
});
