import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { workflowTriggerEvents, workflowPrProductionViolation, workflowHistoricalManualViolation } from "../scripts/verify-vercel-resource-budget.mjs";

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
    assert.ok(!workflowPrProductionViolation(source, events), file + ": PR must not browse Production");
  }
});

test("quoted event names cannot hide pull_request next to valid workflow_dispatch", () => {
  for (const q of ['"pull_request"', "'pull_request'"]) {
    const src = "name: quota guard\non:\n  workflow_dispatch:\n    inputs:\n      note:\n        description: fixture\n  " + q + ":\n    branches: [main]\npermissions:\n  contents: read";
    assert.deepEqual([...workflowTriggerEvents(src)].sort(), ["pull_request", "workflow_dispatch"]);
  }
});

test("unrecognized sibling after valid event fails closed instead of silent omission", () => {
  const unknown = "on:\n  workflow_dispatch:\n  !custom:\n    arbitrary: true\njobs:\n  check: {}";
  assert.equal(workflowTriggerEvents(unknown), null);
  const duplicate = "on:\n  workflow_dispatch:\n  workflow_dispatch:\njobs:\n  check: {}";
  assert.equal(workflowTriggerEvents(duplicate), null);
});

test("GitHub Actions scalar and block list event layouts stay valid", () => {
  assert.deepEqual([...workflowTriggerEvents("on: 'pull_request'")], ["pull_request"]);
  assert.deepEqual([...workflowTriggerEvents('on: "push"')], ["push"]);
  assert.deepEqual([...workflowTriggerEvents("on:\n  - workflow_dispatch\n  - pull_request\njobs:\n  check: {}")].sort(),
    ["pull_request", "workflow_dispatch"]);
});

test("quoted root on and quoted event keys work with Windows line endings", () => {
  const source = '"on":\r\n  "workflow_dispatch":\r\n  \'pull_request\':\r\njobs:\r\n  check: {}';
  assert.deepEqual([...workflowTriggerEvents(source)].sort(), ["pull_request", "workflow_dispatch"]);
});

test("Production PR triggers are rejected while manual Production dispatch stays permitted", () => {
  for (const production of ["https://atlas-person-db.vercel.app", "ATLAS_PRODUCTION_ORIGIN"]) {
    for (const trigger of ["pull_request", "pull_request_target", '"pull_request_target"']) {
      const source = `on:\n  ${trigger}:\njobs:\n  check:\n    env:\n      ORIGIN: ${production}\n`;
      assert.equal(workflowPrProductionViolation(source), true, trigger + ": " + production);
    }
    const manual = `on:\n  workflow_dispatch:\njobs:\n  check:\n    env:\n      ORIGIN: ${production}\n`;
    assert.equal(workflowPrProductionViolation(manual), false, production);
  }
  assert.equal(workflowPrProductionViolation("on: pull_request_target\njobs:\n  local: {}"), false);
});


test("historical full-Production census remains manual-only for PR target triggers", () => {
  const manual = workflowTriggerEvents("on:\n  workflow_dispatch:\njobs:\n  audit: {}");
  assert.equal(workflowHistoricalManualViolation(manual), false);
  for (const event of ["pull_request", "pull_request_target", "push", "schedule"]) {
    const source = `on:\n  workflow_dispatch:\n  ${event}:\njobs:\n  audit: {}`;
    assert.equal(workflowHistoricalManualViolation(workflowTriggerEvents(source)), true, event);
  }
  assert.equal(workflowHistoricalManualViolation(null), true);
});
