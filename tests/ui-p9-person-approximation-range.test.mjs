import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const table=read("atlas-person-table-view.js");
const html=read("index.html");

test("P9 removes the repeated role-side approximation label",()=>{
  assert.doesNotMatch(table,/연대 근사/);
  assert.doesNotMatch(table,/appendApproximationNote/);
});

test("P9 promotes approximation-only chronology differences into the primary Person range",()=>{
  assert.match(table,/function promoteApproximationToPersonRange\(range, periodText\)/);
  assert.match(table,/range\.textContent = periodText/);
  assert.match(table,/range\.dataset\.rangeApproximationFromActivity = "true"/);
  assert.match(table,/normalizeRangeWithoutApproximation/);
  assert.match(table,/approximationOnlyDifference/);
  assert.match(table,/promoteApproximationToPersonRange\(personRangeElement, periodText\)/);
});

test("P9 still suppresses the duplicate single-Activity period after promotion",()=>{
  assert.match(table,/if \(exactMatch \|\| approximationOnlyDifference\)/);
  assert.match(table,/period\.textContent = ""/);
  assert.match(table,/period\.classList\.add\("is-redundant"\)/);
  assert.match(table,/period\.setAttribute\("aria-hidden", "true"\)/);
});

test("P9 passes the actual range element into Activity humanization",()=>{
  assert.match(table,/humanizeActivity\(activity, range, singleActivity\)/);
  assert.match(table,/const personRange = String\(personRangeElement\?\.textContent \|\| ""\)/);
});

test("P9 publishes the promoted chronology decorator",()=>{
  assert.match(html,/atlas-person-table-view\.js\?v=20261004-ui-p9-promote-approximation-v1/);
});
