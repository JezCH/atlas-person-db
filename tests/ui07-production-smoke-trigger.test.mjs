import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL("../" + p, import.meta.url), "utf8");
const workflow = read(".github/workflows/atlas-spacetime-production-visual.yml");
const smoke = read("scripts/verify-spacetime-production-visual.mjs");
const journey = read("scripts/verify-ui07-production-journey.mjs");

test("UI-07 real browser helper change triggers existing exact-SHA Production visual acceptance", () => {
  const paths = workflow.split("  workflow_dispatch:")[0].split("    paths:")[1];
  assert.ok(paths);
  for (const path of [
    "scripts/verify-spacetime-production-visual.mjs",
    "scripts/verify-ui07-production-journey.mjs",
    ".github/workflows/atlas-spacetime-production-visual.yml"
  ]) {
    assert.ok(paths.includes('      - "' + path + '"'), path + " must trigger the visual smoke");
  }
  assert.match(workflow, /- main\s*\n\s+paths:/);
  assert.doesNotMatch(workflow, /^\s*schedule:/m);
  assert.match(workflow, /ATLAS_EXPECTED_RUNTIME_SHA=\$EXPECTED_SHA/);
  assert.match(workflow, /node scripts\/verify-spacetime-production-visual\.mjs/);
  assert.match(smoke, /verifyUi07DesktopJourney/);
  assert.match(smoke, /verifyUi07MobileJourney/);
  assert.match(journey, /const expected = JSON\.stringify/);
  assert.match(journey, /state\.peers\.includes\(expected\.personB\)/);
});
