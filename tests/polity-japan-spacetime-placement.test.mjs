import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const JAPAN = "e029b047-544a-52c7-8897-4e494ac72af4";
const TOYOTOMI = "e1548cb1-f89d-538b-9fb2-bad02ad87f8e";
const TOKUGAWA = "46534f7e-9247-5644-b5ad-9525c3d4f5d6";
const EMPIRE = "7f146e58-c3e9-5af7-8cb8-346f03cd7cf6";
const RETIRED_PRE_MEIJI = "7dc78052-3cef-4e39-addc-599fe8b6c309";
const RETIRED_IMPERIAL_UMBRELLA = "ee37aba0-fb1a-4896-a6d2-06e32b77b251";

function activity(id, polityId, startYear, endYear) {
  return {
    id,
    polity: { id: polityId },
    start: { year: startYear },
    end: { year: endYear }
  };
}

test("Japan lineage polities resolve to the reviewed Japan leaf", () => {
  for (const polityId of [JAPAN, TOYOTOMI, TOKUGAWA, EMPIRE]) {
    assert.equal(index.polity_geography[polityId], "east-asia", polityId);
    assert.equal(index.polity_subregions[polityId], "japan", polityId);
  }
});

test("retired editorial Japan umbrella polities cannot remain spatially reachable", () => {
  for (const polityId of [RETIRED_PRE_MEIJI, RETIRED_IMPERIAL_UMBRELLA]) {
    assert.equal(Object.prototype.hasOwnProperty.call(index.polity_geography, polityId), false, polityId);
    assert.equal(Object.prototype.hasOwnProperty.call(index.polity_subregions, polityId), false, polityId);
  }
});

test("Toyotomi, Tokugawa, Empire and occupation-period Japan Activities compile as placed in Japan", () => {
  const lookup = model.createSpatialLookup(index);
  const probes = [
    activity("probe-toyotomi", TOYOTOMI, 1590, 1598),
    activity("probe-tokugawa", TOKUGAWA, 1603, 1605),
    activity("probe-empire", EMPIRE, 1868, 1912),
    activity("probe-occupied-japan", JAPAN, 1945, 1952),
    activity("probe-modern-japan", JAPAN, 1952, 1989)
  ];

  for (const probe of probes) {
    const resolved = model.resolveActivityPlacement(probe, lookup);
    assert.equal(resolved.status, "placed", probe.id);
    assert.equal(resolved.segments.length, 1, probe.id);
    assert.equal(resolved.segments[0].region_code, "east-asia", probe.id);
    assert.equal(resolved.segments[0].subregion_code, "japan", probe.id);
    assert.equal(resolved.segments[0].placement_basis, "polity_geography", probe.id);
  }
});
