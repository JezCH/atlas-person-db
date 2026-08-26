import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../server/atlas-audit-inventory-handler.js", import.meta.url), "utf8");

test("full audit inventory preserves activity rows across nullable or broken enrichment references", () => {
  assert.match(source, /from atlas_v2\.person_politics_v2 pp\s+left join atlas_v2\.persons p on p\.id=pp\.person_id\s+left join atlas_v2\.polities po on po\.id=pp\.polity_id\s+left join atlas_v2\.roles r on r\.id=pp\.role_id\s+left join atlas_v2\.period_bases pb on pb\.id=pp\.period_basis_id/);
});

test("full audit inventory keeps the authoritative activity cardinality gate", () => {
  assert.match(source, /if \(Number\(counts\.activities\) !== rows\.length\) throw new Error\("AUDIT_BASELINE_ACTIVITY_COUNT_DRIFT"\)/);
  assert.match(source, /new Set\(activityIds\)\.size !== activityIds\.length/);
});
