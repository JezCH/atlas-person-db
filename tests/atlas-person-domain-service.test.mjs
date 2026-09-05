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
    ["governance", "military", "knowledge", "technology", "commerce", "culture", "religion", "exploration"]
  );
  assert.deepEqual(
    DOMAIN_DEFINITIONS.map((item) => item.label_ko),
    ["통치·정치", "군사", "학문·과학·사상", "기술·공학·발명", "상업·경제", "문화·예술", "종교·신앙", "탐험·항해"]
  );
});

test("representative domain accepts one canonical controlled value or null", () => {
  assert.equal(normalizeDomain(" governance "), "governance");
  assert.equal(normalizeDomain("KNOWLEDGE"), "knowledge");
  assert.equal(normalizeDomain(""), null);
  assert.equal(normalizeDomain(null), null);
  assert.throws(() => normalizeDomain("ruler"), /PERSON_DOMAIN_VALUE_UNSUPPORTED/);
  assert.throws(() => normalizeDomain("science"), /PERSON_DOMAIN_VALUE_UNSUPPORTED/);
  assert.throws(() => normalizeDomain("diplomacy"), /PERSON_DOMAIN_VALUE_UNSUPPORTED/);
  assert.throws(() => normalizeDomain("knowledge,technology"), /PERSON_DOMAIN_VALUE_UNSUPPORTED/);
});

test("person domain target requires a UUID", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(normalizePersonId(id.toUpperCase()), id);
  assert.throws(() => normalizePersonId("Alexander"), /PERSON_DOMAIN_PERSON_ID_REQUIRED/);
});
