import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const camera = require("../atlas-person-spacetime-camera-v2.js");
const space = require("../atlas-person-spacetime-space-axis-v2.js");

const CONTINUUM = space.createSpatialContinuum();
const VIEWPORT = Object.freeze({ width: 1350, height: 800 });

function almostEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} !== ${expected}`);
}

test("default spatial hierarchy has nine stable macroregions and thirty-three subregions", () => {
  const validation = space.validateHierarchy(space.DEFAULT_SPATIAL_HIERARCHY);
  assert.equal(validation.valid, true);
  assert.equal(CONTINUUM.macroregions.length, 9);
  assert.equal(CONTINUUM.subregions.length, 33);
  assert.deepEqual(CONTINUUM.macroregions.map((item) => item.code), [
    "americas",
    "europe",
    "africa",
    "west-asia",
    "south-asia",
    "central-asia",
    "southeast-asia",
    "oceania",
    "east-asia"
  ]);
});

test("macroregions and their subregions cover the normalized space continuum without gaps", () => {
  almostEqual(CONTINUUM.macroregions[0].min_space, 0);
  almostEqual(CONTINUUM.macroregions.at(-1).max_space, 1);

  for (let index = 1; index < CONTINUUM.macroregions.length; index += 1) {
    almostEqual(CONTINUUM.macroregions[index - 1].max_space, CONTINUUM.macroregions[index].min_space);
  }

  for (const macro of CONTINUUM.macroregions) {
    const children = CONTINUUM.subregions.filter((item) => item.parent_code === macro.code);
    assert.ok(children.length > 0);
    almostEqual(children[0].min_space, macro.min_space);
    almostEqual(children.at(-1).max_space, macro.max_space);
    for (let index = 1; index < children.length; index += 1) {
      almostEqual(children[index - 1].max_space, children[index].min_space);
    }
  }
});

test("Europe and East Asia expose the reviewed two-level display taxonomy", () => {
  const europe = CONTINUUM.subregions.filter((item) => item.parent_code === "europe");
  assert.deepEqual(europe.map((item) => item.label), [
    "영국·아일랜드",
    "서유럽",
    "이베리아",
    "중부유럽",
    "이탈리아",
    "북유럽",
    "발칸",
    "동유럽·러시아"
  ]);

  const eastAsia = CONTINUUM.subregions.filter((item) => item.parent_code === "east-asia");
  assert.deepEqual(eastAsia.map((item) => item.label), ["중국권", "한반도", "일본", "만주·몽골권"]);
});

test("semantic spatial labels cross-fade from macroregion to subregion instead of switching abruptly", () => {
  const world = space.semanticSpatialLabelState(1);
  const middle = space.semanticSpatialLabelState(2);
  const regional = space.semanticSpatialLabelState(3);

  assert.equal(world.macroregion_label_opacity, 1);
  assert.equal(world.subregion_label_opacity, 0);
  assert.ok(middle.macroregion_label_opacity > 0 && middle.macroregion_label_opacity < 1);
  assert.ok(middle.subregion_label_opacity > 0 && middle.subregion_label_opacity < 1);
  almostEqual(middle.macroregion_label_opacity + middle.subregion_label_opacity, 1);
  assert.equal(regional.macroregion_label_opacity, 0);
  assert.equal(regional.subregion_label_opacity, 1);
});

test("placement uses reviewed subregion precision when available and macroregion fallback otherwise", () => {
  const precise = space.positionForPlacement(CONTINUUM, { macroregion_code: "east-asia", subregion_code: "korean-peninsula" });
  const broad = space.positionForPlacement(CONTINUUM, { macroregion_code: "east-asia" });

  assert.equal(precise.precision, "subregion");
  assert.equal(precise.macroregion_code, "east-asia");
  assert.equal(precise.subregion_code, "korean-peninsula");
  assert.equal(precise.space, CONTINUUM.bandForCode("korean-peninsula").center_space);

  assert.equal(broad.precision, "macroregion");
  assert.equal(broad.subregion_code, null);
  assert.equal(broad.space, CONTINUUM.bandForCode("east-asia").center_space);
  assert.equal(space.positionForPlacement(CONTINUUM, { macroregion_code: "unknown" }), null);
});

test("subregion cannot be silently assigned to a different macroregion", () => {
  assert.throws(
    () => space.positionForPlacement(CONTINUUM, { macroregion_code: "europe", subregion_code: "korean-peninsula" }),
    /SUBREGION_MACROREGION_MISMATCH/
  );
});

test("world camera exposes all macroregion bands and keeps their screen positions stable", () => {
  const fit = camera.fitWorld(space.SPACE_WORLD_BOUNDS);
  const visible = space.visibleSpatialBands(CONTINUUM, fit, VIEWPORT);
  assert.equal(visible.macroregions.length, 9);
  almostEqual(visible.macroregions[0].screen_left, 0);
  almostEqual(visible.macroregions.at(-1).screen_right, VIEWPORT.width);

  const europe = visible.macroregions.find((item) => item.code === "europe");
  const secondRead = space.visibleSpatialBands(CONTINUUM, fit, VIEWPORT).macroregions.find((item) => item.code === "europe");
  almostEqual(europe.screen_left, secondRead.screen_left);
  almostEqual(europe.screen_right, secondRead.screen_right);
});

test("fitSpatialBand focuses a macroregion without changing the time camera", () => {
  const initial = camera.createCamera(space.SPACE_WORLD_BOUNDS, {
    centerTime: 0.72,
    zoomTime: 12,
    centerSpace: 0.5,
    zoomSpace: 1
  });
  const focused = space.fitSpatialBand(initial, CONTINUUM, "europe", { padding: 1 });
  const europe = CONTINUUM.bandForCode("europe");
  const visible = camera.visibleWorld(focused, space.SPACE_WORLD_BOUNDS);

  assert.equal(focused.centerTime, initial.centerTime);
  assert.equal(focused.zoomTime, initial.zoomTime);
  almostEqual(focused.centerSpace, europe.center_space);
  almostEqual(visible.minSpace, europe.min_space);
  almostEqual(visible.maxSpace, europe.max_space);

  const bands = space.visibleSpatialBands(CONTINUUM, focused, VIEWPORT);
  assert.deepEqual(bands.macroregions.map((item) => item.code), ["europe"]);
  assert.deepEqual(bands.subregions.map((item) => item.parent_code).filter((value, index, values) => values.indexOf(value) === index), ["europe"]);
  assert.equal(bands.subregions.length, 8);
});