import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const survivorPlan = JSON.parse(fs.readFileSync(path.join(root, "stage2/execution/p7-tokugawa-ieyasu-governance-survivors-execution.v1.json"), "utf8"));
const retirePlan = JSON.parse(fs.readFileSync(path.join(root, "stage2/execution/p7-tokugawa-ieyasu-compressed-retire-execution.v1.json"), "utf8"));
const sources = JSON.parse(fs.readFileSync(path.join(root, "stage2/authoring/p7-tokugawa-governance-sources.v1.json"), "utf8"));
const governance = JSON.parse(fs.readFileSync(path.join(root, "stage2/authoring/p7-tokugawa-governance-contexts.v1.json"), "utf8"));

const FORMAL = "7c315e1c-90c3-5199-a292-8f68ba69d4b2";
const RETIRED = "400c78d5-a7e1-5ddb-83ef-91e0193db0f8";
const COMPRESSED = "79dc9310-cd56-5bed-9a35-fe5361bdf0b6";
const JAPAN = "e029b047-544a-52c7-8897-4e494ac72af4";
const GOVERNS = "67a57b37-1853-5f2a-b7ab-e6b2d32b56b6";
const COMPRESSED_SOURCE = "6ab43c8c-2d16-526a-8a2f-8159877becfe";

test("Tokugawa survivor plan preserves the two reviewed phases and models bakufu as governance", () => {
  assert.equal(survivorPlan.operations.length, 2);
  assert.deepEqual(survivorPlan.operations.map((op) => op.activity_id), [FORMAL, RETIRED]);
  for (const op of survivorPlan.operations) {
    assert.equal(op.type, "rewrite_activity");
    assert.equal(op.after.polity_id, JAPAN);
    assert.equal(op.after.relation_type_id, GOVERNS);
    assert.equal(op.after.activity_start_detail, null);
    assert.equal(op.after.activity_end_detail, null);
    assert.ok(op.after.add_source_links.some((link) =>
      link.source_id === COMPRESSED_SOURCE && link.source_locator_key === "pending-records-corrections.json:30"
    ));
  }
  assert.equal(survivorPlan.operations[0].after.activity_start, 1603);
  assert.equal(survivorPlan.operations[0].after.activity_end, 1605);
  assert.equal(survivorPlan.operations[1].after.activity_start, 1605);
  assert.equal(survivorPlan.operations[1].after.activity_end, 1616);

  assert.equal(survivorPlan.stage2_assertions.length, 1);
  const assertion = survivorPlan.stage2_assertions[0];
  assert.equal(assertion.type, "assert_governance_period");
  assert.equal(assertion.exact_after.period.polity_id, JAPAN);
  assert.equal(assertion.exact_after.period.governance_context_id, "b0448ada-fdd4-49bf-8669-bd54480bc1a3");
  assert.equal(assertion.exact_after.period.valid_from_year, 1603);
  assert.equal(assertion.exact_after.period.valid_to_year, 1616);
  assert.match(assertion.exact_after.period.notes, /not asserted as the complete beginning or end/i);
  assert.equal(assertion.exact_after.source_links.length, 5);
  assert.equal(survivorPlan.execution_rules.production_mutation_authorized, false);
});

test("Tokugawa compressed overlap retires only after both survivor UUIDs are declared replacements", () => {
  assert.equal(retirePlan.depends_on, survivorPlan.batch_id);
  assert.equal(retirePlan.operations.length, 1);
  const op = retirePlan.operations[0];
  assert.equal(op.type, "retire_activity");
  assert.equal(op.activity_id, COMPRESSED);
  assert.deepEqual(op.replacement_activity_ids, [FORMAL, RETIRED]);
  assert.equal(op.silent_source_drop_forbidden, true);
  assert.match(op.source_transfer_policy, /^COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS/);

  for (const survivor of survivorPlan.operations) {
    assert.ok(survivor.after.add_source_links.some((link) => link.source_id === COMPRESSED_SOURCE),
      "compressed Source must be prebound so Stage A remains replayable after Stage B");
  }
});

test("Tokugawa package uses literal reviewed Source and Governance Context identities", () => {
  assert.equal(sources.sources.length, 2);
  assert.deepEqual(new Set(sources.sources.map((item) => item.row.id)), new Set([
    "a04aae2d-ce8f-40be-b4a9-fa764bcc3010",
    "e45a3aa1-bc34-4be2-af12-6858d3e5c512"
  ]));
  for (const item of sources.sources) {
    assert.equal(item.row.sha256, null);
    assert.equal(item.row.bytes, null);
    assert.match(item.row.canonical_url, /^https:\/\//);
  }

  assert.equal(governance.contexts.length, 1);
  assert.equal(governance.contexts[0].row.id, "b0448ada-fdd4-49bf-8669-bd54480bc1a3");
  assert.equal(governance.contexts[0].row.governance_type, "government");
  assert.equal(governance.rules.runtime_name_resolution_forbidden, true);
  assert.equal(governance.rules.territory_geometry_mutation_forbidden, true);
  assert.equal(governance.rules.production_mutation_authorized, false);
});
