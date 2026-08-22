import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const camera = require("../atlas-person-spacetime-camera-v2.js");
const controllerApi = require("../atlas-person-spacetime-camera-controller-v2.js");

const WORLD = Object.freeze({ minTime: -3000, maxTime: 2025, minSpace: 0, maxSpace: 1 });

class FakeElement {
  constructor(width = 1000, height = 700) {
    this.width = width;
    this.height = height;
    this.listeners = new Map();
    this.captured = null;
  }
  getBoundingClientRect() {
    return { left: 10, top: 20, width: this.width, height: this.height };
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }
  setPointerCapture(pointerId) {
    this.captured = pointerId;
  }
  emit(type, event = {}) {
    for (const handler of this.listeners.get(type) || []) handler(event);
  }
}

function almostEqual(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} !== ${expected}`);
}

test("controller keeps ordinary wheel available to the page by default", () => {
  const element = new FakeElement();
  const changes = [];
  const controller = controllerApi.createCameraController({
    element,
    worldBounds: WORLD,
    initialCamera: { zoomTime: 4, zoomSpace: 4 },
    onChange: (_state, reason) => changes.push(reason)
  });
  const before = controller.getCamera();
  element.emit("wheel", { deltaY: 120, clientX: 500, clientY: 350, preventDefault() { throw new Error("must not capture"); } });
  assert.deepEqual(controller.getCamera(), before);
  assert.deepEqual(changes, []);
  controller.destroy();
});

test("ctrl-wheel performs pointer-centered uniform zoom", () => {
  const element = new FakeElement();
  let prevented = false;
  const controller = controllerApi.createCameraController({
    element,
    worldBounds: WORLD,
    initialCamera: { centerTime: 900, centerSpace: 0.55, zoomTime: 4, zoomSpace: 4 }
  });
  const viewport = { width: element.width, height: element.height };
  const screenPoint = { x: 640 - 10, y: 280 - 20 };
  const before = camera.unproject(screenPoint, controller.getCamera(), WORLD, viewport);

  element.emit("wheel", {
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    deltaY: -120,
    clientX: 640,
    clientY: 280,
    preventDefault() { prevented = true; }
  });

  const afterState = controller.getCamera();
  const after = camera.unproject(screenPoint, afterState, WORLD, viewport);
  assert.equal(prevented, true);
  assert.ok(afterState.zoomTime > 4);
  assert.ok(afterState.zoomSpace > 4);
  almostEqual(after.time, before.time);
  almostEqual(after.space, before.space);
  controller.destroy();
});

test("drag pan follows pointer movement without changing zoom", () => {
  const element = new FakeElement();
  const controller = controllerApi.createCameraController({
    element,
    worldBounds: WORLD,
    initialCamera: { centerTime: 500, centerSpace: 0.5, zoomTime: 8, zoomSpace: 8 }
  });
  const before = controller.getCamera();
  element.emit("pointerdown", { button: 0, pointerId: 7, clientX: 400, clientY: 300 });
  element.emit("pointermove", { pointerId: 7, clientX: 460, clientY: 340 });
  element.emit("pointerup", { pointerId: 7 });
  const after = controller.getCamera();

  assert.equal(element.captured, 7);
  assert.equal(after.zoomTime, before.zoomTime);
  assert.equal(after.zoomSpace, before.zoomSpace);
  assert.ok(after.centerTime < before.centerTime);
  assert.ok(after.centerSpace < before.centerSpace);
  controller.destroy();
});

test("optional captured wheel pans through historical time and shift-wheel pans space", () => {
  const element = new FakeElement();
  const reasons = [];
  const controller = controllerApi.createCameraController({
    element,
    worldBounds: WORLD,
    initialCamera: { centerTime: 0, centerSpace: 0.5, zoomTime: 10, zoomSpace: 10 },
    captureVerticalWheel: true,
    onChange: (_state, reason) => reasons.push(reason)
  });
  const before = controller.getCamera();
  element.emit("wheel", { deltaY: 100, clientX: 500, clientY: 350, preventDefault() {} });
  const afterTime = controller.getCamera();
  assert.ok(afterTime.centerTime > before.centerTime);

  element.emit("wheel", { deltaY: 100, shiftKey: true, clientX: 500, clientY: 350, preventDefault() {} });
  const afterSpace = controller.getCamera();
  assert.ok(afterSpace.centerSpace > afterTime.centerSpace);
  assert.deepEqual(reasons, ["pan-time", "pan-space"]);
  controller.destroy();
});

test("fitWorld resets both camera axes and destroy detaches interaction", () => {
  const element = new FakeElement();
  const controller = controllerApi.createCameraController({
    element,
    worldBounds: WORLD,
    initialCamera: { centerTime: 1000, centerSpace: 0.7, zoomTime: 20, zoomSpace: 12 }
  });
  assert.deepEqual(controller.fitWorld(), camera.fitWorld(WORLD));
  controller.destroy();
  const frozen = controller.getCamera();
  element.emit("wheel", { ctrlKey: true, deltaY: -100, clientX: 500, clientY: 350, preventDefault() {} });
  assert.deepEqual(controller.getCamera(), frozen);
});
