import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const register = read("atlas-person-monumental-register.css");
const motion = read("atlas-ui-motion-material-v9.css");
const domain = read("atlas-person-domain-palette.css");
const html = read("index.html");

test("P5 keeps domain identity immutable across hover selected focus and visited states", () => {
  assert.match(register, /P5 interaction precedence:/);
  assert.match(register, /data-representative-domain\]:hover[\s\S]*?color: var\(--person-domain-on-dark, #e9e5dd\)/s);
  assert.match(register, /data-representative-domain\]\.is-selected[\s\S]*?color: var\(--person-domain-on-dark, #e9e5dd\)/s);
  assert.match(register, /data-representative-domain\]:focus-visible[\s\S]*?color: var\(--person-domain-on-dark, #e9e5dd\)/s);
  assert.match(register, /\.person-main-name-link:visited,[\s\S]*?color: var\(--person-domain-on-dark, #e9e5dd\)/s);
  assert.match(domain, /\.person-main-name-link:visited[\s\S]*?color: var\(--person-domain-on-dark\)/s);
});

test("P5 selection is neutral metal and does not replace semantic name colors", () => {
  assert.match(register, /\.person-register-entry::after \{[\s\S]*?background: var\(--atlas-honor-metal-strong\)/s);
  assert.match(register, /\.person-register-entry\.is-selected \{[\s\S]*?background: rgba\(255, 255, 255, \.038\)/s);
  assert.match(register, /\.person-register-entry\.is-selected::after \{\s*opacity: 1;\s*transform: scaleY\(1\)/s);
  assert.match(register, /:not\(\[data-representative-domain\]\)\.is-selected[\s\S]*?color: #fffaf0/s);
  assert.doesNotMatch(motion, /\.person-register-entry\.is-selected \.person-main-name-link[\s\S]*?color:/s);
});

test("P5 hover changes luminance and underline treatment without changing domain hue", () => {
  assert.match(register, /\.person-register-entry:hover \{\s*background: rgba\(255, 255, 255, \.018\)/s);
  assert.match(register, /\.person-register-entry:hover::before \{\s*opacity: 1;\s*transform: scaleY\(1\.08\)/s);
  assert.match(register, /\.person-main-name-link:hover \{\s*text-decoration: underline;/s);
  assert.doesNotMatch(register, /\.person-main-name-link:hover \{[^}]*\n\s*color\s*:/s);
  assert.doesNotMatch(motion, /\.person-register-entry:hover \.person-main-name-link/);
});

test("P5 focus states remain visible on row link activity disclosure and restored sort header", () => {
  assert.match(register, /\.person-register-entry:focus-visible \{[\s\S]*?outline: 1px solid rgba\(192, 174, 136, \.52\)/s);
  assert.match(domain, /\.person-main-name-link:focus-visible[\s\S]*?outline: 1px solid var\(--atlas-honor-metal-strong/s);
  assert.match(register, /\.person-activity-toggle:focus-visible[\s\S]*?outline: 1px solid rgba\(208, 188, 145, \.56\)/s);
  assert.match(motion, /\.person-monumental-register \.person-table-sort-button:focus-visible,/);
  assert.doesNotMatch(motion, /person-register-sortbar \.person-table-sort-button:focus-visible/);
});

test("P5 motion layer owns only transitions for Person Register interaction", () => {
  const personMotion = motion.slice(
    motion.indexOf("Person Register: motion only; semantic state lives in Register"),
    motion.indexOf("Detail: entering a person feels like opening a chronicle")
  );
  assert.match(personMotion, /transition:/);
  assert.doesNotMatch(personMotion, /background:\s*var\(--atlas-honor-metal-strong\)/);
  assert.doesNotMatch(personMotion, /color:\s*#f0ece4/);
  assert.doesNotMatch(personMotion, /top:\s*9px/);
  assert.doesNotMatch(personMotion, /left:\s*-7px/);
});

test("P5 cache keys publish the interaction-state owners in final cascade order", () => {
  const registerIndex = html.indexOf("atlas-person-monumental-register.css?v=20261004-ui-p8-horizontal-flow-v1");
  const mobileIndex = html.indexOf("atlas-ui-mobile-v8.css?v=20261004-ui-p4-mobile-compact-v1");
  const motionIndex = html.indexOf("atlas-ui-motion-material-v9.css?v=20261004-ui-p5-interaction-state-v1");
  assert.ok(registerIndex >= 0);
  assert.ok(mobileIndex > registerIndex);
  assert.ok(motionIndex > mobileIndex);
});
