import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  DOMAIN_DEFINITIONS,
  normalizePersonId,
  normalizeDomain
} = require("../server/atlas-person-domain-service.js");

test("representative person domains stay fixed at eight editorial categories", () => {
  assert.deepEqual(
    DOMAIN_DEFINITIONS.map((item) => item.code),
    ["ruler", "military", "science", "technology", "commerce", "culture", "religion", "exploration"]
  );
});

test("representative domain accepts one controlled value or null", () => {
  assert.equal(normalizeDomain(" ruler "), "ruler");
  assert.equal(normalizeDomain("SCIENCE"), "science");
  assert.equal(normalizeDomain(""), null);
  assert.equal(normalizeDomain(null), null);
  assert.throws(() => normalizeDomain("diplomacy"), /PERSON_DOMAIN_VALUE_UNSUPPORTED/);
  assert.throws(() => normalizeDomain("science,technology"), /PERSON_DOMAIN_VALUE_UNSUPPORTED/);
});

test("person domain target requires a UUID", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(normalizePersonId(id.toUpperCase()), id);
  assert.throws(() => normalizePersonId("Alexander"), /PERSON_DOMAIN_PERSON_ID_REQUIRED/);
});
