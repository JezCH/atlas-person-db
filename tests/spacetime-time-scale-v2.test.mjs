import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const camera = require("../atlas-person-spacetime-camera-v2.js");
const time = require("../atlas-person-spacetime-time-scale-v2.js");

const SCALE = time.createSemanticTimeScale(-3000, 2026);
const VIEWPORT = Object.freeze({ width: 1200, height: 800 });

function almostEqual(actual, expected, epsilon = 1e-7) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} !== ${expected}`);
}

function cameraAtYear(year, zoomTime, zoomSpace = 1) {
  return camera.createCamera(time.TIME_WORLD_BOUNDS, {
    centerTime: SCALE.baseForYear(year),
    centerSpace: 0.5,
    zoomTime,
    zoomSpace
  });
}

test("semantic time base preserves historical order and no-year-zero continuity", () => {
  almostEqual(SCALE.baseForYear(-3000), 0);
  almostEqual(SCALE.baseForYear(2026), 1);
  assert.ok(SCALE.baseForYear(-1) < SCALE.baseForYear(1));

  const bceOneOrdinal = model.historicalYearToOrdinal(-1);
  const ceOneOrdinal = model.historicalYearToOrdinal(1);
  assert.equal(ceOneOrdinal - bceOneOrdinal, 1);
  assert.equal(SCALE.nearestHistoricalYearForOrdinal(bceOneOrdinal), -1);
  assert.equal(SCALE.nearestHistoricalYearForOrdinal(ceOneOrdinal), 1);
});

test("world zoom uses the softened global log mapping exactly", () => {
  const state = camera.fitWorld(time.TIME_WORLD_BOUNDS);
  const projection = time.createTimeProjection(SCALE, state, VIEWPORT);
  assert.equal(projection.blend, 0);

  for (const year of [-3000, -1000, 1, 1000, 1800, 2026]) {
    almostEqual(projection.yForYear(year) / VIEWPORT.height, SCALE.baseForYear(year));
  }
});

test("regional zoom becomes locally linear for equal historical intervals", () => {
  const state = cameraAtYear(1900, 16);
  const projection = time.createTimeProjection(SCALE, state, VIEWPORT);
  assert.equal(projection.blend, 1);

  const y1890 = projection.yForYear(1890);
  const y1900 = projection.yForYear(1900);
  const y1910 = projection.yForYear(1910);
  almostEqual(y1900 - y1890, y1910 - y1900, 1e-6);
});

test("semantic time projection round-trips screen position to historical ordinal", () => {
  const state = cameraAtYear(1500, 7);
  const projection = time.createTimeProjection(SCALE, state, VIEWPORT);
  const ordinal = model.historicalYearToOrdinal(1517);
  const y = projection.yForOrdinal(ordinal);
  almostEqual(projection.ordinalAtY(y), ordinal, 1e-6);
  assert.equal(projection.historicalYearAtY(y), 1517);
});

test("pointer-centered time zoom preserves the historical instant across the log-linear blend", () => {
  const state = cameraAtYear(1900, 4, 3);
  const pointerY = 257;
  const beforeProjection = time.createTimeProjection(SCALE, state, VIEWPORT);
  const anchorOrdinal = beforeProjection.ordinalAtY(pointerY);

  const zoomed = time.zoomTimeAt(state, SCALE, VIEWPORT, pointerY, 4);
  assert.equal(zoomed.zoomTime, 16);
  assert.equal(zoomed.zoomSpace, state.zoomSpace);

  const afterProjection = time.createTimeProjection(SCALE, zoomed, VIEWPORT);
  almostEqual(afterProjection.ordinalAtY(pointerY), anchorOrdinal, 1e-6);
});

test("semantic time pan shifts the historical anchor by the requested screen pixels", () => {
  const state = cameraAtYear(1200, 16);
  const before = time.createTimeProjection(SCALE, state, VIEWPORT);
  const centerY = VIEWPORT.height / 2;
  const anchorOrdinal = before.ordinalAtY(centerY);

  const moved = time.panTimeByPixels(state, SCALE, VIEWPORT, 120);
  const after = time.createTimeProjection(SCALE, moved, VIEWPORT);
  almostEqual(after.ordinalAtY(centerY + 120), anchorOrdinal, 1e-6);
});

test("combined semantic zoom keeps both space and historical time under the pointer stable", () => {
  const state = cameraAtYear(1700, 4, 4);
  const pointer = { x: 830, y: 310 };
  const beforeSpace = camera.unproject(pointer, state, time.TIME_WORLD_BOUNDS, VIEWPORT).space;
  const beforeOrdinal = time.createTimeProjection(SCALE, state, VIEWPORT).ordinalAtY(pointer.y);

  const zoomed = time.zoomCameraAt(state, SCALE, VIEWPORT, pointer, { uniform: 2 });
  const afterSpace = camera.unproject(pointer, zoomed, time.TIME_WORLD_BOUNDS, VIEWPORT).space;
  const afterOrdinal = time.createTimeProjection(SCALE, zoomed, VIEWPORT).ordinalAtY(pointer.y);

  almostEqual(afterSpace, beforeSpace, 1e-9);
  almostEqual(afterOrdinal, beforeOrdinal, 1e-6);
  assert.equal(zoomed.zoomTime, 8);
  assert.equal(zoomed.zoomSpace, 8);
});

test("fit-to-historical-range places requested endpoints at viewport boundaries", () => {
  const state = time.cameraForHistoricalRange(SCALE, 1850, 1950);
  const projection = time.createTimeProjection(SCALE, state, VIEWPORT);
  almostEqual(projection.yForYear(1850), 0, 1e-6);
  almostEqual(projection.yForYear(1950), VIEWPORT.height, 1e-6);
});

test("adaptive ticks obey pixel spacing, retain AD 1, and never create year zero", () => {
  const state = camera.fitWorld(time.TIME_WORLD_BOUNDS);
  const ticks = time.buildAdaptiveTimeTicks(SCALE, state, VIEWPORT, { minPixelGap: 42 });

  assert.ok(ticks.length > 2);
  assert.ok(ticks.some((tick) => tick.year === 1 && tick.era_boundary));
  assert.ok(ticks.every((tick) => tick.year !== 0));
  for (let index = 1; index < ticks.length; index += 1) {
    assert.ok(ticks[index].y - ticks[index - 1].y >= 42 - 1e-6);
  }
});

test("adaptive ticks become materially finer when zooming into a modern interval", () => {
  const worldTicks = time.buildAdaptiveTimeTicks(SCALE, camera.fitWorld(time.TIME_WORLD_BOUNDS), VIEWPORT, { minPixelGap: 30 });
  const localTicks = time.buildAdaptiveTimeTicks(SCALE, cameraAtYear(1900, 64), VIEWPORT, { minPixelGap: 30 });
  const worldIntervals = worldTicks.map((tick) => tick.interval_years).filter((value) => value > 0);
  const localIntervals = localTicks.map((tick) => tick.interval_years).filter((value) => value > 0);

  assert.ok(worldIntervals.length > 0);
  assert.ok(localIntervals.length > 0);
  assert.ok(Math.min(...localIntervals) < Math.min(...worldIntervals));
  assert.ok(Math.min(...localIntervals) <= 2);
});