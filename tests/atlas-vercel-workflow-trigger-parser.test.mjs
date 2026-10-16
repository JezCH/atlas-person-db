import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { workflowTriggerEvents } from "../scripts/verify-vercel-resource-budget.mjs";

test("root-level on key cannot bypass Production pull_request guard", () => {
  const events = workflowTriggerEvents("on:\n  pull_request:\n  workflow_dispatch:\njobs:\n  verify: {}");
  assert.deepEqual([...events].sort(), ["pull_request", "workflow_dispatch"]);
});

test("quoted YAML on keys and CRLF preserve real events", () => {
  for (const key of ['"on"', "'on'"]) {
    const events = workflowTriggerEvents(key + ":\r\n  push:\r\n    branches: [main]\r\n  pull_request:\r\npermissions:\r\n  contents: read");
    assert.deepEqual([...events].sort(), ["pull_request", "push"]);
  }
});

test("nested input called pull_request is not a top-level event", () => {
  const events = workflowTriggerEvents("name: fixture\non: # comment\n  workflow_dispatch:\n    inputs:\n      pull_request:\n        description: metadata\njobs:\n  job: {}");
  assert.deepEqual([...events], ["workflow_dispatch"]);
});

test("inline list parsed and unsupported flow-map or absent trigger fail closed", () => {
  assert.deepEqual([...workflowTriggerEvents("on: [push, pull_request]")].sort(), ["pull_request", "push"]);
  assert.equal(workflowTriggerEvents("on: {pull_request: {}}"), null);
  assert.equal(workflowTriggerEvents("name: missing trigger\njobs:\n  check: {}"), null);
});

test("all checked-in workflows remain parseable and no PR runs Production checks", () => {
  const root = new URL("../.github/workflows/", import.meta.url);
  const files = readdirSync(root).filter((file) => /\.ya?ml$/.test(file));
  assert.ok(files.length >= 30);
  for (const file of files) {
    const source = readFileSync(new URL(file, root), "utf8");
    const events = workflowTriggerEvents(source);
    assert.ok(events instanceof Set && events.size > 0, file + ": unknown event triggers");
    const prod = source.includes("atlas-person-db.vercel.app") || source.includes("ATLAS_PRODUCTION_ORIGIN");
    assert.ok(!(prod && events.has("pull_request")), file + ": PR must not browse Production");
  }
});
