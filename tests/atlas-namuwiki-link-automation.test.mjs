import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const oidc = require("../server/atlas-namuwiki-link-github-oidc.js");
const handler = require("../server/atlas-namuwiki-link-handler.js");
const profile = require("../server/atlas-person-profile-service.js");

const workflow = fs.readFileSync(new URL("../.github/workflows/atlas-namuwiki-link.yml", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../api/atlas-authoring.js", import.meta.url), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const SHA = "a".repeat(40);
const PERSON_ID = "da0303c2-1faf-40b8-9dc2-1325b77488d7";
const URL = "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D";

function trustedClaims(overrides = {}) {
  return {
    iss: oidc.ISSUER,
    aud: oidc.EXPECTED_AUDIENCE,
    repository: oidc.EXPECTED_REPOSITORY,
    repository_id: oidc.EXPECTED_REPOSITORY_ID,
    ref: oidc.EXPECTED_REF,
    workflow_ref: oidc.EXPECTED_WORKFLOW_REF,
    environment: oidc.EXPECTED_ENVIRONMENT,
    event_name: oidc.EXPECTED_EVENT_NAME,
    actor: oidc.EXPECTED_ACTOR,
    sub: oidc.EXPECTED_SUB,
    sha: SHA,
    exp: 2000,
    nbf: 900,
    ...overrides
  };
}

test("dedicated NamuWiki OIDC trust accepts only Issue-comment workflow context", () => {
  assert.doesNotThrow(() => oidc.verifyClaims(trustedClaims(), SHA, 1000));
  assert.throws(() => oidc.verifyClaims(trustedClaims({ event_name:"workflow_dispatch" }), SHA, 1000), /CONTEXT_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(trustedClaims({ actor:"someone-else" }), SHA, 1000), /ACTOR_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(trustedClaims({ workflow_ref:"JezCH\/atlas-person-db\/.github\/workflows\/atlas-authoring-apply.yml@refs\/heads\/main" }), SHA, 1000), /WORKFLOW_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(trustedClaims({ sub:"repo:JezCH\/atlas-person-db:ref:refs\/heads\/main" }), SHA, 1000), /SUBJECT_MISMATCH/);
});

test("dedicated payload is narrow and canonicalizes only a real namu.wiki document URL", () => {
  const payload = handler.requireNamuWikiLinkPayload({ runtime_sha:SHA, person_id:PERSON_ID, url:URL });
  assert.equal(payload.personId, PERSON_ID);
  assert.equal(payload.externalReference.url, URL);
  assert.equal(payload.externalReference.document_title, "임호텝");
  assert.throws(() => handler.requireNamuWikiLinkPayload({ runtime_sha:SHA, person_id:PERSON_ID, url:"https://namu.moe/w/x" }), /CANONICAL_URL_REQUIRED/);
  assert.throws(() => handler.requireNamuWikiLinkPayload({ runtime_sha:SHA, person_id:PERSON_ID, url:`${URL}?from=x` }), /CANONICAL_URL_REQUIRED/);
  assert.throws(() => handler.requireNamuWikiLinkPayload({ runtime_sha:SHA, person_id:PERSON_ID, url:URL, operation:"set_person_korean_name" }), /UNEXPECTED_FIELD/);
});

test("automation overwrite guard blocks a different linked URL but permits replay and not_found recovery", () => {
  const next = profile.normalizeNamuWikiInput(URL);
  assert.equal(profile.shouldBlockExternalReferenceOverwrite({ provider:"namuwiki", status:"linked", document_title:"다른 문서", url:"https://namu.wiki/w/other" }, next, { preventOverwrite:true }), true);
  assert.equal(profile.shouldBlockExternalReferenceOverwrite({ provider:"namuwiki", status:"linked", document_title:next.document_title, url:next.url }, next, { preventOverwrite:true }), false);
  assert.equal(profile.shouldBlockExternalReferenceOverwrite({ provider:"namuwiki", status:"not_found", document_title:null, url:null }, next, { preventOverwrite:true }), false);
});

test("Issue #431 workflow is one-at-a-time, actor-gated and performs Production read-back", () => {
  assert.match(workflow, /issue_comment:/);
  assert.match(workflow, /github\.event\.issue\.number == 431/);
  assert.match(workflow, /!github\.event\.issue\.pull_request/);
  assert.match(workflow, /github\.actor == 'JezCH'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /issues: write/);
  assert.match(workflow, /atlas-person-db-namuwiki-link/);
  assert.match(workflow, /\/namuwiki-link/);
  assert.match(workflow, /atlas-namuwiki-link/);
  assert.match(workflow, /atlas-person-read/);
  assert.match(workflow, /external_references\.namuwiki\.url/);
  assert.match(workflow, /external_references\.namuwiki\.document_title/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test("dedicated logical endpoint reuses the existing authoring function instead of creating a thirteenth Vercel function", () => {
  assert.ok(vercel.rewrites.some((row) => row.source === "/api/atlas-namuwiki-link" && row.destination === "/api/atlas-authoring?__atlas_authoring_surface=namuwiki-link"));
  assert.match(api, /atlas-namuwiki-link-handler\.js/);
  assert.match(api, /createNamuWikiLinkHandler/);
  assert.match(api, /surface === "namuwiki-link"/);
});
