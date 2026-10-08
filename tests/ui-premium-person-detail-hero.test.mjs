import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("DETAIL-LUX1 publishes the editorial hero refinement without changing register structure", () => {
  const html = read("index.html");
  const css = read("atlas-person-chronicle-detail.css");
  const js = read("atlas-person-main.js");
  assert.match(html, /atlas-person-chronicle-detail\.css\?v=20261008-detail-lux1-hero-v1/);
  assert.ok(html.indexOf("atlas-person-monumental-register.css") < html.indexOf("atlas-person-chronicle-detail.css"));
  assert.match(css, /DETAIL-LUX1 — Premium historical biography opening/);
  assert.match(js, /person-chronicle-hero/);
  assert.match(js, /person-chronicle-identity/);
  assert.match(js, /person-detail-portrait\$\{href \? " has-portrait"/);
  assert.match(js, /person-register-entry|person-card/, "existing register read path remains structurally untouched");
});

test("DETAIL-LUX1 is confined to biography hero paint and genuine-portrait presence", () => {
  const css = read("atlas-person-chronicle-detail.css");
  const start = css.indexOf("/* DETAIL-LUX1 — Premium historical biography opening.");
  const stop = css.indexOf("/* ---------- Editorial sections ---------- */", start);
  assert.ok(start >= 0 && stop > start);
  const finish = css.slice(start, stop);
  for (const selector of [
    ".person-chronicle-hero {",
    ".person-chronicle-hero .person-detail-portrait.has-portrait {",
    ".person-chronicle-hero .person-detail-portrait:not(.has-portrait) {",
    ".person-chronicle-identity h2 {",
    ".person-chronicle-hero .person-detail-canonical {",
    ".person-chronicle-hero .person-detail-era {"
  ]) assert.ok(finish.includes(selector), selector);
  for (const token of [
    "--atlas-material-hairline-strong",
    "--atlas-material-sheen-strong",
    "--atlas-material-edge-dark-strong",
    "--atlas-text-strong",
    "--atlas-text-secondary",
    "--atlas-honor-metal-strong"
  ]) assert.ok(finish.includes(`var(${token})`), token);

  // True visual polish, not hidden layout/era/chronology changes.
  assert.doesNotMatch(finish, /(?:^|\n)\s*(?:width|height|min-width|max-width|min-height|max-height|margin|padding|gap|font-size|font-weight|line-height|letter-spacing|grid-template-columns|grid-template-rows|left|right|top|bottom|position|z-index|transform|opacity)\s*:/);
  assert.doesNotMatch(finish, /@keyframes|animation:|transition:|!important/);
  assert.doesNotMatch(finish, /\.person-table-|\.person-register-entry|\.person-card-grid|data-representative-domain=/);
  assert.doesNotMatch(finish, /url\(|content:\s*["']/);
});

test("DETAIL-LUX1 preserves all responsive hero and shared interaction owners", () => {
  const css = read("atlas-person-chronicle-detail.css");
  const paint = css.indexOf("/* DETAIL-LUX1 — Premium historical biography opening.");
  const mobile = css.indexOf("@media (max-width: 760px)", paint);
  assert.ok(mobile > paint, "existing mobile hero overrides must still load after the finish");
  assert.match(css, /\.person-chronicle-hero\s*\{\s*grid-template-columns:\s*1fr;/);
  assert.match(css, /\.person-chronicle-hero \.person-detail-portrait\s*\{\s*width: min\(250px, 74vw\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
