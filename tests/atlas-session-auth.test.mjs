import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SESSION_COOKIE,
  bearerToken,
  parseCookies,
  safeTokenEqual,
  issueSessionToken,
  verifySessionToken,
  sessionCookie,
  createMutationAuthorizer
} = require("../server/atlas-session-auth.js");

test("session auth preserves strict bearer parsing and exact comparison", () => {
  assert.equal(bearerToken({ authorization: "Bearer secret" }), "secret");
  assert.equal(bearerToken({ authorization: "Basic secret" }), null);
  assert.equal(safeTokenEqual("secret", "secret"), true);
  assert.equal(safeTokenEqual("secret", "other"), false);
});

test("signed session token verifies only before expiry and rejects tampering", () => {
  const token = issueSessionToken("mutation-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  assert.equal(verifySessionToken(token, "mutation-secret", { now: 2000 }), true);
  assert.equal(verifySessionToken(token, "mutation-secret", { now: 6000 }), false);
  assert.equal(verifySessionToken(`${token}x`, "mutation-secret", { now: 2000 }), false);
  assert.equal(verifySessionToken(token, "wrong-secret", { now: 2000 }), false);
  assert.equal(token.includes("mutation-secret"), false);
});

test("session cookie is HttpOnly, Secure and SameSite Strict", () => {
  const token = issueSessionToken("mutation-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  const cookie = sessionCookie(token, { maxAgeSeconds: 5 });
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(cookie.includes("mutation-secret"), false);
  const parsed = parseCookies({ cookie });
  assert.equal(parsed[SESSION_COOKIE], token);
});

test("mutation authorizer accepts server bearer or signed browser session", async () => {
  const env = { ATLAS_MUTATION_TOKEN: "mutation-secret" };
  const now = () => 2000;
  const authorize = createMutationAuthorizer({ env, now });

  assert.deepEqual(
    await authorize({ headers: { authorization: "Bearer mutation-secret" } }),
    { authorized: true, method: "bearer" }
  );

  const token = issueSessionToken("mutation-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  assert.deepEqual(
    await authorize({ headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } }),
    { authorized: true, method: "session" }
  );

  assert.deepEqual(await authorize({ headers: {} }), { authorized: false, reason: "unauthorized" });
});
