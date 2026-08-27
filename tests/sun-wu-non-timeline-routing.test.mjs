import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requireManifest } = require("../server/atlas-correction-manifest-v1-1-service.js");
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/sun-wu-retire-traditional-506-timeline-20260827.v1.json", import.meta.url), "utf8"));
const nonTimeline = JSON.parse(fs.readFileSync(new URL("../non-timeline-persons.json", import.meta.url), "utf8"));

test("Sun Wu is retired from the historical Timeline without discarding the traditional 506 BCE association", () => {
  const parsed = requireManifest(request);
  assert.equal(parsed.operations.length, 1);
  assert.equal(parsed.operations[0].type, "retire_activity");
  assert.equal(parsed.operations[0].relationship_id, "2f57ad5b-8f70-4319-9b59-4a548cba2ad8");
  assert.equal(parsed.operations[0].expected.activity_start, -506);
  assert.equal(parsed.operations[0].expected.activity_end, -506);

  const row = nonTimeline.find((item) => item.person_name === "Sun Wu");
  assert.ok(row);
  assert.equal(row.timeline_status, "excluded");
  assert.equal(row.historicity, "disputed");
  assert.equal(row.traditional_year, -506);
  assert.equal(row.activity_start, null);
  assert.equal(row.activity_end, null);
  assert.match(row.reason, /Modern scholarship widely disputes/);
});
