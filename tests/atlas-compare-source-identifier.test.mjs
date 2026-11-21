import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import compare from "../atlas-person-compare-view.js";

test("compare keeps published identifiers for person and activity evidence", () => {
  const html = compare.render([{
    id: "left",
    sources: [{ title: "Archive record", external_identifier: "ID <42>" }],
    activities: [{ id: "activity", sources: [{
      title: "Historical reference",
      external_identifier: "DOI & reference",
      canonical_url: "https://example.org/reference",
      locator: "p. 12"
    }] }]
  }, { id: "right" }]);
  assert.match(html, /식별자: ID &lt;42&gt;/);
  assert.match(html, /식별자: DOI &amp; reference · 위치: p\. 12/);
  assert.match(html, /href="https:\/\/example\.org\/reference"/);
});

test("index serves the comparison asset at the updated version", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /atlas-person-compare-view\.js\?[^"]*[&?]sourceIdentifier=20261122-v1"/);
});
