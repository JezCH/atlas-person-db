import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const layout = require("../atlas-person-spacetime-presentation-layout.js");

const continuum = spaceAxis.createSpatialContinuum();
const CONTENT_WIDTH = 1275 * 5 * 0.748;

function segment(id, subregion, start, end, options = {}) {
  const band = continuum.bandForCode(subregion);
  return Object.freeze({
    stable_id:id,
    activity_id:id,
    start_ordinal:start,
    end_ordinal:end,
    x_anchor:Number.isFinite(options.x_anchor) ? options.x_anchor : band.center_space,
    macroregion_code:band.parent_code,
    subregion_code:subregion,
    spatial_precision:options.spatial_precision || "subregion"
  });
}

function track(id, segments) {
  return Object.freeze({ person_id:id, track_id:id, primary_segments:Object.freeze(segments) });
}

test("subregion tracks use a compact rail corridor and the remaining band width as label space", () => {
  const a = segment("china-a", "china", 100, 150);
  const b = segment("china-b", "china", 120, 160);
  const presentation = layout.compileTrackPresentation([track("a",[a]), track("b",[b])], continuum, CONTENT_WIDTH);
  const ga = layout.geometryForSegment(presentation, a);
  const gb = layout.geometryForSegment(presentation, b);
  const china = continuum.bandForCode("china");
  const left = china.min_space * CONTENT_WIDTH;
  const right = china.max_space * CONTENT_WIDTH;

  assert.equal(ga.band_code, "china");
  assert.equal(ga.rail_basis, "presentation_corridor");
  assert.equal(gb.rail_basis, "presentation_corridor");
  assert.notEqual(ga.rail_x, gb.rail_x, "overlapping intervals need separate rail lanes");
  assert.ok(ga.rail_x >= left && ga.rail_x < left + (right-left) * 0.4);
  assert.ok(gb.rail_x >= left && gb.rail_x < left + (right-left) * 0.4);
  assert.ok(ga.label_left > ga.rail_x);
  assert.ok(ga.label_right <= right + 1e-9);
  assert.ok(ga.label_width > (right-left) * 0.72, "refined taxonomy keeps most of the band available to the name");
});

test("equal leaf width restores readable label room at the 500 percent floor", () => {
  const probes = [
    segment("europe-name", "central-europe", 100, 150),
    segment("china-name", "china", 100, 150),
    segment("korea-name", "korean-peninsula", 100, 150),
    segment("japan-name", "japan", 100, 150)
  ];
  const presentation = layout.compileTrackPresentation(
    probes.map((s, i) => track(`readable-${i}`, [s])),
    continuum,
    CONTENT_WIDTH
  );

  const expectedLeafWidth = CONTENT_WIDTH / 39;
  assert.ok(expectedLeafWidth > 120, "500% wide-desktop floor should keep each refined leaf above 120px");

  for (const s of probes) {
    const g = layout.geometryForSegment(presentation, s);
    const box = layout.activityBox(presentation, s, 100, { minWidth: 30, maxWidth: 148 });
    assert.ok(g.label_width >= 100, `${s.subregion_code}: ordinary name zone must not collapse`);
    assert.equal(box.width, 100, `${s.subregion_code}: a 100px natural label should fit without forced shrink`);
    assert.ok(box.left >= g.band_left - 1e-9);
    assert.ok(box.left + box.width <= g.band_right + 1e-9);
  }
});

test("non-overlapping intervals reuse presentation lanes deterministically", () => {
  const a = segment("reuse-a", "korean-peninsula", 100, 120);
  const b = segment("reuse-b", "korean-peninsula", 121, 140);
  const tracks = [track("a",[a]), track("b",[b])];
  const first = layout.compileTrackPresentation(tracks, continuum, CONTENT_WIDTH);
  const second = layout.compileTrackPresentation(tracks, continuum, CONTENT_WIDTH);
  const ga = layout.geometryForSegment(first, a);
  const gb = layout.geometryForSegment(first, b);

  assert.equal(ga.lane_index, 0);
  assert.equal(gb.lane_index, 0);
  assert.equal(ga.rail_x, gb.rail_x);
  assert.deepEqual([...first.geometry.entries()], [...second.geometry.entries()]);
});

test("presentation x changes without mutating the historical x anchor", () => {
  const s = segment("korea-display", "korean-peninsula", 200, 250);
  const presentation = layout.compileTrackPresentation([track("p",[s])], continuum, CONTENT_WIDTH);
  const historicalX = s.x_anchor * CONTENT_WIDTH;
  const projected = Object.freeze({
    person_id:"p",
    track_id:"p",
    x:historicalX,
    y:300,
    representative:s,
    macroregion_code:s.macroregion_code
  });
  const displayed = layout.applyTrackPresentation(projected, presentation);

  assert.equal(displayed.historical_x, historicalX);
  assert.notEqual(displayed.x, historicalX);
  assert.equal(displayed.presentation_band_code, "korean-peninsula");
  assert.equal(displayed.presentation_rail_basis, "presentation_corridor");
});

test("reviewed Place precision keeps its exact historical anchor while choosing label room inside its band", () => {
  const band = continuum.bandForCode("japan");
  const exact = band.min_space + (band.max_space-band.min_space) * 0.72;
  const s = segment("place", "japan", 300, 330, { x_anchor:exact, spatial_precision:"place" });
  const presentation = layout.compileTrackPresentation([track("p",[s])], continuum, CONTENT_WIDTH);
  const g = layout.geometryForSegment(presentation, s);

  assert.equal(g.rail_basis, "historical_place_anchor");
  assert.equal(g.rail_x, exact * CONTENT_WIDTH);
  assert.ok(g.label_left >= band.min_space * CONTENT_WIDTH - 1e-9);
  assert.ok(g.label_right <= band.max_space * CONTENT_WIDTH + 1e-9);
});

test("China, Korean Peninsula, and Japan presentation geometry cannot cross their historical band boundaries", () => {
  const segments = [
    segment("china", "china", 1, 20),
    segment("korea", "korean-peninsula", 1, 20),
    segment("japan", "japan", 1, 20)
  ];
  const presentation = layout.compileTrackPresentation(segments.map((s,i)=>track(String(i),[s])), continuum, CONTENT_WIDTH);
  for (const s of segments) {
    const g = layout.geometryForSegment(presentation, s);
    const band = continuum.bandForCode(s.subregion_code);
    const left = band.min_space * CONTENT_WIDTH;
    const right = band.max_space * CONTENT_WIDTH;
    assert.ok(g.rail_x >= left && g.rail_x <= right);
    assert.ok(g.label_left >= left && g.label_right <= right);
  }
});
