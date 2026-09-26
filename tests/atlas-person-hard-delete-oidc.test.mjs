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
  TARGET_PERSON_IDS
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

test("living Person hard-delete OIDC policy accepts only exact production main workflow", () => {
  assert.doesNotThrow(() => verifyPersonHardDeleteTrustClaims(trustedPayload(), SHA));
  for (const [override, pattern] of [
    [{ aud:"atlas-person-domain-api" }, /GITHUB_OIDC_AUDIENCE_MISMATCH/],
    [{ repository:"someone/else" }, /GITHUB_OIDC_REPOSITORY_MISMATCH/],
    [{ repository_id:"1" }, /GITHUB_OIDC_REPOSITORY_ID_MISMATCH/],
    [{ ref:"refs/heads/feature" }, /GITHUB_OIDC_REF_MISMATCH/],
    [{ workflow_ref:"JezCH/atlas-person-db/.github/workflows/other.yml@refs/heads/main" }, /GITHUB_OIDC_WORKFLOW_MISMATCH/],
    [{ environment:"preview" }, /GITHUB_OIDC_ENVIRONMENT_MISMATCH/],
    [{ event_name:"workflow_dispatch" }, /GITHUB_OIDC_EVENT_MISMATCH/],
    [{ sha:"b".repeat(40) }, /GITHUB_OIDC_SHA_MISMATCH/]
  ]) assert.throws(() => verifyPersonHardDeleteTrustClaims(trustedPayload(override), SHA), pattern);
});

test("batch hard-delete readiness exposes exactly 47 fixed targets and deployed runtime SHA", async () => {
  const handler = createPersonHardDeleteHandler({
    clientFactory:async () => { throw new Error("GET must not open database"); },
    env:{ VERCEL_GIT_COMMIT_SHA:SHA }
  });
  const res = createRes();
  await handler({ method:"GET", headers:{} }, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.marker, MARKER);
  assert.equal(body.target_count, 47);
  assert.deepEqual(body.target_person_ids, TARGET_PERSON_IDS);
  assert.equal(body.runtime_sha, SHA);
  assert.equal(new Set(TARGET_PERSON_IDS).size, 47);
});

test("batch hard-delete rejects a Person UUID outside the adjudicated allowlist before auth or DB access", async () => {
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
    body:{ person_id:"c2f584d8-170b-49ca-a4b7-7afcf18c95b6", workflow_sha:SHA }
  }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).code, "PERSON_HARD_DELETE_TARGET_NOT_ALLOWED");
  assert.equal(verified, false);
  assert.equal(openedDb, false);
});

test("batch hard-delete rejects invalid dedicated OIDC before opening Production DB", async () => {
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
    body:{ person_id:TARGET_PERSON_IDS[0], workflow_sha:SHA }
  }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(JSON.parse(res.body).code, "PERSON_HARD_DELETE_OIDC_REJECTED");
  assert.equal(openedDb, false);
});
