import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../atlas-person-spacetime-label-engine.js');

function pack(labels, options = {}) {
  return engine.packLabels(labels, { width: 300, height: 240 }, {
    gap: 2,
    searchStep: 4,
    maxHorizontalShift: 300,
    ...options
  });
}

test('natural Person label width is not capped by the legacy 148px presentation maximum', () => {
  const text = 'Friedrich Wilhelm Nikolaus Karl von Preussen';
  const capped = engine.estimateWidth({ text }, { minLabelWidth: 30, maxLabelWidth: engine.DEFAULT_MAX_LABEL_WIDTH });
  const natural = engine.naturalWidth({ text }, { minLabelWidth: 30 });
  assert.equal(capped, engine.DEFAULT_MAX_LABEL_WIDTH);
  assert.ok(natural > engine.DEFAULT_MAX_LABEL_WIDTH, `expected natural width > ${engine.DEFAULT_MAX_LABEL_WIDTH}, got ${natural}`);

  const normalized = engine.normalizeLabel({
    person_id: 'long-name',
    text,
    width: capped,
    anchor_x: 80,
    anchor_y: 100,
    min_left: 90,
    max_right: 238
  }, { minLabelWidth: 30, maxLabelWidth: engine.DEFAULT_MAX_LABEL_WIDTH });
  assert.equal(normalized.width, natural);
});

test('a full name may borrow otherwise unused horizontal space inside its historical band', () => {
  const result = pack([{
    person_id: 'borrower',
    text: 'Maximilian Alexander Friedrich Wilhelm',
    anchor_x: 72,
    anchor_y: 80,
    min_left: 84,
    max_right: 150
  }]);

  assert.equal(result.deferred.length, 0);
  assert.equal(result.placed.length, 1);
  const label = result.placed[0];
  assert.ok(label.width > 66, 'full label must be wider than its preferred label zone');
  assert.ok(label.rect.left >= 0 && label.rect.right <= 300, 'borrowed label must remain inside the historical band viewport');
  assert.equal(label.label_y, label.anchor_y, 'historical Y must never move for label presentation');
});

test('same-time full-width labels are placed without rectangle overlap or Y movement', () => {
  const labels = [
    { person_id: 'a', text: 'Maria Theresa', anchor_x: 48, anchor_y: 120, min_left: 56, max_right: 120 },
    { person_id: 'b', text: 'Charles of Lorraine', anchor_x: 188, anchor_y: 120, min_left: 196, max_right: 268 }
  ];
  const result = pack(labels);
  assert.equal(result.deferred.length, 0);
  assert.equal(result.placed.length, 2);
  assert.equal(result.placed[0].label_y, 120);
  assert.equal(result.placed[1].label_y, 120);
  assert.equal(engine.rectanglesOverlap(result.placed[0].rect, result.placed[1].rect, 2), false);
});

test('label packing remains deterministic for identical data and camera geometry', () => {
  const labels = [
    { person_id: 'alpha', text: 'Alpha Long Historical Name', anchor_x: 90, anchor_y: 96, min_left: 100, max_right: 170 },
    { person_id: 'beta', text: 'Beta Long Historical Name', anchor_x: 160, anchor_y: 96, min_left: 170, max_right: 240 },
    { person_id: 'gamma', text: 'Gamma', anchor_x: 220, anchor_y: 150, min_left: 225, max_right: 290 }
  ];
  const first = pack(labels);
  const second = pack(labels);
  assert.deepEqual(second, first);
});

test('impossible full names defer instead of truncating or changing historical Y', () => {
  const text = 'A'.repeat(120);
  const result = engine.packLabels([{
    person_id: 'too-wide',
    text,
    anchor_x: 50,
    anchor_y: 70,
    min_left: 55,
    max_right: 95
  }], { width: 180, height: 180 }, { maxHorizontalShift: 180 });

  assert.equal(result.placed.length, 0);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].reason, 'viewport_capacity');
  assert.equal(result.deferred[0].anchor_y, 70);
  assert.ok(result.deferred[0].width > 180);
});

test('strict legacy bounds remain available explicitly for callers that must not borrow', () => {
  const result = pack([{
    person_id: 'strict',
    text: 'Long Name That Does Not Fit Preferred Zone',
    anchor_x: 80,
    anchor_y: 80,
    min_left: 90,
    max_right: 140
  }], { borrowHorizontalSpace: false });
  assert.equal(result.placed.length, 0);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].reason, 'viewport_capacity');
});
