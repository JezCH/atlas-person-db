import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const relink = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-later-jin-split-01-relink-nurhaci-20260927.v1.json", import.meta.url), "utf8"));
const retire = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-later-jin-split-02-retire-jurchen-seed-20260927.v1.json", import.meta.url), "utf8"));
const rename = JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-later-jin-five-dynasties-name-disambiguation-20260927.v2.json", import.meta.url), "utf8"));
const shard = JSON.parse(fs.readFileSync(new URL("../spatial/reviewed-bindings/shards/zz-later-jin-polity-split-spatial-20260927.bindings.json", import.meta.url), "utf8"));
const spatial = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const FIVE_DYNASTIES = "0c1849ca-e4ae-572b-bfe3-0253aa08d83a";
const JURCHEN = "2113c54b-b341-43ef-927c-991feebfdcea";
const NURHACI_ACTIVITY = "584039bb-4f23-552f-a304-99b5faf4d176";
const SEED_ACTIVITY = "23157ba3-d0db-4554-a067-26ab2cef562f";

test("Later Jin repair preserves the original Nurhaci Activity UUID while moving it to the Jurchen polity", () => {
  assert.equal(relink.operations.length, 1);
  const op = relink.operations[0];
  assert.equal(op.type, "rewrite_activity");
  assert.equal(op.activity_id, NURHACI_ACTIVITY);
  assert.equal(op.baseline_before.polity_id, FIVE_DYNASTIES);
  assert.equal(op.after.activity_id, NURHACI_ACTIVITY);
  assert.equal(op.after.polity_id, JURCHEN);
  assert.equal(op.after.notes_policy, "PRESERVE_EXACT_LIVE_NOTES");
  assert.equal(op.after.source_links_policy, "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
});

test("temporary Jurchen seed transfers provenance and retires before the preserved original Activity is relinked", () => {
  assert.equal(retire.operations.length, 1);
  const op = retire.operations[0];
  assert.equal(op.type, "retire_activity");
  assert.equal(op.activity_id, SEED_ACTIVITY);
  assert.deepEqual(op.replacement_activity_ids, [NURHACI_ACTIVITY]);
  assert.equal(op.source_transfer_policy, "COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS_AND_LOCATORS_TO_REVIEWED_SURVIVORS_DEDUP_BY_NORMALIZED_LINK_IDENTITY_BEFORE_DELETE");
  assert.equal(op.silent_source_drop_forbidden, true);
  assert.ok(retire.release_order < relink.release_order);\n  assert.equal(relink.operations[0].baseline_before.source_count, 3);
});

test("Five-Dynasties survivor is disambiguated explicitly as 後晉", () => {
  const byLocale = new Map(rename.operations.map((op) => [op.locale, op]));
  assert.deepEqual(
    [byLocale.get("en").expected_name, byLocale.get("en").replacement_name],
    ["Later Jin", "Later Jin (Five Dynasties)"]
  );
  assert.deepEqual(
    [byLocale.get("ko").expected_name, byLocale.get("ko").replacement_name],
    ["후진", "후진(後晉)"]
  );
  assert.ok(relink.release_order < rename.release_order);
});

test("new Jurchen polity has reviewed East Asia / China spatial placement without changing the old polity placement", () => {
  assert.deepEqual(shard.bindings, [{
    polity_id:JURCHEN,
    region_code:"east-asia",
    subregion_code:"china"
  }]);
  assert.equal(spatial.polity_geography[JURCHEN], "east-asia");
  assert.equal(spatial.polity_subregions[JURCHEN], "china");
  assert.equal(spatial.polity_geography[FIVE_DYNASTIES], "east-asia");
  assert.equal(spatial.polity_subregions[FIVE_DYNASTIES], "china");
});
