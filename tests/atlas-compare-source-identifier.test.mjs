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
  assert.match(html, /atlas-person-compare-view\.js\?[^"]*[&?]sourceIdentifier=20261122-v1&sourceEvidence=20261125-v1"/);
});

test("compare preserves actual source title and distinct claim text in both evidence panels", () => {
  const html = compare.render([{
    id: "left",
    sources: [{
      title: "Archive <title>",
      citation_text: "Person claim & evidence",
      display_reference: "Person claim & evidence",
      source_type: "web_bibliographic_reference"
    }],
    activities: [{ id: "act", sources: [{
      title: "Book <title>",
      citation_text: "Specific activity claim",
      display_reference: "Specific activity claim",
      canonical_url: "https://example.org/book",
      source_type: "book",
      locator: "p. 12"
    }]}]
  }, { id: "right" }]);
  assert.match(html, /<span>Archive &lt;title&gt;<\/span><small>인용: Person claim &amp; evidence<\/small><small>유형: web_bibliographic_reference<\/small>/);
  assert.match(html, /href="https:\/\/example\.org\/book"[^>]*>Book &lt;title&gt;<\/a><small>인용: Specific activity claim<\/small><small>유형: book · 위치: p\. 12<\/small>/);
});

test("compare falls back to legacy evidence without duplicated citation or unsafe links", () => {
  const html = compare.render([{
    id: "left",
    sources: [
      { citation_text: "Legacy citation", display_reference: "Legacy citation", canonical_url: "javascript:alert(1)" },
      { title: "Same title", citation_text: "Same title" },
      { title: "Bibliography", display_reference: "Legacy reference" }
    ]
  }, { id: "right" }]);
  assert.match(html, /<span>Legacy citation<\/span><\/li>/);
  assert.match(html, /<span>Same title<\/span><\/li>/);
  assert.match(html, /<span>Bibliography<\/span><small>인용: Legacy reference<\/small>/);
  assert.doesNotMatch(html, /href="javascript:/);
});
