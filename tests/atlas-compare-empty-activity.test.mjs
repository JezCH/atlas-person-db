import test from "node:test";
import assert from "node:assert/strict";
import view from "../atlas-person-compare-view.js";
import { readFileSync } from "node:fs";

const boundary = (year) => ({ year, certainty: "exact", granularity: "year", calendar: "gregorian" });
const person = (id, years = []) => ({
  id,
  activities: years.map((year) => ({ start: boundary(year), end: boundary(year) }))
});

test("comparison distinguishes missing registered activity from non-overlap", () => {
  assert.match(view.render([person("left", [1654]), person("right")]), /등록된 활동이 없어 활동기간을 비교할 수 없습니다/);
  assert.match(view.render([person("left"), person("right")]), /등록된 활동이 없어 활동기간을 비교할 수 없습니다/);
  assert.match(view.render([person("left", [1654]), person("right", [1859])]), /확인된 활동기간 교차가 없습니다/);
});

test("zero-activity comparison correction is present in shipped JS asset", () => {
  const html = readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(html,/atlas-person-compare-view\.js\?v=[^"]+&zeroActivity=20261121-distinct-v1/);
});
