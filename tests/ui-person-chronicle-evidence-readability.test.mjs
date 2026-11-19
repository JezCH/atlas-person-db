import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../atlas-person-chronicle-detail.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

function ruleBody(selector) {
  const start = css.indexOf(selector + " {");
  assert.ok(start >= 0, `Missing approved Person Chronicle selector: ${selector}`);
  const end = css.indexOf("\n}", start);
  assert.ok(end > start, `Missing closing brace: ${selector}`);
  return css.slice(start, end);
}

function fontPx(selector) {
  const match = ruleBody(selector).match(/font-size:\s*([\d.]+)px\s*(?:!important)?\s*;/);
  assert.ok(match, `No absolute factual font size in ${selector}`);
  return Number(match[1]);
}

test("Person Chronicle exposes readable factual chronology and archival source text", () => {
  const factualSelectors = [
    ".person-detail-status",
    ".person-chronicle-section .person-description small",
    ".person-chronicle-section .person-description p",
    ".person-activity-period-display",
    ".person-activity-role-line",
    ".person-chronicle-activity .person-activity-dates dt",
    ".person-chronicle-activity .person-activity-dates dd",
    ".person-chronicle-activity .person-activity-dates small",
    ".person-chronicle-activity .person-activity-meta",
    ".person-chronicle-activity .person-activity-notes",
    ".person-chronicle-activity .person-evidence-inspector > summary b",
    ".person-chronicle-activity .person-evidence-inspector > summary small",
    ".person-chronicle-activity .person-evidence-sources-head strong",
    ".person-chronicle-section .person-source-item small",
    ".person-chronicle-section .person-source-type"
  ];
  for (const selector of factualSelectors) {
    assert.ok(fontPx(selector) >= 10, `Chronicle field should not be microtype: ${selector} (${fontPx(selector)}px)`);
  }
});

test("factual labels remain readable against the dark Chronicle surface", () => {
  const labels = [
    ".person-chronicle-section .person-description small",
    ".person-chronicle-activity .person-activity-dates dt",
    ".person-chronicle-activity .person-activity-dates small",
    ".person-chronicle-activity .person-activity-meta"
  ];
  for (const selector of labels) {
    const match = ruleBody(selector).match(/color:\s*(#[\da-f]{6})\s*;/i);
    assert.ok(match, `Missing explicit label color: ${selector}`);
    const hex = match[1].slice(1);
    const rgb = [0,2,4].map((i) => parseInt(hex.slice(i,i+2),16) / 255);
    const lin = rgb.map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    const fg = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    const bg = [25,29,33].map((v)=>v / 255).map((v)=>v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4);
    const lumBg = 0.2126*bg[0] + 0.7152*bg[1] + 0.0722*bg[2];
    assert.ok((fg + 0.05) / (lumBg + 0.05) >= 4.5, `Factual label fails AA contrast: ${selector}`);
  }
});

test("Chronicle upgrade retains canonical responsive and cache contracts", () => {
  assert.match(html, /atlas-person-chronicle-detail\.css\?v=20261008-detail-lux2-chronicle-v1&ui=20261119-detail-evidence-readability-v1/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.person-chronicle-activity \.person-activity-dates \{\s*grid-template-columns: 1fr;/s);
  assert.match(css, /\.person-chronicle-activity \.person-evidence-facts,\s*\.person-chronicle-activity \.person-evidence-boundaries \{\s*grid-template-columns: 1fr;/s);
  assert.match(css, /\.person-chronicle-section \.person-source-item/);
});
