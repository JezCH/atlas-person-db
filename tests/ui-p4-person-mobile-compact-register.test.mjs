import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const register = read("atlas-person-monumental-register.css");
const shell = read("atlas-ui-mobile-v8.css");
const html = read("index.html");

test("P4 gives mobile Person Register one geometry owner", () => {
  assert.match(register, /@media \(max-width: 760px\)/);
  assert.match(shell, /P4 ownership boundary: compact Person Register geometry is defined only in/);
  assert.doesNotMatch(shell, /\.person-monumental-register \.person-register-entry \{[\s\S]*?grid-template-columns:/);
  assert.doesNotMatch(shell, /\.person-monumental-register \.person-table-activities \.person-card-activity \{[\s\S]*?grid-template-columns:/);
});

test("P4 ordinary mobile rows remove the Activity-count track completely", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /--atlas-person-mobile-count-width: 42px/);
  assert.match(mobile, /grid-template-columns: minmax\(0, 1fr\) auto;\s*grid-template-areas:\s*"identity range"\s*"activities activities"/s);
  assert.match(mobile, /\.person-register-entry\.has-multiple-activities \{\s*grid-template-columns: minmax\(0, 1fr\) auto var\(--atlas-person-mobile-count-width\)/s);
  assert.match(mobile, /\.person-register-count\.is-activity-count-quiet \{\s*display: none;/s);
  assert.match(mobile, /@media \(max-width: 520px\)[\s\S]*?--atlas-person-mobile-count-width: 40px/s);
  assert.match(mobile, /@media \(max-width: 390px\)[\s\S]*?--atlas-person-mobile-count-width: 38px/s);
});

test("P4 keeps the mobile scan grammar to identity-range then Activity", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /grid-template-areas:\s*"identity range"\s*"activities activities"/s);
  assert.match(mobile, /has-multiple-activities[\s\S]*?grid-template-areas:\s*"identity range count"\s*"activities activities activities"/s);
  assert.match(mobile, /row-gap: 1px/);
  assert.match(mobile, /padding: 4px 0/);
  assert.match(mobile, /\.person-table-identity > \.person-card-canonical,[\s\S]*?\.person-table-status-inline \{\s*display: none;/s);
  assert.match(mobile, /\.person-register-range \{[\s\S]*?white-space: nowrap;/s);
});

test("P4 contains long Activity text instead of forcing horizontal overflow", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /person-card-grid\.person-table-grid\.person-monumental-register \{\s*overflow-x: clip;/s);
  assert.match(mobile, /\.person-card-activity-role \{[\s\S]*?min-width: 0;[\s\S]*?overflow-wrap: anywhere;/s);
  assert.match(mobile, /\.person-card-activity-head b \{[\s\S]*?min-width: 0;[\s\S]*?overflow-wrap: anywhere;/s);
});

test("P4 keeps the compact multi-Activity control touchable without restoring card height", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /\.person-activity-toggle \{[\s\S]*?min-width: 34px;[\s\S]*?min-height: 28px;/s);
  assert.match(mobile, /margin: -5px 0/);
  assert.match(mobile, /font-size: 7px/);
});

test("P4 browser assets use the compact mobile cache key while P3 runtime remains unchanged", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p10-center-column-v1/);
  assert.match(html, /atlas-ui-mobile-v8\.css\?v=20261004-ui-p4-mobile-compact-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p9-promote-approximation-v1/);
});
