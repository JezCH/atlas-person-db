import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activityLinkedMeanwhileIsConsistent } from "../scripts/spacetime-visual-interaction-contract.mjs";

const ok = Object.freeze({
  selectedOutput:"선택 Activity 중간 시점 · AD 1099",
  meanwhileLabel:"동시대 탐색 · 선택 Activity 중간 시점",
  meanwhileMoment:"AD 1099"
});

test("Korean Production Meanwhile activity header and exact moment pass the visual gate", () => {
  assert.equal(activityLinkedMeanwhileIsConsistent(ok), true);
  assert.equal(activityLinkedMeanwhileIsConsistent({ ...ok, selectedOutput:"선택 Activity 중간 시점 · BC 300", meanwhileMoment:"BC 300" }), true);
  assert.equal(activityLinkedMeanwhileIsConsistent({ ...ok, selectedOutput:" 선택 Activity 중간 시점 · AD 1099 " }), true);
});

test("the gate rejects stale moment, manual selection, untranslated heading and missing data", () => {
  for (const change of [
    { meanwhileMoment:"AD 1100" },
    { meanwhileLabel:"동시대 탐색 · 직접 선택 시점" },
    { meanwhileLabel:"MEANWHILE · 선택 Activity 중간 시점" },
    { selectedOutput:"선택 Activity 중간 시점 · " },
    { selectedOutput:"직접 선택 시점 · AD 1099" },
    { meanwhileMoment:"" },
    { meanwhileMoment:undefined }
  ]) assert.equal(activityLinkedMeanwhileIsConsistent({ ...ok,...change }), false);
  assert.equal(activityLinkedMeanwhileIsConsistent(), false);
});

test("real Production Chrome verifier reads the semantic Meanwhile heading and calls shared gate", () => {
  const script = readFileSync(new URL("../scripts/verify-spacetime-production-visual.mjs", import.meta.url), "utf8");
  assert.match(script, /spacetime-meanwhile-head small/);
  assert.match(script, /spacetime-meanwhile-head strong/);
  assert.match(script, /activityLinkedMeanwhileIsConsistent\(interaction\)/);
  assert.doesNotMatch(script, /\/MEANWHILE\/\.test\(interaction\.meanwhileText\)/);
});
