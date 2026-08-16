import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  SIGNALS,
  VERDICTS,
  pairSignal,
  pairVerdict,
  auditSamePersonActivities
} = require("../server/atlas-activity-duplicate-audit.js");

const base = {
  person_id: "11111111-1111-4111-8111-111111111111",
  polity_id: "22222222-2222-4222-8222-222222222222",
  relation_type_id: null,
  role_id: "33333333-3333-4333-8333-333333333333",
  period_basis_id: "44444444-4444-4444-8444-444444444444",
  activity_start: 1402,
  activity_end: 1424
};

function row(id, patch = {}) {
  return { id, ...base, ...patch };
}

test("flags an exact same-person legacy Activity duplicate", () => {
  const verdict = pairVerdict(
    row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
  );
  assert.equal(verdict.signal, SIGNALS.EXACT_ACTIVITY_DUPLICATE);
  assert.equal(verdict.verdict, VERDICTS.EXACT_DUPLICATE);
  assert.equal(verdict.confirmed_duplicate, true);
});

test("treats legacy null relation versus normalized relation in the same historical slot as a migration duplicate", () => {
  const verdict = pairVerdict(
    row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
      relation_type_id: "55555555-5555-4555-8555-555555555555"
    })
  );
  assert.equal(verdict.signal, SIGNALS.RELATION_VARIANT_SAME_SLOT);
  assert.equal(verdict.verdict, VERDICTS.MIGRATION_DUPLICATE_RELATION_GAP);
  assert.equal(verdict.confirmed_duplicate, true);
});

test("keeps two non-null relation variants as review instead of auto-deleting", () => {
  const verdict = pairVerdict(
    row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      relation_type_id: "55555555-5555-4555-8555-555555555555"
    }),
    row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
      relation_type_id: "77777777-7777-4777-8777-777777777777"
    })
  );
  assert.equal(verdict.verdict, VERDICTS.RELATION_VARIANT_REVIEW);
  assert.equal(verdict.confirmed_duplicate, false);
});

test("flags role variants for alias review", () => {
  const verdict = pairVerdict(
    row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
      role_id: "66666666-6666-4666-8666-666666666666"
    })
  );
  assert.equal(verdict.signal, SIGNALS.ROLE_VARIANT_SAME_SLOT);
  assert.equal(verdict.verdict, VERDICTS.ROLE_ALIAS_REVIEW);
  assert.equal(verdict.confirmed_duplicate, false);
});

test("flags strict containment as a stale-wide-interval review candidate", () => {
  const verdict = pairVerdict(
    row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { activity_start: 1930, activity_end: 1974 }),
    row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", { activity_start: 1930, activity_end: 1936 })
  );
  assert.equal(verdict.signal, SIGNALS.CONTAINMENT_SAME_CONTEXT);
  assert.equal(verdict.verdict, VERDICTS.STALE_WIDE_INTERVAL_REVIEW);
  assert.equal(verdict.confirmed_duplicate, false);
});

test("does not flag adjacent segments with different relations", () => {
  assert.equal(
    pairSignal(
      row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
        activity_start: 192,
        activity_end: 192,
        relation_type_id: "55555555-5555-4555-8555-555555555555"
      }),
      row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", {
        activity_start: 193,
        activity_end: 193,
        relation_type_id: "77777777-7777-4777-8777-777777777777"
      })
    ),
    null
  );
});

test("audit groups by person and emits deterministic verdict pairs", () => {
  const signals = auditSamePersonActivities([
    row("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    row("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
  ]);
  assert.equal(signals.length, 1);
  assert.equal(signals[0].activity_low_id, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  assert.equal(signals[0].verdict, VERDICTS.EXACT_DUPLICATE);
  assert.equal(signals[0].confirmed_duplicate, true);
});