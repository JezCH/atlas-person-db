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
  assert.match(html, /atlas-person-chronicle-detail\.css\?v=20261008-detail-lux1-hero-v1/);
  assert.match(html, /atlas-person-main\.js\?v=20261003-ui-v5-detail-v1/);
});

test("DETAIL-M1 binds Chronicle material to the shared monumental token scale", () => {
  const css = read("atlas-person-chronicle-detail.css");
  assert.match(css, /DETAIL-M1 — Chronicle material normalization/);
  assert.match(css, /border: 1px solid var\(--atlas-material-hairline\)/);
  assert.match(css, /linear-gradient\(180deg, var\(--atlas-material-sheen-strong\), transparent 16rem\)/);
  assert.match(css, /inset 0 -1px 0 var\(--atlas-material-edge-dark-strong\)/);
  assert.match(css, /0 0 0 1px var\(--atlas-material-hairline-soft\)/);
  assert.match(css, /var\(--atlas-material-wash-selected\)/);
  assert.match(css, /var\(--atlas-material-rail-soft\)/);
  assert.doesNotMatch(css, /rgba\(48,54,59,\.(?:48|5|58|62)\)/);
  assert.doesNotMatch(css, /rgba\(192,174,136,\.4\)/);
});

test("DETAIL-M2 uses the shared hover / active luminance scale and keeps Detail state local", () => {
  const css = read("atlas-person-chronicle-detail.css");
  assert.match(css, /DETAIL-M2 — Chronicle interaction luminance/);
  assert.match(css, /\.person-detail-overlay-close:hover \{[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.match(css, /\.person-detail-overlay-close:active \{[\s\S]*?var\(--atlas-material-wash-active\)/);
  assert.match(css, /person-evidence-inspector > summary:hover,[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.match(css, /person-evidence-inspector\[open\] > summary \{[\s\S]*?var\(--atlas-material-wash-active\)/);
  assert.match(css, /person-detail-authoring > summary:hover,[\s\S]*?var\(--atlas-material-wash-hover\)/);
  assert.match(css, /person-detail-authoring\[open\] > summary \{[\s\S]*?var\(--atlas-material-wash-active\)/);
  assert.doesNotMatch(css, /\\n/);
});

test("DETAIL-M3 uses one shared inscription type for historical identity headings", () => {
  const css = read("atlas-person-chronicle-detail.css");
  assert.match(css, /DETAIL-M3 — Chronicle historical identity headings consume the shared/);
  assert.match(css, /\.person-chronicle-identity h2 \{[\s\S]*?font-family: var\(--atlas-font-inscription\);/);
  assert.match(css, /\.person-name-register b \{[\s\S]*?font-family: var\(--atlas-font-inscription\);/);
  assert.match(css, /\.person-chronicle-activity header h4 \{[\s\S]*?font-family: var\(--atlas-font-inscription\);/);
  assert.equal((css.match(/font-family: var\(--atlas-font-inscription\);/g) || []).length, 3);
  assert.doesNotMatch(css, /font-family: var\(--atlas-font-display,/);
  assert.doesNotMatch(css, /font-family: var\(--atlas-font-display\)/);
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


test("DETAIL-M4 preserves the Chronicle disclosure while making evidence metadata legible", () => {
  const css=read("atlas-person-chronicle-detail.css");
  const start=css.indexOf("/* DETAIL-M4 — Evidence microtypography readability.");
  const stop=css.indexOf("/* ---------- Sources: citation register rather than cards ---------- */",start);
  assert.ok(start>=0&&stop>start);
  const evidence=css.slice(start,stop);
  assert.doesNotMatch(evidence,/font-size:\s*(?:6(?:\.5)?|7(?:\.5)?|8(?:\.5)?)px/);
  for(const selector of [
    "person-evidence-inspector > summary b",
    "person-evidence-inspector > summary small",
    "person-evidence-summary-badges i",
    "person-evidence-facts small",
    "person-evidence-facts strong",
    "person-evidence-boundary-meta b"
  ]) assert.ok(evidence.includes(selector),selector);
  assert.match(evidence,/font-size:\s*9px/);
  assert.match(evidence,/font-size:\s*10px/);
  assert.match(evidence,/color:\s*var\(--atlas-text-secondary\)/);
  assert.match(evidence,/color:\s*var\(--atlas-text\)/);
  assert.match(css,/\.person-chronicle-section \.person-source-item small\s*\{\s*color: var\(--atlas-text-secondary\);\s*font-size: 9px;/);
  assert.match(evidence,/\.person-chronicle-activity \.person-evidence-inspector \{/);
  assert.match(evidence,/\.person-chronicle-activity \.person-evidence-boundaries/);
});
