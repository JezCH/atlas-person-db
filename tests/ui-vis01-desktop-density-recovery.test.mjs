import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const register = read("atlas-person-monumental-register.css");
const html = read("index.html");
const browser = read("scripts/verify-ui-v10-production-visual.mjs");

function declaration(block, key) {
  const value = block.split("\n").map(line => line.trim()).find(line => line.startsWith(key + ":"));
  assert.ok(value, "Missing " + key);
  return value.slice(key.length + 1).split(";")[0].trim();
}
function rule(text, selector) {
  const i = text.indexOf(selector + " {");
  assert.ok(i >= 0, "Missing " + selector);
  return text.slice(text.indexOf("{", i) + 1, text.indexOf("}", i));
}

test("VIS-01 compact rows reclaim line boxes while preserving readable font sizes", () => {
  const start = register.indexOf("/* VIS-01 density regression:");
  assert.ok(start > 0);
  const desktop = register.slice(start, register.indexOf("/* Mid-width keeps", start));
  assert.match(desktop, /@media \(min-width: 1101px\)/);
  const selector = ".person-monumental-register .person-register-entry:not(.has-multiple-activities)";
  assert.equal(declaration(rule(desktop, selector), "padding-block"), "2px");
  assert.equal(declaration(rule(desktop, selector + " .person-table-identity"), "gap"), "1px");
  const nameLine = Number.parseFloat(declaration(rule(desktop, selector + " .person-table-identity > strong"), "line-height"));
  const canonicalLine = Number.parseFloat(declaration(rule(desktop, selector + " .person-table-identity > .person-card-canonical"), "line-height"));
  const statusLine = Number.parseFloat(declaration(rule(desktop, selector + " .person-table-status-inline"), "line-height"));
  assert.equal(declaration(rule(desktop, selector + " .person-table-status-inline"), "margin-top"), "0");
  const nameSize = Number.parseFloat(declaration(rule(register, ".person-monumental-register .person-table-identity > strong"), "font-size"));
  const canonicalSize = Number.parseFloat(declaration(rule(register, ".person-monumental-register .person-table-identity > .person-card-canonical"), "font-size"));
  const statusSize = Number.parseFloat(declaration(rule(register, ".person-monumental-register .person-table-status-inline"), "font-size"));
  assert.ok(nameSize >= 17 && canonicalSize >= 11 && statusSize >= 10);
  const predictedHeight = nameSize * nameLine + canonicalSize * canonicalLine + statusSize * statusLine + 2 * 1 + 2 * 2 + 1;
  assert.ok(predictedHeight <= 56, "Three-line estimate exceeds the existing 56px gate: " + predictedHeight);
  assert.match(register, /\/\* UI-01 P0 — factual two-line mobile register/);
  assert.match(desktop, /:not\(\.has-multiple-activities\)/);
});

test("VIS-01 keeps historical Activity facts and real browser acceptance gates", () => {
  for (const [selector, minimum] of [
    [".person-monumental-register .person-table-activities .person-card-activity-head b", 12.5],
    [".person-monumental-register .person-table-activities .person-card-activity-role", 12],
    [".person-monumental-register .person-table-activities .person-card-activity-period", 12],
  ]) {
    assert.ok(Number.parseFloat(declaration(rule(register, selector), "font-size")) >= minimum);
  }
  assert.match(html, /vis01density=ordinary-lineboxes-v1/);
  assert.match(browser, /desktopMain\.ordinaryMedianHeight<=56/);
  assert.match(browser, /item\.namePx>=17/);
  assert.match(browser, /item\.polityPx>=12\.5/);
  assert.match(browser, /item\.rolePx>=12/);
  assert.match(browser, /item\.rangePx>=12/);
});
