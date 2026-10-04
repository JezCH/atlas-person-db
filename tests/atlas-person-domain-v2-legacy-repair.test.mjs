import test from "node:test";
import assert from "node:assert/strict";
import repair from "../server/atlas-person-domain-v2-legacy-repair-service.js";

const { TARGETS, classifyRows } = repair;

function rows(domainFor) {
  return TARGETS.map((target, index) => ({
    person_id:target.person_id,
    representative_domain:domainFor(target, index)
  }));
}

test("legacy repair contract is exactly six reviewed v2 targets", () => {
  assert.equal(TARGETS.length, 6);
  assert.deepEqual(
    TARGETS.map((target) => target.representative_domain).sort(),
    ["governance","governance","governance","governance","military","military"]
  );
});

test("all-null state is six bounded writes with no conflict", () => {
  const state = classifyRows(rows(() => null));
  assert.equal(state.target_count, 6);
  assert.equal(state.needs_write_count, 6);
  assert.equal(state.already_correct_count, 0);
  assert.equal(state.conflict_count, 0);
  assert.equal(state.all_correct, false);
});

test("already-correct state is replay-safe", () => {
  const state = classifyRows(rows((target) => target.representative_domain));
  assert.equal(state.needs_write_count, 0);
  assert.equal(state.already_correct_count, 6);
  assert.equal(state.conflict_count, 0);
  assert.equal(state.all_correct, true);
});

test("unexpected non-null domain fails classification as conflict", () => {
  const state = classifyRows(rows((target, index) => index === 0 ? "culture" : target.representative_domain));
  assert.equal(state.conflict_count, 1);
  assert.equal(state.all_correct, false);
});

test("missing UUID fails closed", () => {
  assert.throws(() => classifyRows(rows((target) => target.representative_domain).slice(1)), /TARGET_NOT_FOUND/);
});
