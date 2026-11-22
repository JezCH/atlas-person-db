import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const validator = fileURLToPath(new URL("../scripts/validate-authoring-request-files.mjs", import.meta.url));

test("Stage 2 native registration checks known boundary components", (t) => {
  const cwd = mkdtempSync(join(tmpdir(), "atlas-native-boundary-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(join(cwd, "authoring/requests"), { recursive: true });
  const file = "authoring/requests/native.json";
  const manifest = {
    schema: "atlas-authoring-manifest/v2",
    request_id: "native-test",
    review_status: "approved",
    person: {
      canonical_name_en: "Historical Example",
      life_status: "deceased",
      life_status_checked_at: "2026-11-22",
      life_status_basis: "historical_certainty"
    },
    activity: {
      relation_type_id: "active_in",
      period_basis_id: "known_activity",
      polity_binding: { mode: "existing" },
      role_binding: { mode: "none" },
      activity_start: 1654,
      activity_start_granularity: "day",
      activity_start_certainty: "exact",
      activity_start_calendar: "gregorian"
    }
  };
  function run(month, day) {
    manifest.activity.activity_start_month = month;
    manifest.activity.activity_start_day = day;
    writeFileSync(join(cwd, file), JSON.stringify(manifest));
    return spawnSync(process.execPath, [validator, file], { cwd, encoding: "utf8" });
  }
  assert.equal(run(3, 12).status, 0);
  for (const [month, day, message] of [
    [13, 12, /activity_start_month must be null or 1\.\.12/],
    ["3", 12, /activity_start_month must be null or 1\.\.12/],
    [3, 32, /activity_start_day must be null or 1\.\.31/],
    [null, 12, /activity_start_day requires activity_start_month/]
  ]) {
    const result = run(month, day);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, message);
  }
});
