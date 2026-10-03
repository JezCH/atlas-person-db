import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const proposalDir = path.join(root, "proposals/person-representative-domain");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const batchFiles = fs.readdirSync(proposalDir).filter((name) => /^batch-\d{3}\.json$/.test(name)).sort();

test("science-target dispositions use one canonical pre-cutover shape and never request a write", () => {
  const seen = new Set();
  for (const name of batchFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(proposalDir, name), "utf8"));
    const targets = Array.isArray(raw.science_targets) ? raw.science_targets : [];
    for (const item of targets) {
      assert.match(item.person_id, UUID_RE);
      assert.equal(item.target_domain, "science");
      assert.equal(item.stored_domain, "knowledge");
      assert.equal(typeof item.current_assignment_source, "string");
      assert.ok(item.current_assignment_source.length > 0);
      assert.equal(typeof item.canonical_name_en, "string");
      assert.ok(item.canonical_name_en.length > 0);
      assert.equal(Array.isArray(item.review_sources), true);
      assert.ok(item.review_sources.length > 0);
      assert.equal(seen.has(item.person_id), false, `duplicate science review: ${item.person_id}`);
      seen.add(item.person_id);
    }
  }
});

test("review manifests keep bounded unit accounting when science targets are present", () => {
  for (const name of batchFiles) {
    const raw = JSON.parse(fs.readFileSync(path.join(proposalDir, name), "utf8"));
    const targets = Array.isArray(raw.science_targets) ? raw.science_targets : [];
    if (targets.length === 0) continue;
    const writes = Array.isArray(raw.entries) ? raw.entries.length : 0;
    assert.ok(writes + targets.length >= 5, `${name} review unit is below the v2 minimum`);
    assert.ok(writes + targets.length <= 12, `${name} review unit exceeds the v2 maximum`);
    assert.equal(raw.policy.reviewed_count, writes + targets.length);
    assert.equal(raw.policy.science_target_count, targets.length);
  }
});
