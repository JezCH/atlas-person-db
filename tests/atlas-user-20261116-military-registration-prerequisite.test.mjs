import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Exact 2026-11-17 Production polity identity screen. This test verifies the
// staging contract; it is not a substitute for the protected OIDC preflight.
const reviewed = [
  ["gar-trinring-tibetan-empire-695", "Gar Trinring Tsendro", "Tibetan Empire", "티베트 제국", "9639b3f0-9b94-42d3-98b9-273c7a601def"],
  ["tran-hung-dao-dai-viet-1288", "Trần Hưng Đạo", "Đại Việt", "대월", "0723204f-d766-475b-9b8a-67fcdda9425b"],
  ["xiemao-ali-jin-1129", "Xiemao Ali", "Jin Dynasty", "금나라", "6a9d6b63-15c9-5b1b-8fd5-29bbf0787dde"]
];
// Immutable source review_context is historical staging metadata, not the
// current canonical registration status. Gar's request retains its earlier
// preflight gate; the later two were promoted through protected OIDC.
const expectedGateBySlug = new Map([
  ["gar-trinring-tibetan-empire-695", "CURRENT_PRODUCTION_PROTECTED_PREFLIGHT_REQUIRED"],
  ["tran-hung-dao-dai-viet-1288", "PROTECTED_OIDC_PREFLIGHT_THEN_READY_ONLY_APPLY"],
  ["xiemao-ali-jin-1129", "PROTECTED_OIDC_PREFLIGHT_THEN_READY_ONLY_APPLY"]
]);
test("user military cohort reuses exact matching Production Polity identities without new Polity creation", () => {
  for (const [slug, person, en, ko, id] of reviewed) {
    const path = `../authoring/requests/user-20261116-${slug}.json`;
    const data = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
    assert.equal(data.review_status, "approved");
    assert.equal(data.person.canonical_name_en, person);
    assert.equal(data.polity.canonical_name_en, en);
    assert.equal(data.polity.display_name_ko, ko);
    assert.equal(data.polity.existing_id, id);
    assert.equal(data.review_context.registration_state, expectedGateBySlug.get(slug));
    if (slug === "gar-trinring-tibetan-empire-695") {
      assert.match(data.review_context.apply_gate, /DO NOT MERGE\/APPLY/);
    } else {
      assert.match(data.review_context.apply_gate, /preflight_batch/);
      assert.match(data.review_context.apply_gate, /READY/);
    }
    assert.ok(data.request_id.startsWith("authoring:user-20261116:"));
    assert.ok(data.sources.length > 0);
    assert.equal(data.external_references.namuwiki.status, "linked");
  }
});
test("the Jin Dynasty UUID cannot select Eastern or Western Jin, and the Tibetan alias cannot mask metadata mismatch", () => {
  const jin = JSON.parse(readFileSync(new URL("../authoring/requests/user-20261116-xiemao-ali-jin-1129.json", import.meta.url), "utf8"));
  const tibet = JSON.parse(readFileSync(new URL("../authoring/requests/user-20261116-gar-trinring-tibetan-empire-695.json", import.meta.url), "utf8"));
  assert.notEqual(jin.polity.existing_id, "2ab00854-f6fa-458b-8482-e9d1379036ba");
  assert.notEqual(jin.polity.existing_id, "77ee4f18-ba76-4e89-a925-431d00b1d214");
  assert.equal(tibet.polity.display_name_ko, "티베트 제국");
  assert.notEqual(tibet.polity.display_name_ko, "토번 제국");
});
