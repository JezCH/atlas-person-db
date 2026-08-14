"use strict";

const legacyPlanner = require("../atlas-v2-command-planner.js");

const P9_SEMANTIC_VERSION = "atlas-activity-semantic-key/v2";
const P9_MUTATION_BLOCK_CODE = "P9_LEGACY_ACTIVITY_MUTATION_RETIRED_USE_AUTHORING_MANIFEST_V2";

function blocked(operation, payload) {
  return Object.freeze({
    available: true,
    operation,
    commit: false,
    writes_performed: 0,
    target_schema: "atlas_v2",
    commands: [],
    blockers: [{ code: P9_MUTATION_BLOCK_CODE, semantic_version: P9_SEMANTIC_VERSION }],
    warnings: [],
    normalized_payload: payload ?? null
  });
}

function plan(operation, payload) {
  const op = String(operation || "").trim().toLowerCase();
  if (op === "delete") return legacyPlanner.plan(op, payload);
  if (["create", "update", "import", "reconcile"].includes(op)) return blocked(op, payload);
  return legacyPlanner.plan(op, payload);
}

module.exports = Object.freeze({
  plan,
  P9_SEMANTIC_VERSION,
  P9_MUTATION_BLOCK_CODE
});
