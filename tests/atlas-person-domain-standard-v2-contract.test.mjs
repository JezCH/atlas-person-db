import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const contractPath = path.join(root, "contracts/person-domain-taxonomy.v2.json");
const docPath = path.join(root, "docs/person/PERSON_DOMAIN_STANDARD_V2.md");
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const doc = fs.readFileSync(docPath, "utf8");

const targetCodes = [
  "governance",
  "military",
  "science",
  "technology",
  "commerce",
  "culture",
  "religion",
  "exploration"
];

const targetLabels = [
  "정치·통치",
  "군사",
  "과학",
  "공학·기술",
  "경제·상업",
  "인문·예술",
  "종교",
  "탐험"
];

test("Person Domain v2 migration target stays at exactly eight semantic sectors", () => {
  assert.equal(contract.schema, "atlas-person-domain-taxonomy/v2");
  assert.equal(contract.status, "approved_migration_target");
  assert.equal(contract.sector_count, 8);
  assert.deepEqual(contract.target_definitions.map((item) => item.code), targetCodes);
  assert.deepEqual(contract.target_definitions.map((item) => item.label_ko), targetLabels);
  assert.equal(new Set(contract.target_definitions.map((item) => item.palette_source)).size, 8);
  assert.equal(contract.target_definitions.find((item) => item.code === "science").palette_source, "knowledge");
});

test("v2 explicitly separates science from humanities without creating a temporary ninth code", () => {
  const science = contract.target_definitions.find((item) => item.code === "science");
  const culture = contract.target_definitions.find((item) => item.code === "culture");
  assert.match(science.scope, /natural science/i);
  assert.match(science.scope, /mathematics/i);
  assert.match(culture.scope, /philosophy/i);
  assert.match(culture.scope, /history/i);
  assert.match(culture.scope, /social thought/i);
  assert.equal(contract.migration.strategy, "eight_sectors_without_temporary_ninth_code");
  assert.deepEqual(contract.migration.review_unit_size, { minimum:5, maximum:12 });
});

test("legacy knowledge cannot be bulk-renamed before review is complete", () => {
  assert.equal(contract.legacy.runtime_code, "knowledge");
  assert.match(contract.legacy.retirement_rule, /every remaining knowledge Person has been reviewed/i);
  assert.match(contract.migration.pre_cutover_rule, /science remain temporarily stored as knowledge/i);
  assert.ok(contract.migration.final_cutover_postconditions.includes("knowledge_count_is_zero"));
  assert.match(doc, /MUST NOT perform a blind code rename/);
});

test("Unit 01 is contract-only and does not claim a live runtime cutover", () => {
  assert.match(doc, /Runtime state:\*\* v1 remains live until the final cutover unit/);
  assert.match(doc, /no Production Person mutation/);
  assert.match(doc, /no schema constraint change/);
  assert.match(doc, /no runtime registry switch/);
  assert.match(doc, /no UI label switch/);
});


test("v2 science-retained checkpoints are verify-only review evidence", () => {
  assert.deepEqual(contract.migration.science_retained_checkpoint, {
    container_key:"science_retained",
    v2_target_domain:"science",
    stored_domain:"knowledge",
    behavior:"verify_only_no_write",
    provenance_required:true,
    purpose:"durably distinguish reviewed science-target Persons from unresolved legacy knowledge before final cutover"
  });
  assert.match(doc, /science_retained/);
  assert.match(doc, /review evidence, not a mutation command/i);
  assert.match(doc, /still reads `knowledge` in Production without issuing a write/i);
});
