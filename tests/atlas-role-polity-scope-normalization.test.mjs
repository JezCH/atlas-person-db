import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const roleScope = require("../server/atlas-correction-role-scope-v2-service.js");
const dispatch = require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const manifestPath = path.join(root, "corrections/requests/role-polity-scope-normalization.v2.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

test("polity-qualified Role cleanup is explicit and permits one generic Role to absorb several scoped aliases", () => {
  const parsed = roleScope.requireManifest(manifest);
  assert.equal(parsed.requestId, "role-scope-normalization:polity-qualifiers:v1");
  assert.equal(parsed.operations.length, 5);
  assert.ok(parsed.operations.every((operation) => operation.type === "merge_role_polity_qualifier"));
  assert.ok(parsed.operations.every((operation) => operation.review_reason === "POLITY_SCOPE_REDUNDANT_IN_ROLE"));

  const kingTargets = parsed.operations.filter((operation) => operation.keep_role.source_label === "King");
  assert.equal(kingTargets.length, 4);
  assert.equal(new Set(kingTargets.map((operation) => operation.keep_role.id)).size, 1);

  const mappings = Object.fromEntries(parsed.operations.map((operation) => [operation.drop_role.source_label, operation.keep_role.source_label]));
  assert.deepEqual(mappings, {
    "King of Israel": "King",
    "King of Goguryeo": "King",
    "King of Poland": "King",
    "Holy Roman Emperor": "Emperor",
    "King of the Belgians": "King"
  });
});

test("polity-scope correction requires the reviewed invariant reason", () => {
  const changed = structuredClone(manifest);
  changed.operations[0].review_reason = "FREE_TEXT_CLEANUP";
  assert.throws(() => roleScope.requireManifest(changed), /REVIEW_REASON_REQUIRED/);
});

test("polity-scope correction rejects reused activity targets", () => {
  const changed = structuredClone(manifest);
  changed.operations[1].affected_activity_bindings[0].activity_id = changed.operations[0].affected_activity_bindings[0].activity_id;
  assert.throws(() => roleScope.requireManifest(changed), /ACTIVITY_REUSED_ACROSS_OPERATIONS/);
});

test("v2 dispatcher isolates polity-scope Role mutations from other correction families", () => {
  const fakeClient = { query: async () => { throw new Error("query should not run"); } };
  const service = dispatch.createCorrectionManifestV2DispatchService({ client: fakeClient });
  const mixed = structuredClone(manifest);
  mixed.operations.push({ type: "rewrite_activity" });
  assert.throws(() => service.execute(mixed, { dryRun: true }), /ROLE_SCOPE_MIXED_OPERATION_FAMILY_FORBIDDEN/);
});

test("scope service verifies exact Polity bindings and repairs authoring replay role ids", () => {
  const source = fs.readFileSync(path.join(root, "server/atlas-correction-role-scope-v2-service.js"), "utf8");
  assert.match(source, /select id::text,polity_id::text,role_id::text/);
  assert.match(source, /POLITY_DRIFT/);
  assert.match(source, /update atlas_v2\.person_politics_v2/);
  assert.match(source, /\{entities,role,id\}/);
  assert.match(source, /delete from atlas_v2\.roles where id=/);
  assert.match(source, /Multiple governed Polities require separate Activities/);
});
