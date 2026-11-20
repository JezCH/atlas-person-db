import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const register = read("atlas-person-monumental-register.css");
const mobile = read("atlas-ui-mobile-v8.css");
const html = read("index.html");

function rule(source, selector) {
  const start = source.indexOf(`${selector} {`);
  assert.ok(start >= 0, `CSS rule must exist: ${selector}`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close);
}

function declaration(source, selector, property) {
  const line = rule(source, selector).split("\n").map((item) => item.trim())
    .find((item) => item.startsWith(`${property}:`));
  assert.ok(line, `Missing declaration ${property} in ${selector}`);
  return line.slice(property.length + 1).split(";")[0].trim();
}

test("VIS-01 desktop: Person names and historical Activity facts use readable type hierarchy", () => {
  assert.equal(declaration(register, ".person-monumental-register .person-table-identity > strong", "font-size"), "17.5px");
  assert.equal(declaration(register, ".person-monumental-register .person-table-range,\n.person-monumental-register .person-register-range", "font-size"), "12.5px");
  assert.equal(declaration(register, ".person-monumental-register .person-table-activities .person-card-activity-head b", "font-size"), "13px");
  assert.equal(declaration(register, ".person-monumental-register .person-table-activities .person-card-activity-role", "font-size"), "12px");
  assert.equal(declaration(register, ".person-monumental-register .person-table-activities .person-card-activity-period", "font-size"), "12px");
  assert.equal(declaration(register, ".person-monumental-register .person-relation-badge", "font-size"), "11px");
  assert.equal(declaration(register, ".person-monumental-register > .person-table-head .person-table-head-cell", "font-size"), "11.5px");
});

test("VIS-01 mobile: era/domain selection is readable, reachable, horizontally scrollable", () => {
  assert.equal(declaration(mobile, ".person-era-search,\n  .person-era-polity-filter,\n  .person-era-relation-filter", "height"), "44px");
  assert.equal(declaration(mobile, ".person-era-nav-step", "width"), "44px");
  assert.equal(declaration(mobile, ".person-era-jump", "min-height"), "44px");
  assert.equal(declaration(mobile, ".person-era-jump-label", "font-size"), "12px");
  assert.equal(declaration(mobile, ".person-era-jump-count", "font-size"), "10px");
  assert.equal(declaration(mobile, ".person-domain-filter", "min-height"), "44px");
  assert.equal(declaration(mobile, ".person-domain-filter", "font-size"), "12px");
  assert.equal(declaration(mobile, ".person-domain-filter em", "font-size"), "10px");
  assert.match(mobile, /\.person-era-jump-list\s*\{[^}]*gap:\s*3px;/);
  assert.match(mobile, /\.person-domain-filter-list\s*\{[^}]*gap:\s*2px;/);
});

test("VIS-01 preserves the merged two-line factual mobile register and versioned assets", () => {
  const twoLine = register.slice(register.indexOf("/* UI-01 P0 — factual two-line mobile register"));
  assert.ok(twoLine.length > 100, "Existing UI-01 mobile two-line layout must remain");
  assert.match(twoLine, /grid-template-areas:\s*"identity range"\s*"activities activities"/);
  assert.match(twoLine, /has-multiple-activities \.person-register-activities/);
  assert.match(register, /\.person-card-activity\s*\+\s*\.person-card-activity/);
  assert.match(html, /atlas-person-monumental-register\.css\?[^"]*vis01=desktop-historical-legibility-v1/);
  assert.match(html, /atlas-ui-mobile-v8\.css\?[^"]*vis01=mobile-nav-readable-v1/);
  assert.ok(html.indexOf("atlas-ui-mobile-v8.css") > html.indexOf("atlas-person-era-navigation.css"), "Mobile readability owner must win over earlier navigation skin");
});
