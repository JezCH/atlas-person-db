import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("DETAIL-LUX2 is an editorial paint-only archive, not Person cards", () => {
  const css = read("atlas-person-chronicle-detail.css");
  const html = read("index.html");
  const i = css.indexOf("/* DETAIL-LUX2 — Chronographic editorial linework.");
  const stop = css.indexOf("/* ---------- Authoring:", i);
  assert.ok(i >= 0 && stop > i);
  const block = css.slice(i, stop);
  for (const name of [
    ".person-activity-list::before",
    ".person-chronicle-activity:hover::before",
    ".person-chronicle-activity:focus-within::before",
    ".person-source-item",
    ".person-source-item a:focus-visible",
  ]) assert.ok(block.includes(name), name);
  for (const name of [
    "--atlas-material-rail",
    "--atlas-material-hairline-strong",
    "--atlas-text-strong",
    "--atlas-honor-metal-strong"
  ]) assert.ok(block.includes(name), name);
  assert.doesNotMatch(block, /(?:^|\n)\s*(?:width|height|min-width|max-width|padding|margin|gap|font-size|line-height|grid-template-columns|grid-template-rows|top|left|right|bottom|position|transform|z-index)\s*:/);
  assert.doesNotMatch(block, /animation:|@keyframes|background-image:\s*url\(|\.person-table|\.person-register-entry|\.person-card-grid/);
  assert.match(html, /atlas-person-chronicle-detail\.css\?v=20261008-detail-lux2-chronicle-v1/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
