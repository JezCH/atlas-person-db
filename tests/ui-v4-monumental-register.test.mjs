import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI V4 loads Monumental Register after the global visual foundation", () => {
  const html = read("index.html");
  const foundation = html.indexOf("atlas-ui-visual-foundation.css");
  const register = html.indexOf("atlas-person-monumental-register.css");
  assert.ok(foundation >= 0, "global visual foundation must remain loaded");
  assert.ok(register > foundation, "V4 Register layer must load after V3 foundation");
  assert.match(html, /atlas-person-table-view\.js\?v=20261003-ui-v4-register-v1/);
  assert.match(html, /atlas-person-main\.js\?v=20261003-ui-v5-detail-v1/);
});

test("UI V4 projects canonical Person domain into the register row", () => {
  const source = read("atlas-person-main.js");
  assert.match(source, /personDomainsById\?\.\[person\?\.id\]/);
  assert.match(source, /data-representative-domain/);
});

test("UI V4 removes the table header and installs Register structure", () => {
  const source = read("atlas-person-table-view.js");
  assert.match(source, /person-monumental-register/);
  assert.match(source, /person-register-entry/);
  assert.match(source, /person-era-band-range/);
  assert.match(source, /querySelector\(":scope > \.person-table-head"\)\?\.remove\(\)/);
  assert.doesNotMatch(source, /grid\.prepend\(makeHeader\(\)\)/);
});

test("UI V4 keeps semantic domain and neutral selection visually separate", () => {
  const css = read("atlas-person-monumental-register.css");
  assert.match(css, /--atlas-font-display/);
  assert.match(css, /data-representative-domain="governance"/);
  assert.match(css, /var\(--atlas-person-domain-governance/);
  assert.match(css, /\.person-register-entry\.is-selected::after/);
  assert.match(css, /var\(--atlas-honor-metal-strong\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
