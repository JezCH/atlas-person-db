import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStage2P6LiteralExecutionPackage } from '../scripts/build-stage2-p6-execution-package.mjs';

const GRANULARITIES = new Set(['year', 'month', 'day']);
const CERTAINTIES = new Set(['exact', 'approximate', 'uncertain']);
const CALENDARS = new Set(['gregorian', 'julian', 'unspecified_historical', 'source_calendar']);

function assertBoundary(detail, label) {
  if (detail == null) return;
  assert.ok(GRANULARITIES.has(detail.granularity), `${label} invalid granularity ${detail.granularity}`);
  assert.ok(CERTAINTIES.has(detail.certainty), `${label} invalid certainty ${detail.certainty}`);
  assert.ok(CALENDARS.has(detail.calendar), `${label} invalid calendar ${detail.calendar}`);
  assert.notEqual(detail.year, 0, `${label} year zero forbidden`);
  if (detail.granularity === 'year') {
    assert.equal(detail.month, null, `${label} year granularity cannot carry month`);
    assert.equal(detail.day, null, `${label} year granularity cannot carry day`);
  } else if (detail.granularity === 'month') {
    assert.ok(Number.isInteger(detail.month), `${label} month granularity requires month`);
    assert.equal(detail.day, null, `${label} month granularity cannot carry day`);
  } else {
    assert.ok(Number.isInteger(detail.month), `${label} day granularity requires month`);
    assert.ok(Number.isInteger(detail.day), `${label} day granularity requires day`);
  }
}

test('all 45 materialized P6 targets emit database-valid temporal boundary axes', () => {
  const literal = buildStage2P6LiteralExecutionPackage();
  let inspected = 0;
  for (const plan of literal.plans) {
    for (const operation of plan.operations) {
      if (operation.type === 'rewrite_activity') {
        assertBoundary(operation.after.activity_start_detail, `${operation.case_id}:start`);
        assertBoundary(operation.after.activity_end_detail, `${operation.case_id}:end`);
        inspected += 1;
      } else if (operation.type === 'split_activity') {
        for (const fragment of operation.fragments) {
          assertBoundary(fragment.activity_start_detail, `${operation.case_id}:${fragment.activity_id}:start`);
          assertBoundary(fragment.activity_end_detail, `${operation.case_id}:${fragment.activity_id}:end`);
          inspected += 1;
        }
      }
    }
  }
  assert.ok(inspected >= 45, 'expected to inspect every materialized target or fragment');
});
