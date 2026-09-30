import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const timeline = require("../server/atlas-person-timeline-service.js");
const profile = require("../server/atlas-person-profile-service.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(fs.readFileSync(
  path.join(root, "data/migrations/core-v2-unit5-non-timeline-canonicalization.v1.json"),
  "utf8"
));

test("timeline disposition comparison ignores JSON object key order while preserving nested values", () => {
  const left = {
    person_id: "00000000-0000-4000-8000-000000000001",
    disposition: "chronology_unresolved",
    reason: "reviewed chronology gap",
    basis_code: "reviewed_basis",
    traditional_year: null,
    traditional_year_alternative: null,
    review_evidence: {
      authority_scope: "timeline_disposition_review_evidence_only",
      sources: ["source-a", "source-b"],
      nested: { alpha: 1, beta: 2 }
    }
  };
  const right = {
    ...left,
    review_evidence: {
      nested: { beta: 2, alpha: 1 },
      sources: ["source-a", "source-b"],
      authority_scope: "timeline_disposition_review_evidence_only"
    }
  };
  assert.equal(timeline.sameTimelineDisposition(left, right), true);
  assert.equal(timeline.sameTimelineDisposition(left, {
    ...right,
    review_evidence: { ...right.review_evidence, nested: { beta: 3, alpha: 1 } }
  }), false);
});

test("timeline disposition vocabulary separates Person identity from timeline eligibility", () => {
  assert.deepEqual(timeline.DISPOSITIONS, [
    "timeline",
    "chronology_unresolved",
    "legendary",
    "mythical",
    "other_reviewed_exclusion"
  ]);
  assert.deepEqual(timeline.normalizeTimelineDisposition({ disposition: "timeline" }), {
    disposition: "timeline",
    reason: null,
    basis_code: null,
    traditional_year: null,
    traditional_year_alternative: null,
    review_evidence: {}
  });
  assert.throws(
    () => timeline.normalizeTimelineDisposition({ disposition: "timeline", reason: "invented" }),
    /PERSON_TIMELINE_INCLUDED_PAYLOAD_MUST_BE_EMPTY/
  );
  assert.throws(
    () => timeline.normalizeTimelineDisposition({ disposition: "legendary" }),
    /PERSON_TIMELINE_EXCLUSION_REASON_REQUIRED/
  );
  assert.equal(profile.PROFILE_OPERATIONS.has("set_person_timeline_disposition"), true);
});

test("Unit 5 reviewed migration remains immutable historical evidence without fake Activities", () => {
  assert.equal(manifest.items.length, 124);
  assert.equal(manifest.expected_existing_canonical_count, 3);
  assert.equal(manifest.expected_missing_canonical_count, 121);
  const counts = {};
  for (const item of manifest.items) {
    counts[item.timeline_disposition.disposition] = (counts[item.timeline_disposition.disposition] || 0) + 1;
    const legacy = item.timeline_disposition.review_evidence.legacy_record;
    assert.equal(legacy.timeline_status, "excluded");
    assert.equal(legacy.activity_start, null);
    assert.equal(legacy.activity_end, null);
  }
  assert.deepEqual(counts, { legendary: 70, mythical: 14, chronology_unresolved: 40 });
});

test("Unit 5 one-shot reconciliation executors stay retired", () => {
  for (const file of [
    ".github/workflows/atlas-core-unit5-reconcile.yml",
    ".github/workflows/atlas-core-unit5-verify.yml",
    "api/atlas-core-unit5-reconcile.js",
    "server/atlas-core-unit5-reconciliation-handler.js",
    "server/atlas-core-unit5-reconciliation-service.js"
  ]) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
  }
});
