import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const workflowPath = ".github/workflows/atlas-canonical-data-readiness.yml";
const scriptPath = "scripts/rehearse-atlas-canonical-data-readiness.mjs";

test("canonical readiness replaces the active P11 release-era rehearsal", () => {
  assert.equal(fs.existsSync(workflowPath), true);
  assert.equal(fs.existsSync(scriptPath), true);
  assert.equal(fs.existsSync(".github/workflows/atlas-p11-baseline-b-readiness.yml"), false);
  assert.equal(fs.existsSync("scripts/rehearse-p11-baseline-b-readiness.mjs"), false);
  assert.equal(fs.existsSync("server/atlas-p11-baseline-b-production-service.js"), false);
  assert.equal(fs.existsSync("server/atlas-baseline-b.js"), false);
  assert.equal(fs.existsSync("server/atlas-canonical-data-readiness.js"), true);

  const workflow = fs.readFileSync(workflowPath, "utf8");
  assert.match(workflow, /rehearse-atlas-canonical-data-readiness\.mjs/);
  assert.match(workflow, /atlas-validation-canonical-readiness/);
  assert.doesNotMatch(workflow, /environment:\s*production|id-token:\s*write|SUPABASE_DB_URL/);

  const script = fs.readFileSync(scriptPath, "utf8");
  assert.match(script, /inspectCanonicalDataReadiness/);
  assert.match(script, /ATLAS_CANONICAL_DATA_READINESS_OK/);
  assert.doesNotMatch(script, /atlas-baseline-b|Baseline B|captureProductionBaselineB|captureBaselineB|buildBaselineBDocument/);
});

test("canonical readiness still proves physical merge completion before declaring ready", () => {
  const script = fs.readFileSync(scriptPath, "utf8");
  assert.match(script, /APPROVED_PERSON_MERGES_PENDING:1/);
  assert.match(script, /executeApprovedPersonMerge/);
  assert.match(script, /merged_source_person_still_live/);
  assert.match(script, /canonical_schema_tables_present/);
});
