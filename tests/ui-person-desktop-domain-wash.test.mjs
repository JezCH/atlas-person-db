import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const css = read("atlas-person-monumental-register.css");
const html = read("index.html");
const person = read("atlas-person-main.js");

function scopedWash() {
  const begin = css.indexOf("/* REG-M1 desktop restoration");
  const end = css.indexOf("/* Mobile becomes a compact two-line register", begin);
  assert.ok(begin >= 0 && end > begin, "desktop wash must be isolated before mobile rules");
  return css.slice(begin, end);
}

test("desktop Person rows get the existing eight-domain translucent wash, not a filled identity slab", () => {
  const area = scopedWash();
  assert.match(area, /@media \(min-width: 761px\)/);
  assert.match(area, /\.person-register-entry\[data-representative-domain\]\s*\{/);
  assert.match(area, /background-image:\s*linear-gradient\(/);
  assert.match(area, /var\(--person-register-domain-wash\) 0%/);
  assert.match(area, /var\(--person-register-domain-wash\) 12%/);
  assert.match(area, /transparent 35%/);
  assert.doesNotMatch(area, /background:\s*[^i]|background-color:|!important|box-shadow: none/);
  assert.match(css, /\.person-card\[data-representative-domain\] \.person-table-identity,[\s\S]*?background: transparent !important;/);
  for (const domain of ["governance","military","science","technology","commerce","culture","religion","exploration"]) {
    assert.ok(css.includes(`data-representative-domain="${domain}"`), `missing ${domain}`);
  }
  assert.match(person, /data-representative-domain="\$\{escapeHtml\(representativeDomain\)\}"/);
});

test("hover and selected keep neutral illumination above, without hiding the subtle domain underneath", () => {
  const area = scopedWash();
  assert.match(area, /\.person-register-entry\[data-representative-domain\]:hover\s*\{[\s\S]*?var\(--atlas-material-wash-hover\)[\s\S]*?var\(--person-register-domain-wash\)/);
  assert.match(area, /\.person-register-entry\[data-representative-domain\]\.is-selected\s*\{[\s\S]*?var\(--atlas-material-wash-selected\)[\s\S]*?var\(--person-register-domain-wash\)/);
  assert.doesNotMatch(area, /(?:^|\n)\s*(?:padding|width|height|grid-template|font|color|border|position|box-shadow)\s*:/m);
});

test("mobile P11 row gradient remains unchanged at <=760px", () => {
  const mobile = css.slice(css.indexOf("/* Mobile becomes a compact two-line register"));
  assert.match(mobile, /@media \(max-width: 760px\)/);
  assert.match(mobile, /var\(--person-register-domain-wash\) 0%/);
  assert.match(mobile, /var\(--person-register-domain-wash\) 16%/);
  assert.match(mobile, /rgba\(0, 0, 0, 0\) 62%/);
  assert.match(mobile, /var\(--atlas-material-wash-hover\)/);
  assert.match(mobile, /var\(--atlas-material-wash-selected\)/);
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261010-desktop-domain-wash-v1/);
});
