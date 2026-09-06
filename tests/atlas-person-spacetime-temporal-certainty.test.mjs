import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const temporal = require("../atlas-person-spacetime-temporal-certainty.js");
const yearLabel = (year) => year < 0 ? `BC ${Math.abs(year)}` : `AD ${year}`;

test("temporal certainty decorates exact, approximate, and uncertain boundaries", () => {
  assert.equal(temporal.boundaryLabel({ year: 1200, certainty: "exact" }, yearLabel), "AD 1200");
  assert.equal(temporal.boundaryLabel({ year: 1200, certainty: "approximate" }, yearLabel), "약 AD 1200");
  assert.equal(temporal.boundaryLabel({ year: 1200, certainty: "uncertain" }, yearLabel), "AD 1200?");
  assert.equal(temporal.boundaryLabel({ year: -1200, certainty: "approximate" }, yearLabel), "약 BC 1200");
  assert.equal(temporal.boundaryLabel({ year: -1190, certainty: "uncertain" }, yearLabel), "BC 1190?");
  assert.equal(temporal.boundaryLabel({ year: 1200, certainty: "future-value" }, yearLabel), "AD 1200");
});

test("period label preserves independent start and end certainty", () => {
  assert.equal(
    temporal.periodLabel({ start: { year: 1200, certainty: "approximate" }, end: { year: 1210, certainty: "uncertain" } }, yearLabel),
    "약 AD 1200 – AD 1210?"
  );
  assert.equal(
    temporal.periodLabel({ start: { year: -1200, certainty: "uncertain" }, end: { year: -1190, certainty: "approximate" } }, yearLabel),
    "BC 1200? – 약 BC 1190"
  );
});

test("unknown and ongoing boundaries preserve the existing period contract", () => {
  assert.equal(temporal.periodLabel({ start: {}, end: {} }, yearLabel), "시작 미상 – 종료 미상");
  assert.equal(temporal.periodLabel({ start: { year: 0, certainty: "approximate" }, end: { year: 1210 } }, yearLabel), "시작 미상 – AD 1210");
  assert.equal(temporal.periodLabel({ start: { year: 1200 }, end: { year: 0, certainty: "uncertain" } }, yearLabel), "AD 1200 – 종료 미상");
  assert.equal(
    temporal.periodLabel({ start: { year: 1200, certainty: "approximate" }, end: { status: "ongoing", as_of: "2026-09-06" } }, yearLabel),
    "약 AD 1200 – 현재 (2026-09-06 확인)"
  );
});

test("spacetime view consumes temporal certainty without changing geometry constants", async () => {
  const source = await readFile(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
  assert.match(source, /atlas-person-spacetime-temporal-certainty\.js\?v=20260906-boundary-certainty/);
  assert.match(source, /temporalCertainty: window\.ATLAS_PERSON_SPACETIME_TEMPORAL_CERTAINTY/);
  assert.match(source, /return temporalCertainty\.periodLabel\(activity, model\.yearLabel\);/);
  assert.match(source, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.match(source, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(source, /const CAMERA_MAX_ZOOM = 8;/);
});
