import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("UI P2 loads the dense Monumental Register after the global visual foundation", () => {
  const html = read("index.html");
  const foundation = html.indexOf("atlas-ui-visual-foundation.css");
  const register = html.indexOf("atlas-person-monumental-register.css?v=20261004-ui-p13-column-balance-polity-height-v1");
  assert.ok(foundation >= 0, "global visual foundation must remain loaded");
  assert.ok(register > foundation, "dense Register layer must load after V3 foundation");
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p13-column-balance-polity-height-v1/);
  assert.match(html, /atlas-person-header-sorting\.js\?v=20261004-ui-p2-dense-register-v1/);
  assert.match(html, /atlas-person-main\.js\?v=20261003-ui-v5-detail-v1/);
});

test("UI P2 projects canonical Person domain into the register row", () => {
  const source = read("atlas-person-main.js");
  assert.match(source, /personDomainsById\?\.\[person\?\.id\]/);
  assert.match(source, /data-representative-domain/);
});

test("UI P2 restores an aligned factual header instead of a detached sort toolbar", () => {
  const source = read("atlas-person-table-view.js");
  const sorting = read("atlas-person-header-sorting.js");
  assert.match(source, /person-monumental-register/);
  assert.match(source, /person-register-entry/);
  assert.match(source, /person-era-band-range/);
  assert.match(source, /grid\.prepend\(makeHeader\(\)\)/);
  assert.doesNotMatch(source, /querySelector\(":scope > \.person-table-head"\)\?\.remove\(\)/);
  assert.doesNotMatch(sorting, /person-register-sortbar/);
  assert.match(sorting, /const header = grid\?\.querySelector\?\.\(":scope > \.person-table-head"\)/);
});

test("UI REG-M1 adds memorial material without changing Register composition", () => {
  const css = read("atlas-person-monumental-register.css");
  const start = css.indexOf("UI REG-M1 — Memorial material finish");
  const end = css.indexOf("/* Mobile becomes", start);
  assert.ok(start >= 0 && end > start, "REG-M1 material scope must remain bounded before mobile rules");
  const material = css.slice(start, end);

  assert.match(material, /--atlas-register-bronze-hairline/);
  assert.match(material, /Polished-black header/);
  assert.match(material, /.person-era-band::after/);
  assert.match(material, /Selection is illumination on the existing register, never a gold card/);
  assert.match(material, /Engraved-register impression/);
  assert.match(material, /@media \(min-width: 761px\)/);

  assert.doesNotMatch(material, /grid-template-columns\s*:/);
  assert.doesNotMatch(material, /padding\s*:/);
  assert.doesNotMatch(material, /font-size\s*:/);
  assert.doesNotMatch(material, /line-height\s*:/);
});

test("MOBILE-REG1 keeps compact geometry while adopting memorial material parity", () => {
  const css = read("atlas-person-monumental-register.css");
  const start = css.indexOf("MOBILE-REG1 — Mobile memorial material parity");
  const end = css.indexOf("@media (max-width: 340px)", start);
  assert.ok(start >= 0 && end > start);
  const mobileMaterial = css.slice(start, end);

  assert.match(mobileMaterial, /var\(--atlas-material-hairline-soft\)/);
  assert.match(mobileMaterial, /var\(--atlas-material-wash-hover\)/);
  assert.match(mobileMaterial, /var\(--atlas-material-wash-selected\)/);
  assert.match(mobileMaterial, /var\(--atlas-material-glint\)/);
  assert.match(mobileMaterial, /var\(--person-register-domain-wash\)/);

  assert.doesNotMatch(mobileMaterial, /grid-template-columns\s*:/);
  assert.doesNotMatch(mobileMaterial, /grid-template-areas\s*:/);
  assert.doesNotMatch(mobileMaterial, /padding\s*:/);
  assert.doesNotMatch(mobileMaterial, /font-size\s*:/);
  assert.doesNotMatch(mobileMaterial, /line-height\s*:/);
  assert.doesNotMatch(mobileMaterial, /min-height\s*:/);
  assert.doesNotMatch(mobileMaterial, /\n\s*width\s*:/);
  assert.doesNotMatch(mobileMaterial, /\n\s*height\s*:/);
});

test("UI P2 keeps semantic domain, dense geometry, and neutral selection separate", () => {
  const css = read("atlas-person-monumental-register.css");
  assert.match(css, /--atlas-font-display/);
  assert.match(css, /--atlas-register-era-width: 78px/);
  assert.match(css, /data-representative-domain="governance"/);
  assert.match(css, /data-representative-domain="science"/);
  assert.doesNotMatch(css, /data-representative-domain="knowledge"/);
  assert.match(css, /var\(--atlas-person-domain-governance/);
  assert.match(css, /\.person-register-entry\.is-selected::after/);
  assert.match(css, /var\(--atlas-honor-metal-strong\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
