import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { requireExecutionPlan } = require("../server/atlas-correction-apply-handler.js");
const { synthesizeUnifiedCorrectionV2Manifest } = require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
const { requireUnifiedV2Manifest, unifiedCountDeltas } = require("../server/atlas-correction-manifest-v2-unified-service.js");
const { normalizeStage2AssertionOperation } = require("../server/atlas-correction-v2-stage2-assertions.js");

const path = new globalThis.URL("../corrections/plans/polity-northern-song-scholarly-polity-source-20261011.v1.json", import.meta.url);
const plan = JSON.parse(fs.readFileSync(path, "utf8"));
const SOURCE = "a8766516-351a-4162-b477-0396f468eafe";
const NORTH = "407d91cf-7a97-45e3-81ea-d42a3cbfba35";
const URL = "https://www.cambridge.org/core/books/abs/cambridge-history-of-china/reigns-of-huitsung-11001126-and-chintsung-11261127-and-the-fall-of-the-northern-sung/C1186B649A07ED96C45F2EB2D7318D54";

test("P2-08E scholarly Northern Song plan is an authorized prebinding release and touches no Activities", () => {
  assert.equal(requireExecutionPlan(plan), plan);
  assert.equal(plan.operations.length, 0);
  assert.equal(plan.stage2_assertions.length, 1);
  assert.equal(plan.stage2_assertions[0].type, "assert_polity_source_link");
  assert.deepEqual(plan.stage2_assertions[0].exact_before.link_absent,{polity_id:NORTH,source_id:SOURCE});
  assert.deepEqual(plan.stage2_assertions[0].exact_after, {link:{polity_id:NORTH,source_id:SOURCE},source_canonical_url:URL});
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.no_polity_delete_or_retire,true);
  assert.equal(plan.execution_rules.no_activity_rewrite_or_relink,true);
  assert.equal(plan.execution_rules.no_relation_type_creation,true);
  assert.equal(plan.evidence.production_readonly_run,38066554389);
  assert.equal(plan.evidence.production_readonly_artifact,11674794701);
});

test("P2-08E Plan synthesizes to only one canonical join with exact global count delta", () => {
  const snapshot = {
    schema:"atlas-correction-v2-target-snapshot/v1",
    snapshot_digest:"sha256:"+"a".repeat(64),
    activity_ids:[],activities:[],normalized_activity_source_links:[],
    chronology_claims:[],relationship_descriptions:[]
  };
  const raw = normalizeStage2AssertionOperation(plan.stage2_assertions[0], 1);
  const final = synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);
  const normalized = requireUnifiedV2Manifest(final);
  assert.deepEqual(normalized.operations,[raw]);
  assert.equal(normalized.operations.length,1);
  const delta = unifiedCountDeltas(normalized.operations);
  assert.equal(delta.polity_sources,1);
  for(const [key,value] of Object.entries(delta)) {
    if(key!=="polity_sources") assert.equal(value,0,`unexpected delta for ${key}`);
  }
});
