import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  MANIFEST_SCHEMA,
  readReviewedGovernanceAuthoringManifest
} = require("../server/atlas-stage2-reviewed-governance-authoring.js");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "stage2/authoring/p7-reviewed-governance-contexts.v1.json");

test("reviewed governance authoring manifest is literal, safe, and Hōjō-ready", () => {
  const { manifest, manifest_sha256 } = readReviewedGovernanceAuthoringManifest(manifestPath);
  assert.equal(manifest.schema, MANIFEST_SCHEMA);
  assert.match(manifest_sha256, /^[0-9a-f]{64}$/);
  assert.equal(manifest.contexts.length, 1);
  const context = manifest.contexts[0];
  assert.equal(context.identity_class, "KAMAKURA_BAKUFU_GOVERNMENT");
  assert.equal(context.row.id, "56c8f804-2962-4a5b-90ed-a4913043d0e7");
  assert.equal(context.row.governance_type, "government");
  assert.equal(context.names.filter((name) => name.is_preferred).length, 2);
  assert.equal(manifest.rules.runtime_name_resolution_forbidden, true);
  assert.equal(manifest.rules.territory_geometry_mutation_forbidden, true);
  assert.equal(manifest.rules.production_mutation_authorized, false);
});
