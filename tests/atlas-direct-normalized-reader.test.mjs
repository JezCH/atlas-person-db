import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../atlas-reader.js", import.meta.url), "utf8");

function loadReader() {
  const window = {};
  const sandbox = { window, console };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return window.AtlasReader;
}

const validRow = {
  id: "11111111-1111-4111-8111-111111111111",
  person_name: "A",
  politic_name: "B",
  activity_start: 1,
  activity_end: 2,
  role: null,
  period_basis: "general_activity",
  notes: null
};

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    async json() { return body; }
  };
}

test("browser reader uses one same-origin v2-direct GET with no fallback", async () => {
  const reader = loadReader();
  const calls = [];
  const result = await reader.loadPersonPolitics({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(200, { ok: true, source: "v2-direct", data: [validRow] });
    }
  });
  assert.equal(reader.MARKER, "ATLAS_READER_V2_DIRECT");
  assert.equal(result.error, null);
  assert.equal(result.source, "v2-direct");
  assert.deepEqual(JSON.parse(JSON.stringify(result.data)), [validRow]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/atlas-read");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.credentials, "same-origin");
});

test("browser reader fails closed on endpoint failure instead of falling back", async () => {
  const reader = loadReader();
  let calls = 0;
  const result = await reader.loadPersonPolitics({
    fetchImpl: async () => {
      calls += 1;
      return response(503, { ok: false, error: "synthetic outage" });
    }
  });
  assert.equal(calls, 1);
  assert.equal(result.source, "v2-direct");
  assert.match(result.error.message, /synthetic outage/);
  assert.equal(result.data, null);
});

test("browser reader validates unique normalized ids and nullable role", () => {
  const reader = loadReader();
  assert.equal(reader.validateRows([validRow]).length, 0);
  const failures = reader.validateRows([validRow, { ...validRow }]);
  assert.equal(failures.some((item) => item.includes("duplicate id")), true);
});
