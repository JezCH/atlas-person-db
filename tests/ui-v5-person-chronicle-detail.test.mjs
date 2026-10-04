import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V5 loads Chronicle Detail after the global shell and Person Register", () => {
  const html = read("index.html");
  const foundation = html.indexOf("atlas-ui-visual-foundation.css");
  const register = html.indexOf("atlas-person-monumental-register.css");
  const detail = html.indexOf("atlas-person-chronicle-detail.css");
  assert.ok(foundation >= 0 && register > foundation);
  assert.ok(detail > register, "Chronicle Detail must override the older detail/table presentation layers");
  assert.match(html, /atlas-person-chronicle-detail\.css\?v=20261004-detail-d1-domain-semantics-v1/);
  assert.match(html, /atlas-person-main\.js\?v=20261003-ui-v5-detail-v1/);
});

test("UI V5 makes Person identity and chronology the detail hierarchy", () => {
  const source = read("atlas-person-main.js");
  assert.match(source, /person-chronicle-hero/);
  assert.match(source, /person-chronicle-identity/);
  assert.match(source, /person-detail-canonical/);
  assert.match(source, /person-detail-era/);
  assert.match(source, /person-detail-domain/);
  assert.match(source, /rangeLabel\(person\)/);
  assert.match(source, /domainRegistry\?\.LABELS/);
  assert.match(source, /data-representative-domain/);
});

test("UI V5 uses numbered editorial sections and keeps Authoring subordinate", () => {
  const source = read("atlas-person-main.js");
  assert.match(source, /person-detail-section-index">01/);
  assert.match(source, /<small>NAMES<\/small>/);
  assert.match(source, /person-detail-section-index">02/);
  assert.match(source, /<small>DESCRIPTION<\/small>/);
  assert.match(source, /person-detail-section-index">03/);
  assert.match(source, /<small>ACTIVITIES<\/small>/);
  assert.match(source, /person-detail-section-index">04/);
  assert.match(source, /<small>SOURCES<\/small>/);
  assert.match(source, /<details class="person-detail-authoring">/);
  assert.match(source, /profileEditorHtml\(person, portraitResult\)/);
});

test("UI V5 converts Activity cards into chronological editorial records without dropping evidence", () => {
  const source = read("atlas-person-main.js");
  assert.match(source, /person-chronicle-activity/);
  assert.match(source, /person-activity-period-display/);
  assert.match(source, /person-activity-sequence/);
  assert.match(source, /RELATION_FILTER_LABELS\[relationCode\]/);
  assert.match(source, /boundaryLabel\(activity\.start\)/);
  assert.match(source, /boundaryLabel\(activity\.end\)/);
  assert.match(source, /boundaryMeta\(activity\.start\)/);
  assert.match(source, /boundaryMeta\(activity\.end\)/);
  assert.match(source, /activity\.notes/);
  assert.match(source, /evidenceRenderer\.activityEvidenceHtml\(activity\)/);
  assert.match(source, /data-authoring-action="delete"/);
});

test("UI V5 gives portrait presence without domain-colored surfaces", () => {
  const css = read("atlas-person-chronicle-detail.css");
  assert.match(css, /grid-template-columns: 184px minmax\(0, 1fr\)/);
  assert.match(css, /\.person-chronicle-hero \.person-detail-portrait/);
  assert.match(css, /width: 184px/);
  assert.match(css, /data-representative-domain="military"/);
  assert.match(css, /data-representative-domain="science"/);
  assert.doesNotMatch(css, /data-representative-domain="knowledge"/);
  assert.match(css, /--person-detail-domain-wash: rgba\(184,58,58,\.045\)/);
  assert.match(css, /radial-gradient\(circle at 18% 4%, var\(--person-detail-domain-wash\), transparent 25rem\)/);
  assert.match(css, /width: min\(250px, 74vw\)/);
});

test("UI V5 removes nested card visual grammar from names, activities, sources, and evidence", () => {
  const css = read("atlas-person-chronicle-detail.css");
  assert.match(css, /person-name-register/);
  assert.match(css, /person-chronicle-activity\.person-activity-card/);
  assert.match(css, /border-radius: 0/);
  assert.match(css, /person-chronicle-section \.person-source-item/);
  assert.match(css, /person-chronicle-activity \.person-evidence-inspector/);
  assert.match(css, /person-detail-authoring/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
