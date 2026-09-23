import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const eraSource = fs.readFileSync(new URL("../atlas-person-era-model.js", import.meta.url), "utf8");
const domainSource = fs.readFileSync(new URL("../atlas-person-domain-registry.js", import.meta.url), "utf8");
const presentationSource = fs.readFileSync(new URL("../atlas-person-portrait-presentation.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");

function loadPresentation() {
  const context = vm.createContext({ globalThis:null });
  context.globalThis = context;
  vm.runInContext(eraSource, context, { filename:"atlas-person-era-model.js" });
  vm.runInContext(domainSource, context, { filename:"atlas-person-domain-registry.js" });
  vm.runInContext(presentationSource, context, { filename:"atlas-person-portrait-presentation.js" });
  return context.ATLAS_PERSON_PORTRAIT_PRESENTATION;
}

test("portrait presentation derives assets only from canonical era and domain values", () => {
  const presentation = loadPresentation();
  const row = presentation.presentationFor({ first_activity_year:1592 }, "military");
  assert.equal(row.era_code, "early-modern");
  assert.equal(row.frame_url, "./portrait-assets/frames/early-modern.png");
  assert.equal(row.domain_code, "military");
  assert.equal(row.background_url, "./portrait-assets/backgrounds/military.png");
});

test("industrial-imperial canonical era resolves the existing industrial frame filename", () => {
  const presentation = loadPresentation();
  const row = presentation.presentationFor({ first_activity_year:1850 }, "technology");
  assert.equal(row.era_code, "industrial-imperial");
  assert.equal(row.frame_url, "./portrait-assets/frames/industrial.png");
});

test("missing source classifications stay explicit instead of inventing era or domain", () => {
  const presentation = loadPresentation();
  const row = presentation.presentationFor({ first_activity_year:null }, null);
  assert.equal(row.era_code, "unknown");
  assert.equal(row.frame_url, null);
  assert.equal(row.domain_code, null);
  assert.equal(row.background_url, null);
});

test("person detail consumes loaded representative-domain mapping rather than persisting duplicate presentation data", () => {
  assert.match(mainSource, /portraitPresentation\.presentationFor\(person, personDomainsById\?\.\[person\?\.id\]\)/);
  assert.doesNotMatch(mainSource, /person\.portrait_era|person\.portrait_domain/);
});
