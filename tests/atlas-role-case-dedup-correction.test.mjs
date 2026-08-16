import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const roleMerge = require("../server/atlas-correction-role-merge-v2-service.js");
const dispatch = require("../server/atlas-correction-manifest-v2-dispatch-service.js");
const applyHandler = require("../server/atlas-correction-apply-handler.js");

const manifestPath = path.join(root, "corrections/requests/role-case-dedup-founder-and-ruler.v2.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

test("Founder and ruler cleanup is an exact case-only role merge", () => {
  const parsed = roleMerge.requireManifest(manifest);
  assert.equal(parsed.schema, "atlas-correction-manifest/v2");
  assert.equal(parsed.requestId, "role-case-dedup:founder-and-ruler:v1");
  assert.equal(parsed.operations.length, 1);
  const operation = parsed.operations[0];
  assert.equal(operation.type, "merge_role_case_duplicate");
  assert.equal(operation.keep_role.source_label, "Founder and ruler");
  assert.equal(operation.drop_role.source_label, "Founder and Ruler");
  assert.deepEqual(operation.affected_activity_ids, ["f3ae824b-bc23-4b58-8c35-fd833eb00f91"]);
  assert.equal(operation.keep_names.length, 2);
  assert.equal(operation.drop_names.length, 2);
});

test("case-only guard rejects semantically different role labels", () => {
  const changed = structuredClone(manifest);
  changed.operations[0].expected_drop_role.source_label = "Founder and reformer";
  assert.throws(() => roleMerge.requireManifest(changed), /NOT_CASE_ONLY_DUPLICATE/);
});

test("case-only guard rejects role-name semantic drift", () => {
  const changed = structuredClone(manifest);
  changed.operations[0].expected_drop_names[1].name = "창건자";
  assert.throws(() => roleMerge.requireManifest(changed), /NAME_SEMANTICS_MISMATCH/);
});

test("v2 dispatcher isolates role-catalog merges from activity correction operations", async () => {
  const fakeClient = { query: async () => { throw new Error("query should not run"); } };
  const service = dispatch.createCorrectionManifestV2DispatchService({ client: fakeClient });
  const mixed = structuredClone(manifest);
  mixed.operations.push({ type: "rewrite_activity" });
  await assert.rejects(() => service.execute(mixed, { dryRun: true }), /MIXED_OPERATION_FAMILY_FORBIDDEN/);
});

test("correction apply handler routes direct v2 manifests through dispatcher", () => {
  const fakeClient = { query: async () => ({ rows: [], rowCount: 0 }) };
  const service = applyHandler.createService(fakeClient, "atlas-correction-manifest/v2");
  assert.equal(typeof service.execute, "function");
});

test("role merge service repairs authoring replay bindings before deleting duplicate role", () => {
  const source = fs.readFileSync(path.join(root, "server/atlas-correction-role-merge-v2-service.js"), "utf8");
  assert.match(source, /\{entities,role,id\}/);
  assert.match(source, /update atlas_v2\.person_politics_v2 set role_id=/);
  assert.match(source, /delete from atlas_v2\.roles where id=/);
  assert.match(source, /role_names_removed/);
  assert.match(source, /AUTHORING_LEDGER_ROLE_DRIFT/);
});
