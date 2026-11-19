import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const route = require("../atlas-entity-route.js");
const person = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const nav = fs.readFileSync(new URL("../atlas-main-authority-nav.js", import.meta.url), "utf8");
const spacetime = fs.readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const detailCss = fs.readFileSync(new URL("../atlas-person-chronicle-detail.css", import.meta.url), "utf8");
const id = "11111111-2222-4333-8444-555555555555";

test("Spacetime has a stable, reloadable Person permalink with exact UUID validation", () => {
  const link = route.entityHash("spacetime", "person", id);
  assert.equal(link, "#atlas-spacetime/person/" + id);
  assert.deepEqual(route.parseHash(link), {
    domain:"spacetime", entity_type:"person", entity_id:id, canonical_hash:link
  });
  for (const invalid of [
    "#atlas-spacetime/person/not-a-uuid",
    "#atlas-spacetime/polity/" + id,
    "#atlas-spacetime/person/" + id + "/extra"
  ]) {
    const parsed = route.parseHash(invalid);
    assert.equal(parsed.entity_id,null);
    assert.equal(parsed.canonical_hash,"#atlas-spacetime");
  }
  assert.equal(route.entityHash("spacetime","polity",id),"#atlas-spacetime");
});

test("Person Detail dispatches the selected UUID; main router transitions without duplicating Person list loading", () => {
  assert.doesNotThrow(() => new Function(person));
  assert.doesNotThrow(() => new Function(nav));
  assert.match(person, /data-person-open-spacetime=/);
  assert.match(person, /selectedPersonDetail\?\.id === personId/);
  assert.match(person, /atlas-person-open-spacetime/);
  assert.match(nav, /addEventListener\("atlas-person-open-spacetime"/);
  assert.match(nav, /showEntity\("spacetime", "person", personId\)/);
  assert.match(nav, /focusPersonId:resolvedRoute\.entity_type === "person"/);
  assert.match(nav, /view\?\.activate\?\.\(\{ focusPersonId, focusActivityId \}\)/);
  assert.doesNotMatch(nav, /\/api\/atlas-/);
});

test("Spacetime finds only verified placed tracks and retains existing search while focusing", () => {
  assert.doesNotThrow(() => new Function(spacetime));
  assert.match(spacetime, /async function activate\(\{ focusPersonId = null \} = \{\}\)/);
  assert.match(spacetime, /ATLAS_ENTITY_ROUTE\?\.normalizeUuid/);
  assert.match(spacetime, /compileAtlas\(\)\.partitioned\.tracks\.some/);
  assert.match(spacetime, /pendingFocusPersonId = requestedPersonId/);
  assert.match(spacetime, /item\.person_id === externalFocusPersonId/);
  assert.match(spacetime, /requestedPlacementMissing/);
  assert.match(spacetime, /role="status"/);
  assert.match(spacetime, /atlas-spacetime-person-selected/);
  assert.match(spacetime, /atlas-spacetime-person-cleared/);
  assert.match(nav, /writeHash\(target, \{ replace:true \}\)/);
  assert.match(nav, /writeHash\(routeModel\.domainHash\("spacetime"\), \{ replace:true \}\)/);
});

test("entry point and detail CTA assets are cache-busted, accessible, and not a new card layout", () => {
  for (const target of ["atlas-person-main.js", "atlas-main-authority-nav.js", "atlas-entity-route.js", "atlas-person-chronicle-detail.css"]) {
    assert.match(html, new RegExp(target.replaceAll(".","\\.") + '[^"]*person-spacetime-crosslink-v1'));
  }
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=20261119-meanwhile-all-activities-v1&region=20261119-ui06a-v1&fix=meanwhile-panel-only-v1&ui=20261119-person-crosslink-v1/);
  assert.match(detailCss, /\.person-chronicle-identity \.person-chronicle-spacetime-link/);
  assert.match(detailCss, /\.person-chronicle-spacetime-link:focus-visible/);
  assert.doesNotMatch(person, /person-portrait-generated|new Portrait/);
});
