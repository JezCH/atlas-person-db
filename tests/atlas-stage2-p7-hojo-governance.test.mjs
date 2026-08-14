import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const plan = JSON.parse(fs.readFileSync(path.join(root, "stage2/execution/p7-hojo-kamakura-governance-execution.v1.json"), "utf8"));
const sources = JSON.parse(fs.readFileSync(path.join(root, "stage2/authoring/p7-hojo-governance-sources.v1.json"), "utf8"));
const governance = JSON.parse(fs.readFileSync(path.join(root, "stage2/authoring/p7-reviewed-governance-contexts.v1.json"), "utf8"));

test("Hōjō correction atomically relinks the Activity to Japan and asserts Kamakura governance", () => {
  assert.equal(plan.operations.length, 1);
  const op = plan.operations[0];
  assert.equal(op.activity_id, "f5ea0e7c-1886-56f8-b4cc-b1ceba9dd1dd");
  assert.equal(op.baseline_before.polity_id, "53943675-7711-5053-9f2e-f149f727aa54");
  assert.equal(op.after.polity_id, "e029b047-544a-52c7-8897-4e494ac72af4");
  assert.equal(op.after.relation_type_id, "67a57b37-1853-5f2a-b7ab-e6b2d32b56b6");
  assert.equal(op.after.activity_start, 1268);
  assert.equal(op.after.activity_end, 1284);
  assert.equal(op.after.activity_start_detail, null);
  assert.equal(op.after.activity_end_detail, null);

  assert.equal(plan.stage2_assertions.length, 1);
  const assertion = plan.stage2_assertions[0];
  assert.equal(assertion.type, "assert_governance_period");
  assert.equal(assertion.exact_after.period.polity_id, op.after.polity_id);
  assert.equal(assertion.exact_after.period.governance_context_id, "56c8f804-2962-4a5b-90ed-a4913043d0e7");
  assert.equal(assertion.exact_after.period.valid_from_year, 1268);
  assert.equal(assertion.exact_after.period.valid_to_year, 1284);
  assert.match(assertion.exact_after.period.notes, /not a claim about the overall beginning or end/i);
  assert.equal(assertion.exact_after.source_links.length, 2);
  assert.equal(plan.execution_rules.territory_geometry_mutation_forbidden, true);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
});

test("Hōjō package uses literal reviewed Source and Governance Context identities", () => {
  assert.equal(sources.sources[0].row.id, "e20a8f0f-ef96-4b86-8b73-751bd3e3c207");
  assert.equal(sources.sources[0].row.sha256, null);
  assert.equal(sources.sources[0].row.bytes, null);
  assert.match(sources.sources[0].row.canonical_url, /^https:\/\/www\.cambridge\.org\//);
  assert.equal(governance.contexts[0].row.id, "56c8f804-2962-4a5b-90ed-a4913043d0e7");
  assert.equal(governance.contexts[0].row.governance_type, "government");
});
