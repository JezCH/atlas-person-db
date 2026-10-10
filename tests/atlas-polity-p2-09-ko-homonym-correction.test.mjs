import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { requireManifest, OPERATION_TYPE } = require("../server/atlas-correction-polity-name-v2-service.js");

const path = new globalThis.URL("../corrections/requests/polity-song-ancient-and-qin-jin-ko-homonym-20261011.v1.json",import.meta.url);
const release=JSON.parse(fs.readFileSync(path,"utf8"));

test("P2-09 Korean homonym correction is an exact two-only existing preferred-name value replacement", () => {
  const manifest=requireManifest(release);
  assert.equal(release.schema,"atlas-correction-manifest/v2");
  assert.equal(release.review_status,"approved");
  assert.equal(manifest.operations.length,2);
  assert.deepEqual(manifest.operations.map(o=>({
    type:o.type,polity_id:o.polity_id,locale:o.locale,
    expected_name:o.expected_name,replacement_name:o.replacement_name
  })),[
    {type:OPERATION_TYPE,polity_id:"f5547f25-fbae-5a84-ad65-04bdb82de1e7",locale:"ko",expected_name:"송나라",replacement_name:"고대 송나라(宋)"},
    {type:OPERATION_TYPE,polity_id:"ddf1b350-17ea-5275-bc33-e6d86ab4d868",locale:"ko",expected_name:"진나라",replacement_name:"진(晉)"}
  ]);
  assert.equal(release.evidence.production_census_run,38072668164);
  assert.equal(release.evidence.production_census_artifact,11677785165);
  assert.equal(release.expected_guards.no_polity_retirement_merge_relink,true);
  assert.equal(release.expected_guards.person_activities_unchanged,true);
  assert.equal(release.expected_guards.preferred_name_row_uuids_preserved,true);
  assert.equal(release.expected_guards.all_sources_and_source_joins_unchanged,true);
  assert.equal(release.expected_guards.qin_original_preferred_ko_untouched,true);
  assert.equal(release.expected_guards.song_dynasty_original_preferred_ko_untouched,true);
});

test("only covered REVIEW_REQUIRED registry cases, unique polity targets and distinct normalized replacements", () => {
  const cases=new Set(release.operations.map(x=>x.case_id));
  assert.equal(cases.size,2);
  assert.equal([...cases].every(x=>x.startsWith("song-ko-name-collision")||x.startsWith("qin-jin-ko-name-collision")),true);
  assert.equal(new Set(release.operations.map(x=>x.polity_id)).size,2);
  assert.equal(new Set(release.operations.map(x=>x.replacement_name)).size,2);
  assert.equal(release.operations.some(x=>x.polity_id==="1a1983fd-1850-5756-877c-3d2c17b85e1f"),false);
  assert.equal(release.operations.some(x=>x.polity_id==="4ed462b6-6d39-571a-bb18-3e320bddd199"),false);
  assert.equal(release.operations.some(x=>x.type.includes("retire")||x.type.includes("merge")||x.type.includes("rewrite_activity")),false);
});
