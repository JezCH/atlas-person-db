import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("Production visual workflow exposes a required exact-SHA manual closure gate", () => {
  const workflow = read(".github/workflows/atlas-spacetime-production-visual.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /expected_runtime_sha:/);
  assert.match(workflow, /required:\s*true/);
  assert.match(workflow, /verify-spacetime-production-exact-sha\.mjs/);
  assert.match(workflow, /verify-spacetime-production-visual\.mjs/);
  assert.match(workflow, /verify-spacetime-production-domain-colors\.mjs/);
});

test("exact-SHA verifier fails closed and byte-compares the current spacetime/domain assets", () => {
  const verifier = read("scripts/verify-spacetime-production-exact-sha.mjs");
  assert.match(verifier, /ATLAS_EXPECTED_RUNTIME_SHA_REQUIRED/);
  assert.match(verifier, /raw\.githubusercontent\.com/);
  assert.match(verifier, /productionBytes\.equals\(githubBytes\)/);
  for (const asset of [
    "atlas-domain-surface-owner.js",
    "atlas-person-domain-palette.css",
    "atlas-person-domain-ui.js",
    "atlas-person-spacetime-domain-colors.js",
    "atlas-person-spacetime-domain-colors.css",
    "atlas-person-spacetime-view.js",
    "atlas-person-spacetime-view.css",
    "atlas-person-spacetime-temporal-certainty.js"
  ]) assert.match(verifier, new RegExp(asset.replaceAll(".", "\\.")));
});

test("real-Chrome domain acceptance preserves Person/Activity semantic separation", () => {
  const verifier = read("scripts/verify-spacetime-production-domain-colors.mjs");
  assert.match(verifier, /canonical_domains\.length === 8/);
  assert.match(verifier, /decorated_label_count > 0/);
  assert.match(verifier, /decorated_rail_count > 0/);
  assert.match(verifier, /canonical_mismatches\.length === 0/);
  assert.match(verifier, /label_rail_mismatches\.length === 0/);
  assert.match(verifier, /activity_glyph_domain_attr_count === 0/);
  assert.match(verifier, /style_mismatches\.length === 0/);
});

test("final acceptance documentation keeps established stable-world invariants", () => {
  const doc = read("docs/spacetime-current-renderer-final-acceptance.md");
  assert.match(doc, /500%/);
  assert.match(doc, /800%/);
  assert.match(doc, /0\.748/);
  assert.match(doc, /no local region\/time compression/);
  assert.match(doc, /Missing, unknown, future, or unclassified values remain neutral/);
  assert.match(doc, /leftover_artifacts: \[\]/);
});
