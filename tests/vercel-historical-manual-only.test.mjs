import test from "node:test";
import assert from "node:assert/strict";
import { workflowHistoricalManualViolation, workflowTriggerEvents } from "../scripts/verify-vercel-resource-budget.mjs";

test("historical Production censuses require workflow_dispatch as their only trigger", () => {
  assert.equal(workflowHistoricalManualViolation(workflowTriggerEvents("on: workflow_dispatch")), false);
  for (const event of ["repository_dispatch", "workflow_call", "workflow_run", "issues", "push"]) {
    const events = workflowTriggerEvents(`on:\n  workflow_dispatch:\n  ${event}:\n`);
    assert.equal(workflowHistoricalManualViolation(events), true, event);
  }
});
