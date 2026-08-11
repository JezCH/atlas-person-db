import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SESSION_COOKIE,
  bearerToken,
  parseCookies,
  safeTokenEqual,
  sessionSecret,
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

test("session secret prefers dedicated secret and falls back only for deployment compatibility", () => {
  assert.equal(sessionSecret({ ATLAS_SESSION_SECRET: "session-secret", ATLAS_MUTATION_TOKEN: "mutation-secret" }), "session-secret");
  assert.equal(sessionSecret({ ATLAS_MUTATION_TOKEN: "mutation-secret" }), "mutation-secret");
  assert.throws(() => sessionSecret({}), /ATLAS_MUTATION_TOKEN is required/);
});

test("signed session token verifies only before expiry and rejects tampering", () => {
  const token = issueSessionToken("session-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  assert.equal(verifySessionToken(token, "session-secret", { now: 2000 }), true);
  assert.equal(verifySessionToken(token, "session-secret", { now: 6000 }), false);
  assert.equal(verifySessionToken(`${token}x`, "session-secret", { now: 2000 }), false);
  assert.equal(verifySessionToken(token, "wrong-secret", { now: 2000 }), false);
  assert.equal(token.includes("session-secret"), false);
});

test("session cookie is HttpOnly, Secure and SameSite Strict", () => {
  const token = issueSessionToken("session-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  const cookie = sessionCookie(token, { maxAgeSeconds: 5 });
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(cookie.includes("session-secret"), false);
  const parsed = parseCookies({ cookie });
  assert.equal(parsed[SESSION_COOKIE], token);
});

test("mutation authorizer separates server bearer and browser session secrets when configured", async () => {
  const env = {
    ATLAS_MUTATION_TOKEN: "mutation-secret",
    ATLAS_SESSION_SECRET: "session-secret"
  };
  const now = () => 2000;
  const authorize = createMutationAuthorizer({ env, now });

  assert.deepEqual(
    await authorize({ headers: { authorization: "Bearer mutation-secret" } }),
    { authorized: true, method: "bearer" }
  );

  const token = issueSessionToken("session-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  assert.deepEqual(
    await authorize({ headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } }),
    { authorized: true, method: "session" }
  );

  const forgedWithBearerSecret = issueSessionToken("mutation-secret", { now: 1000, ttlMs: 5000, nonce: "forged" });
  assert.deepEqual(
    await authorize({ headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(forgedWithBearerSecret)}` } }),
    { authorized: false, reason: "unauthorized" }
  );
});

test("mutation authorizer preserves old session validity until dedicated secret is deployed", async () => {
  const env = { ATLAS_MUTATION_TOKEN: "mutation-secret" };
  const authorize = createMutationAuthorizer({ env, now: () => 2000 });
  const token = issueSessionToken("mutation-secret", { now: 1000, ttlMs: 5000, nonce: "fixed-nonce" });
  assert.deepEqual(
    await authorize({ headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } }),
    { authorized: true, method: "session" }
  );
});
