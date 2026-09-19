import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { ISSUER } = require("../server/atlas-github-oidc.js");
const {
  EXPECTED_AUDIENCE,
  EXPECTED_WORKFLOW_REF,
  verifyPersonHardDeleteTrustClaims
} = require("../server/atlas-person-hard-delete-github-oidc.js");
const {
  createPersonHardDeleteHandler,
  MARKER,
  TARGET_PERSON_ID
} = require("../server/atlas-person-hard-delete-handler.js");

const SHA = "a".repeat(40);

function trustedPayload(overrides = {}) {
  return {
    iss:ISSUER,
    aud:EXPECTED_AUDIENCE,
    repository:"JezCH/atlas-person-db",
    repository_id:"1319427399",
    ref:"refs/heads/main",
    workflow_ref:EXPECTED_WORKFLOW_REF,
    environment:"production",
    event_name:"push",
    sha:SHA,
    ...overrides
  };
}

function createRes() {
  return {
    statusCode:null,
    headers:{},
    body:null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    end(value) { this.body = value == null ? "" : String(value); }
  };
}

test("one-off Person hard-delete OIDC policy accepts only exact production main workflow", () => {
  assert.doesNotThrow(() => verifyPersonHardDeleteTrustClaims(trustedPayload(), SHA));
  const rejected = [
    [{ aud:"atlas-person-domain-api" }, /GITHUB_OIDC_AUDIENCE_MISMATCH/],
    [{ repository:"someone/else" }, /GITHUB_OIDC_REPOSITORY_MISMATCH/],
    [{ repository_id:"1" }, /GITHUB_OIDC_REPOSITORY_ID_MISMATCH/],
    [{ ref:"refs/heads/feature" }, /GITHUB_OIDC_REF_MISMATCH/],
    [{ workflow_ref:"JezCH/atlas-person-db/.github/workflows/other.yml@refs/heads/main" }, /GITHUB_OIDC_WORKFLOW_MISMATCH/],
    [{ environment:"preview" }, /GITHUB_OIDC_ENVIRONMENT_MISMATCH/],
    [{ event_name:"workflow_dispatch" }, /GITHUB_OIDC_EVENT_MISMATCH/],
    [{ event_name:"pull_request" }, /GITHUB_OIDC_EVENT_MISMATCH/],
    [{ sha:"b".repeat(40) }, /GITHUB_OIDC_SHA_MISMATCH/]
  ];
  for (const [override, pattern] of rejected) {
    assert.throws(() => verifyPersonHardDeleteTrustClaims(trustedPayload(override), SHA), pattern);
  }
});

test("one-off hard-delete readiness exposes only fixed target and deployed runtime SHA", async () => {
  const handler = createPersonHardDeleteHandler({
    clientFactory:async () => { throw new Error("GET must not open database"); },
    env:{ VERCEL_GIT_COMMIT_SHA:SHA }
  });
  const res = createRes();
  await handler({ method:"GET", headers:{} }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), {
    ok:true,
    marker:MARKER,
    target_person_id:TARGET_PERSON_ID,
    runtime_sha:SHA
  });
});

test("one-off hard-delete rejects every Person UUID except the adjudicated Báthory target before auth or DB access", async () => {
  let verified = false;
  let openedDb = false;
  const handler = createPersonHardDeleteHandler({
    clientFactory:async () => { openedDb = true; throw new Error("unexpected DB open"); },
    env:{},
    oidcVerifier:async () => { verified = true; }
  });
  const res = createRes();
  await handler({
    method:"POST",
    headers:{ authorization:"Bearer test-token" },
    body:{ person_id:"0da7334b-bc56-4dad-bc01-f859b7160b37", workflow_sha:SHA }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).code, "PERSON_HARD_DELETE_TARGET_NOT_ALLOWED");
  assert.equal(verified, false);
  assert.equal(openedDb, false);
});

test("one-off hard-delete rejects invalid dedicated OIDC before opening Production DB", async () => {
  let openedDb = false;
  const handler = createPersonHardDeleteHandler({
    clientFactory:async () => { openedDb = true; throw new Error("unexpected DB open"); },
    env:{},
    oidcVerifier:async () => { throw new Error("GITHUB_OIDC_SIGNATURE_INVALID"); }
  });
  const res = createRes();
  await handler({
    method:"POST",
    headers:{ authorization:"Bearer invalid-token" },
    body:{ person_id:TARGET_PERSON_ID, workflow_sha:SHA }
  }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).code, "PERSON_HARD_DELETE_OIDC_REJECTED");
  assert.equal(openedDb, false);
});
