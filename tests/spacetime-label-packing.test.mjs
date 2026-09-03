import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const labels = require("../atlas-person-spacetime-label-engine.js");

function assertNoRectangleOverlap(placements, gap = 0) {
  for (let left = 0; left < placements.length; left += 1) {
    for (let right = left + 1; right < placements.length; right += 1) {
      assert.equal(
        labels.rectanglesOverlap(placements[left].rect, placements[right].rect, gap),
        false,
        `${placements[left].person_id} overlaps ${placements[right].person_id}`
      );
    }
  }
}

test("colliding labels keep their historical Y and resolve only through horizontal placement", () => {
  const input = [
    { person_id: "person-a", text: "Alpha", anchor_x: 110, anchor_y: 200, width: 74 },
    { person_id: "person-b", text: "Beta", anchor_x: 114, anchor_y: 200, width: 74 }
  ];
  const result = labels.packLabels(input, { width: 260, height: 600 });

  assert.equal(result.placed.length, input.length);
  assertNoRectangleOverlap(result.placed, labels.DEFAULT_HORIZONTAL_GAP);
  for (const placement of result.placed) {
    assert.equal(placement.label_y, 200);
    assert.equal(placement.anchor_y, 200);
    assert.ok(placement.rect.left >= 0);
    assert.ok(placement.rect.right <= 260);
  }
});

test("capacity overflow defers labels instead of inventing a different Y position", () => {
  const input = [
    { person_id: "person-a", text: "Alpha", anchor_x: 35, anchor_y: 100, width: 60 },
    { person_id: "person-b", text: "Beta", anchor_x: 35, anchor_y: 100, width: 60 }
  ];
  const result = labels.packLabels(input, { width: 70, height: 220 });

  assert.equal(result.placed.length, 1);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.placed[0].label_y, 100);
  assert.equal(result.deferred[0].anchor_y, 100);
  assert.equal(result.deferred[0].reason, "collision_capacity");
});

test("label placement is deterministic and sparse labels remain exactly on their anchors", () => {
  const input = [
    { person_id: "a", text: "A", anchor_x: 20, anchor_y: 40 },
    { person_id: "b", text: "B", anchor_x: 20, anchor_y: 140 },
    { person_id: "c", text: "C", anchor_x: 20, anchor_y: 240 }
  ];
  const first = labels.packLabels(input, { width: 180, height: 400 });
  const second = labels.packLabels(input, { width: 180, height: 400 });

  assert.deepEqual(first, second);
  assert.deepEqual(first.placed.map((item) => item.label_y), [40, 140, 240]);
  assert.deepEqual(first.placed.map((item) => item.anchor_y), [40, 140, 240]);
});

test("Person label width ceiling is expanded beyond the old 148px truncation cap", () => {
  assert.equal(labels.DEFAULT_LABEL_CHROME_WIDTH, 4);
  assert.equal(labels.DEFAULT_MIN_LABEL_WIDTH, 30);
  assert.equal(labels.DEFAULT_MAX_LABEL_WIDTH, 384);
  assert.equal(labels.DEFAULT_MIN_LABEL_WIDTH - labels.DEFAULT_LABEL_CHROME_WIDTH, 26);
  assert.equal(labels.DEFAULT_MAX_LABEL_WIDTH - labels.DEFAULT_LABEL_CHROME_WIDTH, 380);
  assert.equal(labels.estimateWidth({ text: "12345678901234567890" }), 156);
});


test("CJK names use wide glyph metrics instead of the Latin-width floor", () => {
  assert.equal(labels.DEFAULT_CJK_CHAR_WIDTH, 11.2);
  assert.ok(labels.estimateWidth({ text:"서하 경종" }) > 44);
  assert.ok(labels.estimateWidth({ text:"미나모토노 요시츠네" }) > labels.estimateWidth({ text:"Minamoto" }));
});

test("per-label horizontal zones prevent packing into otherwise unused forbidden space", () => {
  const input = [
    { person_id:"a", text:"서하 경종", anchor_x:12, anchor_y:80, min_left:24, max_right:100 },
    { person_id:"b", text:"금 태조", anchor_x:12, anchor_y:120, min_left:24, max_right:100 }
  ];
  const result = labels.packLabels(input, { width:120, height:200 });
  assert.equal(result.deferred.length, 0);
  for (const placement of result.placed) {
    assert.ok(placement.rect.left >= 24 - 1e-9);
    assert.ok(placement.rect.right <= 100 + 1e-9);
  }
});

test("a label wider than its own allowed zone defers instead of spilling across a region boundary", () => {
  const result = labels.packLabels([
    { person_id:"a", text:"긴 이름", anchor_x:20, anchor_y:60, width:70, min_left:30, max_right:80 }
  ], { width:140, height:120 });
  assert.equal(result.placed.length, 0);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].reason, "viewport_capacity");
});


test("minimum 500 percent world width can show the densest current Production-era name cluster without deferral", () => {
  const names = [
    "루츠 그라프 슈베린 폰 크로지크",
    "칼 구스타프 에밀 만네르헤임",
    "줄리어스 로버트 오펜하이머",
    "마누엘 프라도 우가르테체",
    "윌리엄 라이언 매켄지 킹",
    "프랭클린 D. 루스벨트",
    "페드로 아기레 세르다",
    "수바스 찬드라 보스",
    "제툴리우 바르가스",
    "쁠랙 피분송크람",
    "비드쿤 크비슬링",
    "이스메트 이뇌뉘",
    "루이 마운트배튼",
    "엘리너 루스벨트",
    "클레멘트 애틀리",
    "해리 S. 트루먼",
    "러키 루치아노",
    "아돌프 히틀러",
    "마하트마 간디",
    "하워드 플로리",
    "에르빈 롬멜",
    "윈스턴 처칠",
    "도조 히데키",
    "벤 치플리",
    "에바 페론",
    "존 커틴"
  ];
  const width = 900 * 5 * 0.748;
  const input = names.map((text, index) => ({
    person_id: "dense-" + index,
    text,
    anchor_x: width / 2,
    anchor_y: 100,
    min_left: 0,
    max_right: width
  }));
  const result = labels.packLabels(input, { width, height: 240 }, {
    maxLabelWidth: labels.DEFAULT_MAX_LABEL_WIDTH,
    maxHorizontalShift: width,
    searchStep: 1,
    anchorGap: 1,
    gap: labels.DEFAULT_HORIZONTAL_GAP
  });

  assert.equal(result.placed.length, names.length);
  assert.equal(result.deferred.length, 0);
  assertNoRectangleOverlap(result.placed, labels.DEFAULT_HORIZONTAL_GAP);
  assert.ok(labels.estimateWidth({ text: "자베르 알-아흐마드 알-자베르 알-사바" }) > 148);
  for (const placement of result.placed) assert.equal(placement.label_y, placement.anchor_y);
});
