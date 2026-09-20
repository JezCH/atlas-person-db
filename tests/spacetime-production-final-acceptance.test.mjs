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
    "atlas-person-spacetime-label-engine.js",
    "atlas-person-spacetime-view.js",
    "atlas-person-spacetime-view.css",
    "atlas-person-spacetime-temporal-certainty.js"
  ]) assert.match(verifier, new RegExp(asset.replaceAll(".", "\\.")));
});

test("Production visual acceptance covers the compact 390px mobile presentation camera", () => {
  const verifier = read("scripts/verify-spacetime-production-visual.mjs");
  assert.match(verifier, /MOBILE_VIEWPORT = Object\.freeze\(\{ width: 390, height: 844/);
  assert.match(verifier, /mobile\.presentation === "mobile"/);
  assert.match(verifier, /mobile\.bodyScrollWidth <= mobile\.viewport\.width \+ 1/);
  assert.match(verifier, /Math\.abs\(mobile\.cornerWidth - 80\)/);
  assert.match(verifier, /mobile\.canvasWidth >= 1500 && mobile\.canvasWidth <= 1600/);
  assert.match(verifier, /mobile\.scrollClientHeight >= 398 && mobile\.scrollClientHeight <= 470/);
  assert.match(verifier, /mobile\.minimapSurfaceRect\.height <= 94/);
  assert.match(verifier, /mobile\.emptyInspectorRect\.height <= 72/);
  assert.match(verifier, /mobile\.cameraRect\.height <= 40 && mobile\.searchRect\.height <= 40/);
  assert.match(verifier, /mobile\.cameraRect\.top >= mobile\.searchRect\.bottom \+ 2/);
  assert.match(verifier, /mobile\.macroOpacity > 0\.99 && mobile\.subregionOpacity < 0\.01/);
  assert.match(verifier, /mobile\.statusSummaryVisible && !mobile\.statusMoreOpen/);
  assert.match(verifier, /spacetime-mobile-390\.png/);
});

test("Production visual acceptance requires every viewport Person name at 500 and 1200 percent", () => {
  const verifier = read("scripts/verify-spacetime-production-visual.mjs");
  assert.match(verifier, /at500\.deferredLabelCount === 0/);
  assert.match(verifier, /at500\.domLabelCount === at500\.domPersonCount/);
  assert.match(verifier, /at1200\.deferredLabelCount === 0/);
  assert.match(verifier, /at1200\.domLabelCount === at1200\.domPersonCount/);
  assert.match(verifier, /spacetime-1200\.png/);
  assert.match(verifier, /at1200\.zoom === "1200%"/);
  assert.match(verifier, /at500\.placeMarkerCount === at500\.reviewedPlaceBindingCount/);
  assert.match(verifier, /at1200\.placeMarkerCount === at1200\.reviewedPlaceBindingCount/);
  assert.doesNotMatch(verifier, /EXPECTED_REVIEWED_PLACE_COUNT/);
  assert.doesNotMatch(verifier, /bandContainment\.label_violation_count === 0/);
  assert.match(verifier, /bandContainment\.rail_violation_count === 0/);
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
  assert.match(doc, /300%/);
  assert.match(doc, /500%/);
  assert.match(doc, /1200%/);
  assert.match(doc, /0\.748/);
  assert.match(doc, /no local region\/time compression/);
  assert.match(doc, /Missing, unknown, future, or unclassified values remain neutral/);
  assert.match(doc, /leftover_artifacts: \[\]/);
});
