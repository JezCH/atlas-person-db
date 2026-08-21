import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MANIFEST_V1_3,
  POLITY_OPERATION_TYPE,
  requireManifest
} = require("../server/atlas-correction-manifest-v1-3-service.js");

const JIUJIANG = "0c0eb202-5ff6-4280-b664-7764731b508b";
const HUAINAN = "5f739f09-84c0-42ad-ac3f-8c531f468d5d";
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/ying-bu-polity-names-v1.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../server/atlas-correction-manifest-v1-3-service.js", import.meta.url), "utf8");

test("v1.3 manifest supports exact preferred Polity name replacement", () => {
  const parsed = requireManifest(request);
  assert.equal(parsed.schema, MANIFEST_V1_3);
  assert.equal(parsed.operations.length, 4);
  assert.equal(parsed.operations[0].type, POLITY_OPERATION_TYPE);
  assert.equal(parsed.operations[0].polity_id, JIUJIANG);
  assert.equal(parsed.operations[1].polity_id, JIUJIANG);
  assert.equal(parsed.operations[2].polity_id, HUAINAN);
  assert.equal(parsed.operations[3].polity_id, HUAINAN);
  assert.deepEqual(parsed.operations.map((operation) => operation.expected_after.name), [
    "Kingdom of Jiujiang under Western Chu",
    "서초의 구강국",
    "Kingdom of Huainan under Western Han",
    "전한의 회남국"
  ]);
});

test("v1.3 polity operation preserves locale and name type", () => {
  const localeDrift = structuredClone(request);
  localeDrift.operations[0].expected_after.locale = "ko";
  assert.throws(() => requireManifest(localeDrift), /CORRECTION_V13_LOCALE_DRIFT/);

  const typeDrift = structuredClone(request);
  typeDrift.operations[0].expected_after.name_type = "display";
  assert.throws(() => requireManifest(typeDrift), /CORRECTION_V13_NAME_TYPE_DRIFT/);

  const missingId = structuredClone(request);
  delete missingId.operations[0].polity_id;
  assert.throws(() => requireManifest(missingId), /CORRECTION_V13_OP1_POLITY_ID_REQUIRED/);
});

test("v1.3 polity mutation updates existing name rows in place", () => {
  assert.match(source, /update atlas_v2\.polity_names[\s\S]*set name=\$2[\s\S]*where id=\$1::uuid/);
  assert.match(source, /CORRECTION_V13_POLITY_NAME_ROW_ID_DRIFT/);
  assert.match(source, /CORRECTION_V13_POLITY_STALE_NAME_REMAINED/);
  assert.match(source, /CORRECTION_V13_POLITY_REPLAY_STALE_NAME/);
  assert.doesNotMatch(source, /insert into atlas_v2\.polity_names/i);
});
