import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const assertions = require("../server/atlas-correction-v2-stage2-assertions.js");
const unified = require("../server/atlas-correction-manifest-v2-unified-service.js");
const core = require("../server/atlas-correction-manifest-v2-service.js");
const { sha256 } = require("../server/atlas-correction-v2-manifest-synthesizer.js");

const POLITY = "407d91cf-7a97-45e3-81ea-d42a3cbfba35"; // existing Northern Song
const SOURCE = "a8766516-351a-4162-b477-0396f468eafe"; // actual normalized Ari Levine Source
const URL = "https://www.cambridge.org/core/books/abs/cambridge-history-of-china/reigns-of-huitsung-11001126-and-chintsung-11261127-and-the-fall-of-the-northern-sung/C1186B649A07ED96C45F2EB2D7318D54";

function raw() {
  return {
    type: "assert_polity_source_link",
    decision_id: "song-northern-scholarly-polity-provenance",
    exact_before: { link_absent: { polity_id: POLITY, source_id: SOURCE } },
    exact_after: { link: { polity_id: POLITY, source_id: SOURCE }, source_canonical_url: URL }
  };
}

function op() { return assertions.normalizeStage2AssertionOperation(raw(), 1); }

function clientFor({ linked = false, canonicalUrl = URL, missingSource = false, missingPolity = false } = {}) {
  const calls = [];
  const client = {
    async query(sql, values) {
      calls.push({ sql: String(sql), values });
      if (/from atlas_v2\.polities/i.test(sql)) return { rowCount: missingPolity ? 0 : 1, rows: missingPolity ? [] : [{ id: POLITY }] };
      if (/from atlas_v2\.sources where id/i.test(sql)) return {
        rowCount: missingSource ? 0 : 1,
        rows: missingSource ? [] : [{ id: SOURCE, canonical_url: canonicalUrl }]
      };
      if (/from atlas_v2\.polity_sources ps/i.test(sql)) return {
        rowCount: linked ? 1 : 0,
        rows: linked ? [{ polity_id: POLITY, source_id: SOURCE, source_canonical_url: canonicalUrl }] : []
      };
      if (/insert into atlas_v2\.polity_sources/i.test(sql)) return { rowCount: 1, rows: [] };
      throw new Error("Unexpected SQL: " + sql);
    }
  };
  return { client, calls };
}

test("reviewed Polity Source assertion is a composite join with no invented UUID/locator", () => {
  const normalized = op();
  assert.equal(assertions.STAGE2_ASSERTION_TYPES.has(normalized.type), true);
  assert.deepEqual(normalized.exact_before.link_absent, { polity_id: POLITY, source_id: SOURCE });
  assert.deepEqual(normalized.exact_after, { link: { polity_id: POLITY, source_id: SOURCE }, source_canonical_url: URL });
  const identity = assertions.stage2AssertionIdentity(normalized);
  assert.equal(identity.id, `polity-source:${POLITY}:${SOURCE}`);
  assert.deepEqual(identity.source_links, []);
  assert.deepEqual(identity.name_ids, []);
  assert.equal(assertions.stage2AssertionCountDelta(normalized).polity_sources, 1);
  assert.equal(unified.unifiedCountDeltas([normalized]).polity_sources, 1);
});

test("fail closed on fabricated locator, synthetic primary key, or changed source identity", () => {
  for (const [field, value] of [["source_locator_key", URL], ["id", "88888888-8888-4888-8888-888888888888"]]) {
    const changed = raw();
    changed.exact_after.link[field] = value;
    assert.throws(() => assertions.normalizeStage2AssertionOperation(changed, 1), /EXACT_LINK_REQUIRED/);
  }
  const changed = raw();
  changed.exact_before.link_absent.source_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.throws(() => assertions.normalizeStage2AssertionOperation(changed, 1), /EXACT_BEFORE_MISMATCH/);
  const changedUrl = raw();
  changedUrl.exact_after.source_canonical_url = "http://example.com";
  assert.throws(() => assertions.normalizeStage2AssertionOperation(changedUrl, 1), /SOURCE_URL_REQUIRED/);
});

test("read-before-write verifies real Polity, existing academic Source URL and absent exact pair", async () => {
  const { client, calls } = clientFor();
  await assertions.assertStage2AssertionAbsent(client, op());
  assert.equal(calls.length, 3);
  assert.match(calls[0].sql, /from atlas_v2\.polities/i);
  assert.match(calls[1].sql, /from atlas_v2\.sources/i);
  assert.match(calls[2].sql, /from atlas_v2\.polity_sources/i);
  assert.deepEqual(calls[2].values, [POLITY, SOURCE]);
});

test("preflight blocks duplicates, nonexistent UUIDs and Source URL drift", async () => {
  await assert.rejects(() => assertions.assertStage2AssertionAbsent(clientFor({ linked:true }).client, op()), /LINK_ALREADY_EXISTS/);
  await assert.rejects(() => assertions.assertStage2AssertionAbsent(clientFor({ missingSource:true }).client, op()), /SOURCE_MISSING/);
  await assert.rejects(() => assertions.assertStage2AssertionAbsent(clientFor({ missingPolity:true }).client, op()), /POLITY_MISSING/);
  await assert.rejects(() => assertions.assertStage2AssertionAbsent(clientFor({ canonicalUrl:"https://example.com/other" }).client, op()), /CANONICAL_URL_DRIFT/);
});

test("canonical write inserts exactly one composite pair; never deletes or rewrites a Source", async () => {
  const { client, calls } = clientFor();
  await assertions.insertStage2AssertionBundle(client, op());
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /^insert into atlas_v2\.polity_sources\(polity_id,source_id\) values\(\$1::uuid,\$2::uuid\)$/i);
  assert.deepEqual(calls[0].values, [POLITY, SOURCE]);
  assert.doesNotMatch(calls[0].sql, /delete|update|on conflict/i);
});

test("replay verification must preserve both pair and exact existing normalized Source URL", async () => {
  await assertions.verifyStage2AssertionApplied(clientFor({ linked:true }).client, op());
  await assert.rejects(() => assertions.verifyStage2AssertionApplied(clientFor({ linked:false }).client, op()), /REPLAY_POLITY_SOURCE_DRIFT/);
  await assert.rejects(() => assertions.verifyStage2AssertionApplied(clientFor({ linked:true,canonicalUrl:"https://example.com/changed" }).client, op()), /REPLAY_POLITY_SOURCE_DRIFT/);
});

test("unified production manifest accepts an exact composite assertion and rejects repeated same fact", () => {
  function manifest(operations) {
    const rawManifest = {
      schema: core.MANIFEST_V2,
      review_status: "approved",
      production_executable: true,
      request_id: "test-p2-08e-polity-source",
      exact_live_snapshot_digest: "sha256:" + "a".repeat(64),
      operations
    };
    return { ...rawManifest, manifest_sha256: sha256(core.manifestCore(rawManifest)) };
  }
  assert.equal(unified.requireUnifiedV2Manifest(manifest([raw()])).operations[0].type, "assert_polity_source_link");
  assert.throws(() => unified.requireUnifiedV2Manifest(manifest([raw(),raw()])), /ASSERTION_ID_REUSED/);
});

test("authenticated correction transport, reviewed release gate and activity-free synthesis agree on source-only plan", () => {
  const fs = require("node:fs");
  const { requireExecutionPlan } = require("../server/atlas-correction-apply-handler.js");
  const { synthesizeUnifiedCorrectionV2Manifest } = require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
  const plan = {
    schema: "atlas-stage2-correction-v2-execution-plan/v1",
    batch_id: "p2_08e_source_only_unit",
    execution_rules: { production_executable:false, production_mutation_authorized:false },
    operations: [],
    stage2_assertions: [raw()]
  };
  assert.equal(requireExecutionPlan(plan), plan);
  const snapshot = {
    schema:"atlas-correction-v2-target-snapshot/v1",
    activity_ids:[], activities:[], normalized_activity_source_links:[],
    chronology_claims:[], relationship_descriptions:[],
    snapshot_digest:"sha256:" + "a".repeat(64)
  };
  const manifest = synthesizeUnifiedCorrectionV2Manifest(plan, snapshot);
  assert.deepEqual(manifest.operations.map(x=>x.type), ["assert_polity_source_link"]);
  assert.equal(manifest.exact_live_snapshot_digest, snapshot.snapshot_digest);
  const yaml = fs.readFileSync(new URL("../.github/workflows/atlas-correction-apply.yml", import.meta.url), "utf8");
  assert.match(yaml, /all\(. == "assert_source"[^\n]*"assert_polity_source_link"/);
  assert.match(yaml, /any\(. == "assert_governance_context"[^\n]*"assert_polity_source_link"/);
  const invalid = { ...plan, stage2_assertions:[{type:"assert_source"}] };
  assert.throws(() => requireExecutionPlan(invalid), /ASSERTION_ONLY_SCOPE_INVALID/);
});
