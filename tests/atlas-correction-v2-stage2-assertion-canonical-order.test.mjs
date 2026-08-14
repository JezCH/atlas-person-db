import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { normalizeStage2AssertionOperation } = require("../server/atlas-correction-v2-stage2-assertions.js");

const U = Object.freeze({
  polityA: "11111111-1111-4111-8111-111111111111",
  polityB: "22222222-2222-4222-8222-222222222222",
  context: "33333333-3333-4333-8333-333333333333",
  governance: "44444444-4444-4444-8444-444444444444",
  designation: "55555555-5555-4555-8555-555555555555",
  nameA: "66666666-6666-4666-8666-666666666666",
  nameB: "77777777-7777-4777-8777-777777777777",
  identityType: "88888888-8888-4888-8888-888888888888",
  identityRelation: "99999999-9999-4999-8999-999999999999",
  sourceA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  sourceB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
});

const interval = Object.freeze({
  valid_from_year: 100,
  valid_from_month: null,
  valid_from_day: null,
  valid_from_granularity: "year",
  valid_from_certainty: "exact",
  valid_from_calendar: "unspecified_historical",
  valid_to_year: 110,
  valid_to_month: null,
  valid_to_day: null,
  valid_to_granularity: "year",
  valid_to_certainty: "exact",
  valid_to_calendar: "unspecified_historical"
});

function unsortedLinks(parentField, parentId) {
  return [
    { [parentField]: parentId, source_id: U.sourceB, source_locator_key: "z-locator" },
    { [parentField]: parentId, source_id: U.sourceA, source_locator_key: "b-locator" },
    { [parentField]: parentId, source_id: U.sourceA, source_locator_key: "a-locator" }
  ];
}

function assertCanonicalLinks(links) {
  assert.deepEqual(
    links.map((link) => `${link.source_id}|${link.source_locator_key}`),
    [
      `${U.sourceA}|a-locator`,
      `${U.sourceA}|b-locator`,
      `${U.sourceB}|z-locator`
    ]
  );
}

test("governance assertion source links normalize to DB canonical order", () => {
  const operation = normalizeStage2AssertionOperation({
    type: "assert_governance_period",
    decision_id: "canonical-governance",
    exact_before: { period_absent_id: U.governance },
    exact_after: {
      period: {
        id: U.governance,
        polity_id: U.polityA,
        governance_context_id: U.context,
        ...interval,
        confidence: "reviewed",
        notes: "unit"
      },
      source_links: unsortedLinks("polity_governance_period_id", U.governance)
    }
  }, 1);
  assertCanonicalLinks(operation.exact_after.source_links);
});

test("designation names and sources normalize to their DB canonical order", () => {
  const operation = normalizeStage2AssertionOperation({
    type: "assert_polity_designation",
    decision_id: "canonical-designation",
    exact_before: { designation_absent_id: U.designation },
    exact_after: {
      designation: {
        id: U.designation,
        polity_id: U.polityA,
        designation_type: "official_name",
        ...interval,
        confidence: "reviewed",
        notes: "unit"
      },
      names: [
        { id: U.nameB, polity_designation_id: U.designation, locale: "ko", name: "단위", is_preferred: true },
        { id: U.nameA, polity_designation_id: U.designation, locale: "en", name: "Unit", is_preferred: true }
      ],
      source_links: unsortedLinks("polity_designation_id", U.designation)
    }
  }, 1);
  assert.deepEqual(operation.exact_after.names.map((name) => name.locale), ["en", "ko"]);
  assertCanonicalLinks(operation.exact_after.source_links);
});

test("identity relation assertion source links normalize to DB canonical order", () => {
  const operation = normalizeStage2AssertionOperation({
    type: "assert_polity_identity_relation",
    decision_id: "canonical-identity",
    exact_before: { relation_absent_id: U.identityRelation },
    exact_after: {
      relation: {
        id: U.identityRelation,
        predecessor_polity_id: U.polityA,
        successor_polity_id: U.polityB,
        relation_type_id: U.identityType,
        transition_year: 111,
        transition_month: null,
        transition_day: null,
        transition_granularity: "year",
        transition_certainty: "exact",
        transition_calendar: "unspecified_historical",
        confidence: "reviewed",
        notes: "unit"
      },
      source_links: unsortedLinks("polity_identity_relation_id", U.identityRelation)
    }
  }, 1);
  assertCanonicalLinks(operation.exact_after.source_links);
});

test("exact duplicate Stage 2 assertion source semantics fail closed", () => {
  const duplicate = { polity_governance_period_id: U.governance, source_id: U.sourceA, source_locator_key: "same" };
  assert.throws(() => normalizeStage2AssertionOperation({
    type: "assert_governance_period",
    decision_id: "duplicate-governance-source",
    exact_before: { period_absent_id: U.governance },
    exact_after: {
      period: {
        id: U.governance,
        polity_id: U.polityA,
        governance_context_id: U.context,
        ...interval,
        confidence: "reviewed",
        notes: "unit"
      },
      source_links: [duplicate, { ...duplicate }]
    }
  }, 1), /SOURCE_LINK_REUSED/);
});
