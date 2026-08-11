import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createSessionHandler } = require("../api/atlas-session.js");

function responseCapture() {
  let body = "";
  return {
    statusCode: null,
    headers: {},
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    end(value = "") { body = String(value); },
    get body() { return body; }
  };
}

const env = {
  ATLAS_MUTATION_TOKEN: "server-only-mutation-secret",
  ATLAS_ADMIN_PASSWORD: "human-admin-password"
};

test("session login rejects incorrect administrator password", async () => {
  const handler = createSessionHandler({ env, now: () => 1000, nonceFactory: () => "fixed" });
  const res = responseCapture();
  await handler({ method: "POST", headers: {}, body: { password: "wrong" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).error, "invalid administrator credentials");
  assert.equal(res.headers["set-cookie"], undefined);
});

test("session login issues an opaque HttpOnly cookie without exposing server token", async () => {
  const handler = createSessionHandler({ env, now: () => 1000, nonceFactory: () => "fixed", ttlMs: 5000 });
  const res = responseCapture();
  await handler({ method: "POST", headers: {}, body: { password: env.ATLAS_ADMIN_PASSWORD } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).authenticated, true);
  const cookie = res.headers["set-cookie"];
  assert.match(cookie, /^atlas_admin_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(cookie.includes(env.ATLAS_MUTATION_TOKEN), false);
  assert.equal(res.body.includes(env.ATLAS_MUTATION_TOKEN), false);
  assert.equal(res.body.includes(env.ATLAS_ADMIN_PASSWORD), false);
});

test("session status recognizes valid cookie and logout clears it", async () => {
  const handler = createSessionHandler({ env, now: () => 1000, nonceFactory: () => "fixed", ttlMs: 5000 });
  const loginRes = responseCapture();
  await handler({ method: "POST", headers: {}, body: { password: env.ATLAS_ADMIN_PASSWORD } }, loginRes);
  const cookiePair = String(loginRes.headers["set-cookie"]).split(";")[0];

  const statusRes = responseCapture();
  await handler({ method: "GET", headers: { cookie: cookiePair } }, statusRes);
  assert.equal(statusRes.statusCode, 200);
  assert.equal(JSON.parse(statusRes.body).authenticated, true);

  const logoutRes = responseCapture();
  await handler({ method: "DELETE", headers: { cookie: cookiePair } }, logoutRes);
  assert.equal(logoutRes.statusCode, 200);
  assert.equal(JSON.parse(logoutRes.body).authenticated, false);
  assert.match(logoutRes.headers["set-cookie"], /Max-Age=0/);
});

test("session endpoint reports missing server session secret as deterministic JSON 503", async () => {
  const handler = createSessionHandler({ env: { ATLAS_ADMIN_PASSWORD: "x" } });
  const res = responseCapture();
  await handler({ method: "GET", headers: {} }, res);
  assert.equal(res.statusCode, 503);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.code, "SERVER_CONFIGURATION_ERROR");
  assert.equal(body.error, "administrator session service is not configured");
});
