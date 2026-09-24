import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createPersonPortraitHandler, PORTRAIT_API_SCHEMA } = require("../server/atlas-person-portrait-handler.js");

const PERSON = "11111111-1111-4111-8111-111111111111";

function makeResponse() {
  return {
    statusCode:0,
    headers:{},
    body:"",
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(body) { this.body = String(body || ""); },
    json() { return JSON.parse(this.body); }
  };
}

function harness({ authorized = true, found = true } = {}) {
  const calls = [];
  const client = { async end() { calls.push("end"); } };
  const handler = createPersonPortraitHandler({
    env:{ SUPABASE_DB_URL:"postgres://example", ATLAS_MUTATION_TOKEN:"secret" },
    clientFactory:async () => client,
    authorizer:async () => ({ authorized }),
    storageFactory:() => ({ marker:"storage" }),
    serviceFactory:({ storage }) => ({
      async read(personId) {
        calls.push(["read", personId, storage.marker]);
        return found
          ? { found:true, person_id:personId, portrait:null }
          : { found:false, person_id:personId, portrait:null };
      },
      async put(payload) {
        calls.push(["put", payload.person_id, storage.marker]);
        return { committed:true, replay:false, found:true, person_id:payload.person_id, portrait:{ asset_sha256:"a".repeat(64) } };
      },
      async remove(personId) {
        calls.push(["remove", personId, storage.marker]);
        return { committed:true, replay:false, person_id:personId, portrait:null };
      }
    })
  });
  return { handler, calls };
}

test("portrait GET is public and returns explicit null when Person has no portrait", async () => {
  const { handler, calls } = harness();
  const res = makeResponse();
  await handler({ method:"GET", query:{ person_id:PERSON }, headers:{} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().schema, PORTRAIT_API_SCHEMA);
  assert.equal(res.json().portrait, null);
  assert.deepEqual(calls[0], ["read", PERSON, "storage"]);
});

test("portrait GET distinguishes a missing Person from a Person without a portrait", async () => {
  const { handler } = harness({ found:false });
  const res = makeResponse();
  await handler({ method:"GET", query:{ person_id:PERSON }, headers:{} }, res);
  assert.equal(res.statusCode, 404);
  assert.equal(res.json().code, "PERSON_PORTRAIT_TARGET_NOT_FOUND");
});

test("portrait PUT is admin-authenticated and delegates one canonical write payload", async () => {
  const { handler, calls } = harness();
  const res = makeResponse();
  await handler({
    method:"PUT",
    headers:{ cookie:"atlas_admin_session=fake" },
    body:{
      person_id:PERSON,
      image_base64:"AAAA"
    }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().committed, true);
  assert.deepEqual(calls[0], ["put", PERSON, "storage"]);
});

test("portrait PATCH is not part of the simple API", async () => {
  const { handler } = harness();
  const res = makeResponse();
  await handler({ method:"PATCH", headers:{}, body:{ person_id:PERSON } }, res);
  assert.equal(res.statusCode, 405);
});

test("portrait DELETE is admin-authenticated and delegates idempotent removal", async () => {
  const { handler, calls } = harness();
  const res = makeResponse();
  await handler({ method:"DELETE", headers:{}, body:{ person_id:PERSON } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().portrait, null);
  assert.deepEqual(calls[0], ["remove", PERSON, "storage"]);
});

test("portrait mutations fail before opening the database when unauthorized", async () => {
  let opened = false;
  const handler = createPersonPortraitHandler({
    env:{ SUPABASE_DB_URL:"postgres://example", ATLAS_MUTATION_TOKEN:"secret" },
    clientFactory:async () => { opened = true; return { end() {} }; },
    authorizer:async () => ({ authorized:false })
  });
  const res = makeResponse();
  await handler({ method:"PUT", headers:{}, body:{ person_id:PERSON } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.json().code, "UNAUTHORIZED");
  assert.equal(opened, false);
});

test("portrait API rejects unsupported methods", async () => {
  const { handler } = harness();
  const res = makeResponse();
  await handler({ method:"POST", headers:{}, body:{} }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.json().code, "METHOD_NOT_ALLOWED");
});
