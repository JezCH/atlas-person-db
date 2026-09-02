import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const labels = require("../atlas-person-spacetime-label-engine.js");
const snapshot = JSON.parse(readFileSync(new URL("./fixtures/spacetime-dense-label-snapshot.json", import.meta.url), "utf8"));

function assertNoOverlap(placed) {
  for (let left = 0; left < placed.length; left += 1) {
    for (let right = left + 1; right < placed.length; right += 1) {
      assert.equal(
        labels.rectanglesOverlap(placed[left].rect, placed[right].rect, labels.DEFAULT_HORIZONTAL_GAP),
        false,
        `${placed[left].person_id} overlaps ${placed[right].person_id}`
      );
    }
  }
}

test("permanent dense acceptance windows pack cleanly at sufficient zoom", () => {
  assert.equal(snapshot.schema, "atlas-spacetime-dense-label-snapshot/v1");
  assert.equal(snapshot.sufficient_zoom_percent, 800);
  assert.equal(snapshot.minimum_base_world_width_px, 900);
  assert.equal(snapshot.global_extent_compression, 0.748);
  assert.equal(snapshot.macroregion_count, 9);

  const zoom = snapshot.sufficient_zoom_percent / 100;
  const contentWidth = snapshot.minimum_base_world_width_px * zoom * snapshot.global_extent_compression;
  const regionWidth = contentWidth / snapshot.macroregion_count;
  const timelineHeight = snapshot.default_timeline_height_px * zoom * snapshot.global_extent_compression;
  const maxLabelWidth = Math.max(
    labels.DEFAULT_MIN_LABEL_WIDTH,
    Math.min(labels.DEFAULT_MAX_LABEL_WIDTH, regionWidth - labels.DEFAULT_LABEL_CHROME_WIDTH)
  );

  for (const window of snapshot.windows) {
    const input = window.labels.map((item) => ({
      person_id: item.person_id,
      text: item.text,
      anchor_x: item.x_fraction * regionWidth,
      anchor_y: item.y_fraction * timelineHeight
    }));
    const packed = labels.packLabels(
      input,
      { width: regionWidth, height: timelineHeight },
      { maxLabelWidth, maxHorizontalShift: regionWidth }
    );

    assert.equal(packed.placed.length, window.label_count, `${window.id} placed count`);
    assert.equal(packed.deferred.length, 0, `${window.id} deferred labels`);
    for (const placement of packed.placed) {
      assert.equal(placement.label_y, placement.anchor_y, `${window.id} historical Y changed`);
    }
    assertNoOverlap(packed.placed);
  }
});
