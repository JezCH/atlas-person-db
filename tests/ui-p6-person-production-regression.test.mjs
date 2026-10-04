import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const verifier = read("scripts/verify-ui-v10-production-visual.mjs");
const workflow = read(".github/workflows/atlas-spacetime-production-visual.yml");
const exact = read("scripts/verify-spacetime-production-exact-sha.mjs");

test("P6 Production acceptance measures dense Register geometry instead of trusting CSS only", () => {
  assert.match(verifier, /ordinaryMedianHeight/);
  assert.match(verifier, /ordinaryMedianHeight<=56/);
  assert.equal((verifier.match(/ordinaryMedianHeight<=56/g) || []).length, 2);
  assert.match(verifier, /cardLikeCount===0/);
  assert.match(verifier, /quietCountVisible===0/);
  assert.match(verifier, /bodyScrollWidth<=391/);
  assert.match(verifier, /tableHeadVisible/);
});

test("P6 Production acceptance proves Activity disclosure preserves every Activity", () => {
  assert.match(verifier, /async function verifyActivityDisclosure/);
  assert.match(verifier, /declared:Number\(row\.dataset\.activityCount\|\|0\)/);
  assert.match(verifier, /collapsedVisible===1/);
  assert.match(verifier, /expandedVisible===desktopActivityDisclosure\.total/);
  assert.match(verifier, /expandedVisible===mobileActivityDisclosure\.total/);
  assert.match(verifier, /selectedBefore===desktopActivityDisclosure\.selectedAfterExpand/);
  assert.match(verifier, /selectedBefore===mobileActivityDisclosure\.selectedAfterExpand/);
});

test("P6 Production acceptance exercises search and canonical domain filters then restores the result set", () => {
  assert.match(verifier, /async function verifyRegisterFiltering/);
  assert.match(verifier, /api\.setSearchQuery\(firstName\)/);
  assert.match(verifier, /api\.setSearchQuery\(''\)/);
  assert.match(verifier, /api\.setDomainFilter\(domain\)/);
  assert.match(verifier, /api\.setDomainFilter\(''\)/);
  assert.match(verifier, /domainPure/);
  assert.match(verifier, /restoredCount===desktopFiltering\.initialCount/);
});

test("P6 Production acceptance verifies real interaction precedence and rendered WCAG contrast", () => {
  assert.match(verifier, /async function verifyRegisterInteraction/);
  assert.match(verifier, /Input\.dispatchMouseEvent/);
  assert.match(verifier, /row\.matches\(':hover'\)/);
  assert.match(verifier, /focusLinkColor===desktopInteraction\.normalNameColor/);
  assert.match(verifier, /selectedNameColor===desktopInteraction\.normalNameColor/);
  assert.match(verifier, /contrastRatio\(desktopInteraction\.normalNameColor,desktopMain\.bodyBackground\)/);
  assert.match(verifier, /desktopNameContrast>=4\.5/);
});

test("P6 emits durable evidence while preserving the existing V10 report contract", () => {
  assert.match(verifier, /p6_register_regression:"PASS"/);
  assert.match(verifier, /ui-p6-person-register-acceptance\.json/);
  assert.match(verifier, /ATLAS_UI_P6_PERSON_REGISTER_ACCEPTANCE_PASS/);
  assert.match(verifier, /ui-v10-visual-acceptance\.json/);
  assert.match(verifier, /ATLAS_UI_V10_PRODUCTION_VISUAL_ACCEPTANCE_PASS/);
});

test("P6 verifier remains on the exact-SHA Production acceptance path", () => {
  assert.match(workflow, /scripts\/verify-ui-v10-production-visual\.mjs/);
  assert.match(workflow, /node scripts\/verify-ui-v10-production-visual\.mjs/);
  for (const asset of [
    "index.html",
    "atlas-person-monumental-register.css",
    "atlas-ui-mobile-v8.css",
    "atlas-ui-motion-material-v9.css",
    "atlas-person-domain-palette.css"
  ]) {
    assert.ok(exact.includes(`"${asset}"`), `exact-SHA verifier missing ${asset}`);
  }
});
