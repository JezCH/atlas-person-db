import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const main = readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-monumental-register.css", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("every Person stays in the register after the initial expanded rows", () => {
  assert.match(main, /const INITIAL_EXPANDED_ROWS = 48;/);
  assert.match(main, /rows\.map\(\(person, index\) =>\s*index < INITIAL_EXPANDED_ROWS \? personCard\(person\) : deferredPersonCard\(person\)/);
  assert.match(main, /data-person-deferred="true"/);
});

test("mobile deferred Person rows cannot create a clipped fourth grid track", () => {
  const start = css.indexOf("/* Mobile progressive Person rows: show the complete register beyond row 48. */");
  assert.ok(start > 0, "mobile progressive register override must exist");
  const mobile = css.slice(start);
  assert.match(mobile, /@media \(max-width:760px\)/);
  assert.match(mobile, /\.person-era-rows > \.person-table-deferred\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/);
  assert.match(mobile, /grid-template-areas:\s*"name range" "activities activities";/);
  for (const [child, area] of [["name", "name"], ["range", "range"], ["activities", "activities"]]) {
    const rule = mobile.split(".person-table-deferred-" + child + " {")[1]?.split("}")[0] || "";
    assert.ok(rule.includes("grid-area: " + area + ";"), child + " must have an explicit mobile grid area");
  }
  assert.match(mobile, /min-height:\s*56px !important;/);
  assert.match(mobile, /\.person-table-deferred-count\s*\{\s*display:\s*none;/);
  assert.match(html, /mobileDeferred=20261123-complete-roster-v1/);
});
