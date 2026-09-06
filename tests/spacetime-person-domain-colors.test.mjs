import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const domainColors = require("../atlas-person-spacetime-domain-colors.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const CODES = Object.freeze([
  "governance",
  "military",
  "knowledge",
  "technology",
  "commerce",
  "culture",
  "religion",
  "exploration"
]);

function domainUi(values = {}) {
  return {
    DEFINITIONS: CODES.map((code) => ({ code })),
    currentDomain(personId) { return values[personId] ?? null; }
  };
}

class FakeElement {
  constructor(personId, existingDomain = "") {
    this.dataset = { spacetimePerson: personId };
    this.attributes = new Map();
    if (existingDomain) this.attributes.set("data-representative-domain", existingDomain);
  }
  getAttribute(name) { return this.attributes.get(name) || ""; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
}

test("all eight canonical Person domains pass through without UI-side inference", () => {
  const values = Object.fromEntries(CODES.map((code, index) => [`person-${index}`, code]));
  const ui = domainUi(values);
  CODES.forEach((code, index) => {
    assert.equal(domainColors.representativeDomainForPerson(ui, `person-${index}`), code);
  });
});

test("unknown, missing, and unclassified values stay neutral", () => {
  const ui = domainUi({ future: "future-domain", empty: "", unclassified: "unclassified" });
  assert.equal(domainColors.representativeDomainForPerson(ui, "future"), "");
  assert.equal(domainColors.representativeDomainForPerson(ui, "empty"), "");
  assert.equal(domainColors.representativeDomainForPerson(ui, "unclassified"), "");
  assert.equal(domainColors.representativeDomainForPerson(ui, "missing"), "");
  assert.equal(domainColors.representativeDomainForPerson(null, "person"), "");
});

test("decorator sets canonical domain and removes stale/noncanonical presentation state", () => {
  const ui = domainUi({ known: "military", neutral: null });
  const known = new FakeElement("known", "governance");
  const neutral = new FakeElement("neutral", "culture");
  assert.equal(domainColors.decorateElement(known, ui), "military");
  assert.equal(known.getAttribute("data-representative-domain"), "military");
  assert.equal(domainColors.decorateElement(neutral, ui), "");
  assert.equal(neutral.getAttribute("data-representative-domain"), "");
});

test("spacetime domain presentation targets Person labels and rails only", () => {
  assert.match(domainColors.TARGET_SELECTOR, /spacetime-track-label/);
  assert.match(domainColors.TARGET_SELECTOR, /spacetime-track-rail/);
  assert.doesNotMatch(domainColors.TARGET_SELECTOR, /spacetime-activity-glyph/);
  assert.doesNotMatch(domainColors.TARGET_SELECTOR, /spatial-uncertainty/);
});

test("spacetime CSS reuses canonical palette variables without copying palette hex values", () => {
  const css = fs.readFileSync(path.join(root, "atlas-person-spacetime-domain-colors.css"), "utf8");
  for (const code of CODES) assert.match(css, new RegExp(`var\\(--atlas-person-domain-${code}`));
  for (const hex of ["#d4af37", "#b83a3a", "#3f78c5", "#59636d", "#2e8b57", "#9a5ba5", "#e2d7b9", "#d96b1e"]) {
    assert.doesNotMatch(css.toLowerCase(), new RegExp(hex.slice(1), "i"));
  }
  assert.doesNotMatch(css, /spacetime-activity-glyph\[data-representative-domain/);
  assert.match(css, /:not\(\.is-selected\)/);
  assert.match(css, /:not\(\.is-meanwhile-active\)/);
});

test("domain surface owner loads spacetime semantics after canonical domain UI", () => {
  const owner = fs.readFileSync(path.join(root, "atlas-domain-surface-owner.js"), "utf8");
  assert.match(owner, /atlas-person-domain-palette\.css/);
  assert.match(owner, /atlas-person-domain-ui\.js/);
  assert.match(owner, /atlas-person-spacetime-domain-colors\.css/);
  assert.match(owner, /atlas-person-spacetime-domain-colors\.js/);
  assert.match(owner, /script\.addEventListener\("load", ensureSpacetimeDomainAssets/);
});

test("domain integration does not alter spacetime geometry or camera invariants", () => {
  const view = fs.readFileSync(path.join(root, "atlas-person-spacetime-view.js"), "utf8");
  assert.match(view, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 8;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.doesNotMatch(view, /representative_domain/);
  assert.doesNotMatch(view, /ATLAS_PERSON_SPACETIME_DOMAIN_COLORS/);
});
