import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const registry = fs.readFileSync(new URL("../atlas-person-external-references.js", import.meta.url), "utf8");
const main = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");

const IMHOTEP = "da0303c2-1faf-40b8-9dc2-1325b77488d7";
const NAMUWIKI = "https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D";

test("external references come from authoritative Person read metadata instead of static Person mappings", () => {
  assert.match(registry, /READ_ENDPOINT = "\/api\/atlas-person-read"/);
  assert.match(registry, /person\?\.external_references\?\.namuwiki/);
  assert.match(registry, /provider:"namuwiki"/);
  assert.match(registry, /label:"나무위키"/);
  assert.doesNotMatch(registry, new RegExp(IMHOTEP));
  assert.ok(!registry.includes(NAMUWIKI));
  assert.doesNotMatch(registry, /display_name_ko|preferred_name_ko|displayNameForPerson/);
});

test("Person Main keeps authoritative Person display name and renders external links independently", () => {
  assert.match(main, /person\.display_name \|\| person\.canonical_name_en/);
  assert.match(main, /externalReferences\?\.linksForPerson/);
  assert.match(main, /person-external-link/);
  assert.match(main, /rel="noopener noreferrer"/);
  assert.doesNotMatch(main, /displayNameForPerson/);
});

test("external reference assets load before Person Main with the profile cache version", () => {
  assert.match(html, /atlas-person-external-references\.css\?v=20260821-v1/);
  assert.match(html, /atlas-person-external-references\.js\?v=20260821-person-profile-v1/);
  assert.match(html, /atlas-person-main\.js\?v=20260821-person-profile-v1/);
  assert.ok(html.indexOf("atlas-person-external-references.js?v=20260821-person-profile-v1") < html.indexOf("atlas-person-main.js?v=20260821-person-profile-v1"));
  assert.match(html, /atlas-person-era-navigation\.js\?v=20260817-era-search-toolbar-v2/);
});
