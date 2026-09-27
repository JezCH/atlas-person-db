import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const a = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-egypt-split-01-retire-republic-seed-20260927.v1.json", import.meta.url), "utf8"));
const b = JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-egypt-split-02-family-relink-20260927.v1.json", import.meta.url), "utf8"));
const c = JSON.parse(fs.readFileSync(new URL("../corrections/requests/polity-egypt-arab-republic-name-20260927.v2.json", import.meta.url), "utf8"));
const s = JSON.parse(fs.readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

test("release order is monotonic", () => {
  assert.ok(a.release_order < b.release_order);
  assert.ok(b.release_order < c.release_order);
});

test("family repair shape is stable", () => {
  assert.equal(b.operations.length, 12);
  assert.equal(b.operations.filter((x) => x.type === "rewrite_activity" && x.after?.polity_id === "827d3753-154a-4575-aff0-a46048b8fe42").length, 9);
  assert.equal(b.operations.filter((x) => x.type === "split_activity").length, 1);
});

test("newly used polity ids have spatial coverage", () => {
  for (const id of ["b0996783-df13-4b40-baa5-d5864af3c5f5","a602213a-dccb-4a23-96c3-e91dfc300a9f"]) {
    assert.equal(s.polity_geography[id], "africa");
    assert.equal(s.polity_subregions[id], "nile-valley");
  }
});
