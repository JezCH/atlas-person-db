import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const oidc = require("../server/atlas-reviewed-person-merge-github-oidc.js");
const handler = require("../server/atlas-reviewed-person-merge-handler.js");

const workflow = fs.readFileSync(new URL("../.github/workflows/atlas-reviewed-person-merge.yml", import.meta.url), "utf8");
const api = fs.readFileSync(new URL("../api/atlas-authoring.js", import.meta.url), "utf8");
const vercel = JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const mergeManifest = JSON.parse(fs.readFileSync(new URL("../corrections/reviewed-person-merges/yelu-dashi-dezong.json", import.meta.url), "utf8"));
const retireIntent = JSON.parse(fs.readFileSync(new URL("../corrections/intents/yelu-dashi-dezong-retire-duplicate-activity.json", import.meta.url), "utf8"));

const SHA = "a".repeat(40);

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

test("reviewed Person merge OIDC trust is immutable to main push by repository owner", () => {
  assert.equal(oidc.EXPECTED_EVENT_NAME, "push");
  assert.equal(oidc.EXPECTED_ACTOR, "JezCH");
  assert.doesNotThrow(() => oidc.verifyClaims(trustedClaims(), SHA, 1000));
  assert.throws(() => oidc.verifyClaims(trustedClaims({ actor:"someone-else" }), SHA, 1000), /ACTOR_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(trustedClaims({ event_name:"workflow_dispatch" }), SHA, 1000), /CONTEXT_MISMATCH/);
  assert.throws(() => oidc.verifyClaims(trustedClaims({ workflow_ref:"wrong" }), SHA, 1000), /WORKFLOW_MISMATCH/);
});

test("Yelu Dashi reviewed merge manifest keeps the reviewed row and requires duplicate Activity retirement first", () => {
  const parsed = handler.requireManifest(mergeManifest, "corrections/reviewed-person-merges/yelu-dashi-dezong.json");
  assert.equal(parsed.survivorPersonId, "312c56af-d6e2-4713-8ef1-91877ee66f9b");
  assert.equal(parsed.sourcePersonId, "0274dd73-8573-5cd7-9013-3aed524d4f4d");
  assert.equal(parsed.survivorActivityId, "c739480b-0ee2-4d8b-983e-0c7965b66433");
  assert.equal(parsed.sourceActivityCount, 0);
  assert.deepEqual(handler.pairIds(parsed.sourcePersonId, parsed.survivorPersonId), [
    "0274dd73-8573-5cd7-9013-3aed524d4f4d",
    "312c56af-d6e2-4713-8ef1-91877ee66f9b"
  ]);
  assert.equal(retireIntent.operation.type, "retire_activity");
  assert.equal(retireIntent.operation.relationship_id, "73953cab-4df0-50e0-a8a7-7cd89c41fa44");
});

test("reviewed merge payload rejects unapproved or unsafe manifests", () => {
  const base = {
    deployment_sha:SHA,
    workflow_sha:SHA,
    manifest_path:"corrections/reviewed-person-merges/yelu-dashi-dezong.json",
    manifest:mergeManifest
  };
  assert.doesNotThrow(() => handler.requirePayload(base));
  assert.throws(() => handler.requirePayload({ ...base, manifest:{...mergeManifest,review_status:"draft"} }), /NOT_APPROVED/);
  assert.throws(() => handler.requirePayload({ ...base, manifest_path:"authoring/requests/x.json" }), /PATH_NOT_ALLOWED/);
  assert.throws(() => handler.requirePayload({ ...base, manifest:{...mergeManifest,expected:{...mergeManifest.expected,source_activity_count_after_correction:1}} }), /SOURCE_ACTIVITY_COUNT_REQUIRED/);
});

test("workflow waits for reviewed Activity correction before the physical merge and verifies aliases", () => {
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /github\.actor == 'JezCH'/);
  assert.match(workflow, /source_activity_count_after_correction == 0/);
  assert.match(workflow, /Wait for duplicate Activity correction/);
  assert.match(workflow, /activity_count/);
  assert.match(workflow, /atlas-person-db-reviewed-person-merge/);
  assert.match(workflow, /ATLAS_REVIEWED_PERSON_MERGE_V1/);
  assert.match(workflow, /서요 덕종/);
  assert.match(workflow, /Emperor Dezong of Western Liao/);
  assert.match(workflow, /namuwiki\.document_title == "야율대석"/);
});

test("reviewed merge reuses the consolidated authoring function and existing P10 merge service", () => {
  assert.ok(vercel.rewrites.some((row) => row.source === "/api/atlas-reviewed-person-merge"
    && row.destination === "/api/atlas-authoring?__atlas_authoring_surface=reviewed-person-merge"));
  assert.match(api, /createReviewedPersonMergeHandler/);
  assert.match(api, /surface === "reviewed-person-merge"/);
  const source = fs.readFileSync(new URL("../server/atlas-reviewed-person-merge-handler.js", import.meta.url), "utf8");
  assert.match(source, /rebuildCandidates/);
  assert.match(source, /reviewCandidate/);
  assert.match(source, /executeApprovedPersonMerge/);
  assert.doesNotMatch(source, /delete\s+from\s+atlas_v2\.persons/i);
});
