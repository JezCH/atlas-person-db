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

test("P12 gives ordinary and multi-Activity mobile rows the same three-column geometry", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /grid-template-columns: minmax\(82px, \.92fr\) minmax\(0, 1\.35fr\) auto/);
  assert.match(mobile, /grid-template-areas: "identity activities range"/);
  assert.doesNotMatch(mobile, /--atlas-person-mobile-count-width/);
  assert.doesNotMatch(mobile, /grid-template-areas: "identity activities range count"/);
  assert.match(mobile, /\.person-register-count \{\s*display: none;/s);
});

test("P12 spans multi-Activity facts through the chronology edge and removes the aggregate range", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"), register.indexOf("@media (max-width: 340px)"));
  assert.match(mobile, /has-multiple-activities \.person-register-range \{\s*display: none;/s);
  assert.match(mobile, /has-multiple-activities \.person-register-activities \{\s*grid-column: 2 \/ 4;\s*grid-row: 1;/s);
  assert.match(mobile, /\.person-card-activity-period \{[\s\S]*?margin-left: auto;[\s\S]*?text-align: right;/s);
});

test("P4 contains long Activity text instead of forcing horizontal overflow", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /person-card-grid\.person-table-grid\.person-monumental-register \{\s*overflow-x: clip;/s);
  assert.match(mobile, /\.person-card-activity-role \{[\s\S]*?min-width: 0;[\s\S]*?overflow-wrap: anywhere;/s);
  assert.match(mobile, /\.person-card-activity-head b \{[\s\S]*?min-width: 0;[\s\S]*?overflow-wrap: anywhere;/s);
});

test("P12 narrow fallback keeps all multi-Activity rows full-width", () => {
  const narrow = register.slice(register.indexOf("@media (max-width: 340px)"));
  assert.match(narrow, /has-multiple-activities \.person-register-activities \{\s*grid-column: 1 \/ -1;\s*grid-row: 2;/s);
  assert.match(narrow, /person-card-activity-period \{[\s\S]*?flex-basis: 100%;[\s\S]*?text-align: right;/s);
});

test("P12 browser assets publish the always-visible alignment fix", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p12-multi-activity-visible-v1/);
  assert.match(html, /atlas-ui-mobile-v8\.css\?v=20261004-ui-p4-mobile-compact-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p12-multi-activity-visible-v1/);
});
