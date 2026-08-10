import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createNormalizedReadHandler } = require("../server/atlas-normalized-read-handler.js");

function responseCapture() {
  const headers = {};
  let body = "";
  return {
    headers,
    get body() { return body; },
    setHeader(key, value) { headers[String(key).toLowerCase()] = value; },
    end(value = "") { body = String(value); }
  };
}

test("normalized read handler serves GET projection and closes database client", async () => {
  let ended = 0;
  const client = {
    async query() {
      return { rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        person_name: "A",
        politic_name: "B",
        activity_start: 1,
        activity_end: 2,
        role: null,
        period_basis: "general_activity",
        notes: null
      }] };
    },
    async end() { ended += 1; }
  };
  const handler = createNormalizedReadHandler({
    env: { SUPABASE_DB_URL: "postgresql://example.invalid/db" },
    clientFactory: async () => client
  });
  const res = responseCapture();
  await handler({ method: "GET" }, res);
  const body = JSON.parse(res.body);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.source, "v2-direct");
  assert.equal(body.data.length, 1);
  assert.equal(ended, 1);
});

test("normalized read handler rejects non-GET before opening database", async () => {
  let clients = 0;
  const handler = createNormalizedReadHandler({
    env: { SUPABASE_DB_URL: "postgresql://example.invalid/db" },
    clientFactory: async () => { clients += 1; throw new Error("must not open"); }
  });
  const res = responseCapture();
  await handler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(clients, 0);
});
