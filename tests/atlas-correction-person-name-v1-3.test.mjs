import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MANIFEST_V1_3,
  MARKER_V1_3,
  OPERATION_TYPE,
  requireManifest
} = require("../server/atlas-correction-manifest-v1-3-service.js");

const PERSON = "da0303c2-1faf-40b8-9dc2-1325b77488d7";
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/imhotep-ko-name-v1.json", import.meta.url), "utf8"));
const source = fs.readFileSync(new URL("../server/atlas-correction-manifest-v1-3-service.js", import.meta.url), "utf8");

test("v1.3 manifest replaces one preferred Person name in place", () => {
  const parsed = requireManifest(request);
  assert.equal(parsed.schema, MANIFEST_V1_3);
  assert.equal(MARKER_V1_3, "ATLAS_CORRECTION_MANIFEST_V1_3");
  assert.equal(parsed.operations.length, 1);
  assert.equal(parsed.operations[0].type, OPERATION_TYPE);
  assert.equal(parsed.operations[0].person_id, PERSON);
  assert.deepEqual(parsed.operations[0].expected_before, {
    locale: "ko",
    name: "임호테프",
    name_type: "display",
    is_preferred: true
  });
  assert.deepEqual(parsed.operations[0].expected_after, {
    locale: "ko",
    name: "임호텝",
    name_type: "display",
    is_preferred: true
  });
});

test("v1.3 rejects alias-style no-op or semantic drift", () => {
  const base = structuredClone(request);
  base.operations[0].expected_after.name = "임호테프";
  assert.throws(() => requireManifest(base), /CORRECTION_V13_NO_CHANGE/);

  const localeDrift = structuredClone(request);
  localeDrift.operations[0].expected_after.locale = "en";
  assert.throws(() => requireManifest(localeDrift), /CORRECTION_V13_LOCALE_DRIFT/);

  const typeDrift = structuredClone(request);
  typeDrift.operations[0].expected_after.name_type = "alias";
  assert.throws(() => requireManifest(typeDrift), /CORRECTION_V13_NAME_TYPE_DRIFT/);
});

test("v1.3 mutation updates the existing name row and explicitly rejects stale old-name residue", () => {
  assert.match(source, /update atlas_v2\.person_names[\s\S]*set name=\$2[\s\S]*where id=\$1::uuid/);
  assert.match(source, /CORRECTION_V13_NAME_ROW_ID_DRIFT/);
  assert.match(source, /CORRECTION_V13_STALE_NAME_REMAINED/);
  assert.match(source, /CORRECTION_V13_REPLAY_STALE_NAME/);
  assert.doesNotMatch(source, /insert into atlas_v2\.person_names/i);
});
