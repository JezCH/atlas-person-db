"use strict";

const path = require("node:path");

const CORE_CANONICAL_TABLES = Object.freeze(new Set([
  "persons",
  "person_names",
  "person_descriptions",
  "person_politics_v2",
  "person_politics_sources",
  "person_politics_context_polities",
  "person_relationships",
  "person_portraits",
  "polities",
  "polity_names",
  "polity_descriptions",
  "sources",
  "places",
  "place_names",
  "place_sources"
]));

const CANONICAL_DML_PATTERN = /\b(UPDATE|INSERT\s+INTO|DELETE\s+FROM|MERGE\s+INTO|TRUNCATE(?:\s+TABLE)?)\s+(?:ONLY\s+)?atlas_v2\.("?([a-zA-Z0-9_]+)"?)/gi;

function stripSqlComments(sql) {
  return String(sql || "")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
}

function canonicalReplayDmlViolations(sql) {
  const text = stripSqlComments(sql);
  const violations = [];
  for (const match of text.matchAll(CANONICAL_DML_PATTERN)) {
    const table = String(match[2] || "").toLowerCase();
    if (!CORE_CANONICAL_TABLES.has(table)) continue;
    violations.push(Object.freeze({
      operation: String(match[1] || "").replace(/\s+/g, " ").toUpperCase(),
      table
    }));
  }
  return Object.freeze(violations);
}

function assertReplaySafeCanonicalMigration({ migrationPath, sql, surface }) {
  const violations = canonicalReplayDmlViolations(sql);
  if (violations.length === 0) return;

  const label = migrationPath ? path.basename(migrationPath) : "(unknown migration)";
  const scope = surface || "replay";
  const details = violations.map((entry) => `${entry.operation} atlas_v2.${entry.table}`).join(", ");
  const error = new Error(`REPLAY_MIGRATION_CANONICAL_DML_FORBIDDEN: ${scope}: ${label}: ${details}`);
  error.code = "REPLAY_MIGRATION_CANONICAL_DML_FORBIDDEN";
  error.surface = scope;
  error.migration = label;
  error.violations = violations;
  throw error;
}

module.exports = Object.freeze({
  CORE_CANONICAL_TABLES,
  canonicalReplayDmlViolations,
  assertReplaySafeCanonicalMigration
});
