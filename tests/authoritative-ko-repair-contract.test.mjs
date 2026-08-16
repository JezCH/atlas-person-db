import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const service = require("../server/atlas-authoritative-ko-repair-service.js");
const correctionApi = require("../api/atlas-correction-apply.js");
const repair = JSON.parse(fs.readFileSync(new URL("../maintenance/korean-localization/authoritative-ko-repair.json", import.meta.url), "utf8"));

test("authoritative Korean repair catalog is normalized, bounded and reviewed", () => {
  const normalized = service.normalizeRepair(repair);
  assert.equal(repair.schema, "atlas-authoritative-ko-repair/v1");
  assert.equal(repair.review_status, "approved");
  assert.equal(repair.policy.locale, "ko");
  assert.equal(repair.policy.canonical_english_is_preserved, true);
  assert.equal(repair.policy.existing_preferred_korean_is_never_overwritten, true);
  assert.equal(repair.policy.relationship_rows_must_not_change, true);
  assert.equal(normalized.polities.length, 18);
  assert.equal(normalized.periodBases.length, 8);
  assert.equal(new Set(normalized.polities.map((row) => row.id)).size, 18);
  assert.equal(new Set(normalized.periodBases.map((row) => row.code)).size, 8);
  for (const row of normalized.polities) {
    assert.match(row.id, /^[0-9a-f-]{36}$/);
    assert.ok(row.canonical_key.startsWith("stage2:"));
    assert.ok(row.canonical_name_en.length > 0);
    assert.match(row.display_name_ko, /[가-힣]/);
  }
  for (const row of normalized.periodBases) assert.match(row.display_name_ko, /[가-힣]/);
});

test("repair service is constrained to normalized Korean name tables", () => {
  const source = fs.readFileSync(new URL("../server/atlas-authoritative-ko-repair-service.js", import.meta.url), "utf8");
  assert.match(source, /atlas_v2\.polity_names/);
  assert.match(source, /atlas_v2\.period_basis_names/);
  assert.match(source, /KO_REPAIR_RELATIONSHIP_ROWS_CHANGED/);
  assert.doesNotMatch(source, /update\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(source, /delete\s+from\s+atlas_v2\.person_politics_v2/i);
  assert.doesNotMatch(source, /insert\s+into\s+atlas_v2\.person_politics_v2/i);
});

test("production workflow uses exact-SHA OIDC and verifies relationship guard", () => {
  const workflow = fs.readFileSync(new URL("../.github/workflows/atlas-authoritative-ko-repair.yml", import.meta.url), "utf8");
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /atlas-person-db-ko-repair/);
  assert.match(workflow, /deployment_sha/);
  assert.match(workflow, /relationship_guard\.unchanged == true/);
  assert.match(workflow, /atlas-correction-apply\?__atlas_correction_surface=authoritative-ko-repair/);
});

test("Korean repair reuses the correction apply Vercel function instead of adding a thirteenth function", () => {
  const apiDir = new URL("../api/", import.meta.url);
  const apiFiles = fs.readdirSync(apiDir).filter((name) => name.endsWith(".js"));
  const source = fs.readFileSync(new URL("../api/atlas-correction-apply.js", import.meta.url), "utf8");
  assert.equal(apiFiles.length, 12);
  assert.equal(apiFiles.includes("atlas-authoritative-ko-repair.js"), false);
  assert.match(source, /createAuthoritativeKoRepairHandler/);
  assert.match(source, /authoritative-ko-repair/);
  assert.match(source, /ATLAS_CORRECTION_SURFACE_NOT_FOUND/);
});

test("correction surface routing survives Vercel raw request URLs", () => {
  assert.equal(correctionApi.normalizedSurface({ query:{ __atlas_correction_surface:"authoritative-ko-repair" } }), "authoritative-ko-repair");
  assert.equal(correctionApi.normalizedSurface({ url:"/api/atlas-correction-apply?__atlas_correction_surface=authoritative-ko-repair" }), "authoritative-ko-repair");
  assert.equal(correctionApi.normalizedSurface({ url:"/api/atlas-correction-apply?__atlas_correction_surface=a&__atlas_correction_surface=b" }), "__invalid__");
});
