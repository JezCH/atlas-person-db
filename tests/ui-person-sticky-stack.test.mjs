import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../atlas-person-sticky-stack.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const nav = fs.readFileSync(new URL("../atlas-person-era-navigation.js", import.meta.url), "utf8");
const register = fs.readFileSync(new URL("../atlas-person-monumental-register.css", import.meta.url), "utf8");

test("Person scroll keeps one viewport scroller and pins an opaque navigation/header stack", () => {
  assert.match(css, /@media \(min-width: 761px\)/);
  assert.match(css, /#personDomainRoot \.person-era-navigator\s*\{[^}]*top: 0;[^}]*z-index: 50;[^}]*background-color: #121518;/);
  assert.match(css, /\.person-monumental-register > \.person-table-head\s*\{[^}]*position: sticky;[^}]*top: var\(--person-table-sticky-top, 0px\);[^}]*z-index: 40;[^}]*background-color: #121518;/);
  assert.match(css, /\.person-table-head \.person-table-head-cell\s*\{[^}]*background-color: #121518;/);
  assert.doesNotMatch(css, /overflow(?:-y)?:\s*(?:auto|scroll)|max-height:|height:\s*100vh/);
});

test("tablet two-line headers remain aligned but no longer lose sticky behavior", () => {
  assert.match(register, /@media \(max-width: 1100px\)/);
  assert.match(register, /\.person-monumental-register > \.person-table-head\s*\{\s*position: static;/);
  assert.match(css, /@media \(min-width: 761px\)/);
  assert.match(css, /position: sticky;/);
  // No overrides apply to mobile's deliberately headerless compact register.
  assert.doesNotMatch(css, /max-width:\s*760px/);
});

test("sticky header is flush under the measured nav without a leaking gap", () => {
  assert.match(nav, /Math\.ceil\(stickyTop \+ height\)/);
  assert.doesNotMatch(nav, /Math\.ceil\(stickyTop \+ height \+ 6\)/);
  const finish = html.indexOf("atlas-ui-phase3-ornaments.css");
  const sticky = html.indexOf("atlas-person-sticky-stack.css?v=20261010-person-sticky-stack-v1");
  assert.ok(finish >= 0 && sticky > finish, "sticky fix must override prior visual styles");
});
