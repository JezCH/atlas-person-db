import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd(), "corrections/plans");
const files = fs.readdirSync(root).filter((name) => name.endsWith(".json")).sort();

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

test("live correction plans have one canonical executable identity", () => {
  const batchIds = new Map();
  const semanticDigests = new Map();
  const versionGroups = new Map();

  for (const name of files) {
    assert.doesNotMatch(name, /\.requeue-\d+\.json$/, `requeue aliases belong in workflow_dispatch, not the live namespace: ${name}`);
    const raw = JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));
    assert.equal(raw.schema, "atlas-stage2-correction-v2-execution-plan/v1", `unsupported live plan schema: ${name}`);
    assert.equal(typeof raw.batch_id, "string", `batch_id missing: ${name}`);
    assert.ok(raw.batch_id.length > 0, `batch_id empty: ${name}`);

    assert.equal(batchIds.has(raw.batch_id), false, `duplicate live batch_id ${raw.batch_id}: ${batchIds.get(raw.batch_id)} and ${name}`);
    batchIds.set(raw.batch_id, name);

    const planDigest = digest(raw);
    assert.equal(semanticDigests.has(planDigest), false, `byte/semantic duplicate live plan: ${semanticDigests.get(planDigest)} and ${name}`);
    semanticDigests.set(planDigest, name);

    const match = /^(.*)\.v(\d+)\.json$/.exec(name);
    if (match) {
      const [, stem, version] = match;
      const versions = versionGroups.get(stem) || [];
      versions.push({ name, version: Number(version) });
      versionGroups.set(stem, versions);
    }
  }

  for (const [stem, versions] of versionGroups) {
    assert.ok(
      versions.length <= 1,
      `superseded revisions must leave the live namespace: ${stem} -> ${versions.map((item) => item.name).join(", ")}`
    );
  }
});

test("Activity integrity cleanup retains only its canonical v2 live plan", () => {
  assert.equal(fs.existsSync(path.join(root, "activity-integrity-cleanup-20260816.v2.json")), true);
  assert.equal(fs.existsSync(path.join(root, "activity-integrity-cleanup-20260816.v1.json")), false);
  assert.equal(fs.existsSync(path.join(root, "activity-integrity-cleanup-20260816.requeue-1.json")), false);
});
