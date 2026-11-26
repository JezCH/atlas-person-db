import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import compare from "../atlas-person-compare-view.js";

test("comparison uses shared Korean evidence labels and handles unknown enum values", () => {
  const html = compare.render([
    { id: "left", activities: [{
      id: "a",
      start: { year: 1920, month: 12, day: 1, granularity: "day", certainty: "exact", calendar: "gregorian" },
      end: { status: "ongoing" },
      period_basis: { code: "term", display_name: "Term" },
      chronology_status: "reviewed",
      confidence: "well_established"
    }] },
    { id: "right", activities: [{
      id: "b",
      start: { year: 1900, granularity: "year", certainty: "uncertain", calendar: "unrecognized_calendar" }
    }] }
  ]);
  assert.match(html, /정밀도: 일 단위 · 확실성: 정확 · 역법: 그레고리력/);
  assert.match(html, /상태: 진행 중/);
  assert.match(html, /기간 기준: 임기/);
  assert.match(html, /연대 상태: 연대 검토됨 · 근거 수준: 근거 확립/);
  assert.match(html, /정밀도: 연 단위 · 확실성: 불확실 · 역법: 표시 확인 필요/);
  assert.doesNotMatch(html, /unrecognized_calendar|well_established/);
});

test("comparison loads the shared evidence module before the versioned compare asset", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /atlas-person-evidence-view\.js\?[^"]+"[^]*?atlas-person-compare-view\.js\?[^"]+&evidenceLabels=20261126-v1"/);
});
