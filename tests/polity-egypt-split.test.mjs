import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const retireNasser = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-egypt-split-03-retire-nasser-seed-20260927.v1.json", import.meta.url), "utf8"));
const retireSadat = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-egypt-split-04-retire-sadat-seed-20260927.v1.json", import.meta.url), "utf8"));
const repair = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-egypt-split-05-repair-activities-20260927.v1.json", import.meta.url), "utf8"));
const rename = JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-egypt-arab-republic-name-20260927.v2.json", import.meta.url), "utf8"));
const shard = JSON.parse(fs.readFileSync(new URL("../spatial/reviewed-bindings/shards/zz-egypt-polity-split-spatial-20260927.bindings.json", import.meta.url), "utf8"));
const spatial = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const OLD = "8c25246a-3d73-4df9-8e4a-b0c5ca97c241";
const ANCIENT = "827d3753-154a-4575-aff0-a46048b8fe42";
const PTOLEMAIC = "4131d480-e71d-59ab-a2b6-45f045547a89";
const REPUBLIC = "b0996783-df13-4b40-baa5-d5864af3c5f5";
const UAR = "a602213a-dccb-4a23-96c3-e91dfc300a9f";
const SADAT_ORIGINAL = "cb057be7-43fe-4c0f-921d-1ab41bdcb634";
const SADAT_UAR = "e100c855-4559-5431-8c72-61909a8da746";

test("Egypt temporary seeds retire with provenance before the structural repair", () => {
  assert.ok(retireNasser.release_order < repair.release_order);
  assert.ok(retireSadat.release_order < repair.release_order);
  assert.deepEqual(retireNasser.operations[0].replacement_activity_ids, ["038210f2-1f0d-4158-8940-a094a2dcfd8d"]);
  assert.deepEqual(retireSadat.operations[0].replacement_activity_ids, [SADAT_ORIGINAL]);
  assert.equal(retireNasser.operations[0].source_transfer_policy, "COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS_AND_LOCATORS_TO_REVIEWED_SURVIVORS_DEDUP_BY_NORMALIZED_LINK_IDENTITY_BEFORE_DELETE");
  assert.equal(retireSadat.operations[0].source_transfer_policy, "COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS_AND_LOCATORS_TO_REVIEWED_SURVIVORS_DEDUP_BY_NORMALIZED_LINK_IDENTITY_BEFORE_DELETE");
});

test("all nine ancient Egyptian Activities move off the contaminated Egypt UUID", () => {
  const ancientIds = new Set([
    "b7452328-354d-4a20-97a7-643d164593c1",
    "b7f0f674-4537-4923-a793-326a3e6f6283",
    "a9439165-b9ad-4888-ae40-1bc446d88161",
    "66291204-38b5-4fad-9d01-11bd43569240",
    "8373b743-777a-4ca2-9a04-baf97c960827",
    "ab628afb-3317-41d9-a034-0e4831b6aee5",
    "72b5090a-fdec-43c3-8f6d-717f11a4c042",
    "f582ea25-88c2-5adc-be96-d364959d9680",
    "b5a9d6aa-a641-42dc-9cc4-2e1fb137e02d"
  ]);
  const ops = repair.operations.filter((op) => ancientIds.has(op.activity_id));
  assert.equal(ops.length, 9);
  for (const op of ops) {
    assert.equal(op.type, "rewrite_activity");
    assert.equal(op.baseline_before.polity_id, OLD);
    assert.equal(op.after.activity_id, op.activity_id);
    assert.equal(op.after.polity_id, ANCIENT);
  }
});

test("Ptolemy satrapy uses the Ptolemaic identity with a pre-royal temporal designation", () => {
  const op = repair.operations.find((row) => row.activity_id === "19c869dd-4de8-4a72-85a8-ee4ee06fe3a2");
  assert.equal(op.after.polity_id, PTOLEMAIC);
  assert.equal(op.after.role_id, "d5d3af37-c6f1-47d5-b7c5-79a65accddd5");
  const assertion = repair.stage2_assertions.find((row) => row.type === "assert_polity_designation");
  assert.equal(assertion.exact_after.designation.polity_id, PTOLEMAIC);
  assert.equal(assertion.exact_after.designation.valid_from_year, -323);
  assert.equal(assertion.exact_after.designation.valid_to_year, -305);
  const names = new Map(assertion.exact_after.names.map((row) => [row.locale, row.name]));
  assert.equal(names.get("en"), "Satrapy of Egypt");
  assert.equal(names.get("ko"), "이집트 총독령");
  assert.equal(assertion.exact_after.source_links[0].source_id, "6ef739a4-518c-4ca2-8543-9fb18efeddfb");
});

test("Nasser original Activity is preserved and relinked to Republic of Egypt after seed provenance transfer", () => {
  const op = repair.operations.find((row) => row.activity_id === "038210f2-1f0d-4158-8940-a094a2dcfd8d");
  assert.equal(op.baseline_before.source_count, 2);
  assert.equal(op.after.activity_id, "038210f2-1f0d-4158-8940-a094a2dcfd8d");
  assert.equal(op.after.polity_id, REPUBLIC);
});

test("Sadat is split exactly at the 1971-09-02 Arab Republic name boundary", () => {
  const op = repair.operations.find((row) => row.type === "split_activity");
  assert.equal(op.activity_id, SADAT_ORIGINAL);
  assert.equal(op.baseline_before.source_count, 2);
  const survivor = op.fragments.find((row) => row.survivor);
  const uar = op.fragments.find((row) => !row.survivor);
  assert.equal(survivor.activity_id, SADAT_ORIGINAL);
  assert.equal(survivor.polity_id, OLD);
  assert.deepEqual(
    [survivor.activity_start_detail.year, survivor.activity_start_detail.month, survivor.activity_start_detail.day],
    [1971, 9, 2]
  );
  assert.equal(uar.activity_id, SADAT_UAR);
  assert.equal(uar.polity_id, UAR);
  assert.deepEqual(
    [uar.activity_end_detail.year, uar.activity_end_detail.month, uar.activity_end_detail.day],
    [1971, 9, 1]
  );
  assert.equal(op.source_copy_policy, "COPY_ALL_EXISTING_NORMALIZED_ACTIVITY_SOURCE_LINKS_AND_LOCATORS_TO_ALL_FRAGMENTS");
});

test("the surviving generic Egypt UUID is renamed to Arab Republic of Egypt", () => {
  assert.ok(repair.release_order < rename.release_order);
  const byLocale = new Map(rename.operations.map((op) => [op.locale, op]));
  assert.deepEqual([byLocale.get("en").expected_name, byLocale.get("en").replacement_name], ["Egypt", "Arab Republic of Egypt"]);
  assert.deepEqual([byLocale.get("ko").expected_name, byLocale.get("ko").replacement_name], ["이집트", "이집트 아랍 공화국"]);
});

test("Republic of Egypt receives Nile Valley placement while UAR remains transregional/unbound", () => {
  assert.deepEqual(shard.bindings, [{polity_id:REPUBLIC, region_code:"africa", subregion_code:"nile-valley"}]);
  assert.equal(spatial.polity_geography[REPUBLIC], "africa");
  assert.equal(spatial.polity_subregions[REPUBLIC], "nile-valley");
  assert.equal(spatial.polity_geography[OLD], "africa");
  assert.equal(spatial.polity_subregions[OLD], "nile-valley");
  assert.equal(spatial.polity_geography[ANCIENT], "africa");
  assert.equal(spatial.polity_subregions[ANCIENT], "nile-valley");
  assert.equal(spatial.polity_geography[PTOLEMAIC], "africa");
  assert.equal(spatial.polity_subregions[PTOLEMAIC], "nile-valley");
  assert.equal(spatial.polity_geography[UAR], undefined);
  assert.equal(spatial.polity_subregions[UAR], undefined);
});


test("Sadat UAR fragment has an Activity-specific Nile Valley override while UAR remains review-queued", () => {
  const override = spatial.activity_spatial_overrides.find((row) => row.activity_id === "e100c855-4559-5431-8c72-61909a8da746");
  assert.ok(override);
  assert.equal(override.expected_polity_id, UAR);
  assert.equal(override.expected_start_year, 1970);
  assert.equal(override.expected_end_year, 1971);
  assert.equal(override.region_code, "africa");
  assert.equal(override.subregion_code, "nile-valley");
  assert.equal(spatial.polity_geography[UAR], undefined);
  assert.equal(spatial.polity_subregions[UAR], undefined);
});
