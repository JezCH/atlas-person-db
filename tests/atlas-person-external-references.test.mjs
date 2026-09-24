import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = fs.readFileSync(new URL("../atlas-person-external-references.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const tableView = fs.readFileSync(new URL("../atlas-person-table-view.js", import.meta.url), "utf8");
const refsCss = fs.readFileSync(new URL("../atlas-person-external-references.css", import.meta.url), "utf8");
const profileCss = fs.readFileSync(new URL("../atlas-person-profile-editor.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const store = fs.readFileSync(new URL("../atlas-client-data-store.js", import.meta.url), "utf8");

const IMHOTEP = "da0303c2-1faf-40b8-9dc2-1325b77488d7";
const NAMUWIKI = "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D";

test("external references come from the shared authoritative Person snapshot instead of static Person mappings", () => {
  assert.match(registry, /ATLAS_CLIENT_DATA_STORE/);
  assert.match(registry, /dataStore\.loadPersons/);
  assert.match(store, /personReader\.ENDPOINT/);
  assert.match(store, /personReader\.listPersons\(\)/);
  assert.match(registry, /person\?\.external_references\?\.namuwiki/);
  assert.match(registry, /provider:"namuwiki"/);
  assert.match(registry, /label:"나무위키"/);
  assert.doesNotMatch(registry, new RegExp(IMHOTEP));
  assert.ok(!registry.includes(NAMUWIKI));
  assert.doesNotMatch(registry, /display_name_ko|preferred_name_ko|displayNameForPerson/);
});

test("visible NamuWiki presentation is owned by the Person table while hidden detail-link markup is retired", () => {
  assert.match(main, /person\.display_name \|\| person\.canonical_name_en/);
  assert.match(main, /externalReferences\?\.reload\?\.\(\)/);
  assert.match(tableView, /externalReferences\?\.linkForPerson/);
  assert.match(tableView, /person-main-name-link/);
  assert.doesNotMatch(main, /externalLinksHtml|person-external-links|person-external-link/);
  assert.doesNotMatch(refsCss, /person-external-links|person-external-link/);
  assert.doesNotMatch(profileCss, /person-external-links|person-external-link/);
  assert.doesNotMatch(main, /displayNameForPerson/);
});

test("shared Person store and external-reference assets load before Person Main with fresh cache versions", () => {
  assert.match(html, /atlas-person-external-references\.css\?v=20260924-root-batch2/);
  assert.match(html, /atlas-client-data-store\.js\?v=20260919-shared-store-v1/);
  assert.match(html, /atlas-person-external-references\.js\?v=20260919-shared-store-v1/);
  assert.match(html, /atlas-person-main\.js\?v=20260924-portrait-simple-v1/);
  const storeIndex = html.indexOf("atlas-client-data-store.js?v=20260919-shared-store-v1");
  const refsIndex = html.indexOf("atlas-person-external-references.js?v=20260919-shared-store-v1");
  const mainIndex = html.indexOf("atlas-person-main.js?v=20260924-portrait-simple-v1");
  assert.ok(storeIndex >= 0 && storeIndex < refsIndex && refsIndex < mainIndex);
  assert.match(html, /atlas-person-era-navigation\.js\?v=20260920-person-facets-sticky-v1/);
});
