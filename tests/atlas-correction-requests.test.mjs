import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requireManifest, MANIFEST_V1 } = require("../server/atlas-correction-manifest-service.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requestDir = path.join(root, "corrections/requests");

function requestFiles() {
  if (!fs.existsSync(requestDir)) return [];
  return fs.readdirSync(requestDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => path.join(requestDir, name));
}

test("all checked-in correction requests satisfy the active reviewed v1 contract", () => {
  const files = requestFiles();
  assert.ok(files.length > 0, "at least one reviewed correction request should be present once this contract test is introduced");

  const requestIds = new Set();
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.equal(raw.schema, MANIFEST_V1, `${path.basename(file)} must use the active correction schema`);
    assert.equal(raw.review_status, "approved", `${path.basename(file)} must be explicitly approved`);
    const parsed = requireManifest(raw);
    assert.ok(!requestIds.has(parsed.requestId), `duplicate correction request_id: ${parsed.requestId}`);
    requestIds.add(parsed.requestId);
  }
});

test("Stage 2 R0 request is bounded to the six normalized true-duplicate groups", () => {
  const file = path.join(requestDir, "stage2-r0-true-activity-duplicates.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const parsed = requireManifest(raw);
  assert.equal(parsed.operations.length, 6);

  const expectedDrops = new Set([
    "75a124e8-df55-5247-aa48-dc9d7934c10e",
    "d1e0a5a6-31a1-5691-8d05-570dccdcad18",
    "25ce2112-9b21-55dd-88d1-029153fc1a5a",
    "d641eec9-2770-5099-8017-8ec3bcc9244e",
    "caa526f9-220d-540c-93ea-d889f6d9b8cb",
    "a8946a02-9235-5985-b882-0c7d60b555dd"
  ]);
  assert.deepEqual(new Set(parsed.operations.map((operation) => operation.drop_relationship_id)), expectedDrops);
  assert.ok(parsed.operations.every((operation) => operation.type === "coalesce_relationship"));
});
