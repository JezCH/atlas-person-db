"use strict";

const {
  RECONCILIATION_SEMANTIC_VERSION
} = require("./atlas-relationship-reconciliation.js");

const REQUIRED_RECONCILIATION_SEMANTIC_VERSION = "v2-relation-full-temporal";
const PERSON_MERGE_LIFECYCLE_VERSION = "p10-v2-revalidated";
const REQUIRED_PERSON_MERGE_LIFECYCLE_VERSION = "p10-v2-revalidated";
const PERSON_MERGE_BLOCK_CODE = "PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION";

function personMergeExecutionState() {
  const reconciliationReady = RECONCILIATION_SEMANTIC_VERSION === REQUIRED_RECONCILIATION_SEMANTIC_VERSION;
  const lifecycleReady = PERSON_MERGE_LIFECYCLE_VERSION === REQUIRED_PERSON_MERGE_LIFECYCLE_VERSION;
  return Object.freeze({
    allowed: reconciliationReady && lifecycleReady,
    reconciliation_semantic_version: RECONCILIATION_SEMANTIC_VERSION,
    required_reconciliation_semantic_version: REQUIRED_RECONCILIATION_SEMANTIC_VERSION,
    person_merge_lifecycle_version: PERSON_MERGE_LIFECYCLE_VERSION,
    required_person_merge_lifecycle_version: REQUIRED_PERSON_MERGE_LIFECYCLE_VERSION
  });
}

function assertPersonMergeExecutionAllowed() {
  const state = personMergeExecutionState();
  if (state.allowed) return state;
  const error = new Error(PERSON_MERGE_BLOCK_CODE);
  error.code = PERSON_MERGE_BLOCK_CODE;
  error.state = state;
  throw error;
}

module.exports = Object.freeze({
  REQUIRED_RECONCILIATION_SEMANTIC_VERSION,
  PERSON_MERGE_LIFECYCLE_VERSION,
  REQUIRED_PERSON_MERGE_LIFECYCLE_VERSION,
  PERSON_MERGE_BLOCK_CODE,
  personMergeExecutionState,
  assertPersonMergeExecutionAllowed
});
