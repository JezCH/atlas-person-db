(() => {
  "use strict";

  function normalizeExact(value) {
    return String(value ?? "").trim();
  }

  function activityKey(row) {
    return [
      normalizeExact(row?.person_name),
      normalizeExact(row?.politic_name),
      Number(row?.activity_start),
      Number(row?.activity_end)
    ].join("\u0001").toLowerCase();
  }

  function basePlan(operation) {
    return {
      available: true,
      operation,
      commit: false,
      writes_performed: 0,
      target_schema: "atlas_v2",
      commands: [],
      blockers: [],
      warnings: []
    };
  }

  function resolveCommands(row, legacyRecordId = null) {
    const personName = normalizeExact(row?.person_name);
    const polityName = normalizeExact(row?.politic_name);
    const role = normalizeExact(row?.role);
    const periodBasis = normalizeExact(row?.period_basis);
    const key = activityKey(row);
    const blockers = [];

    if (!personName) blockers.push({ code: "PERSON_IDENTITY_REQUIRED", field: "person_name" });
    if (!polityName) blockers.push({ code: "POLITY_IDENTITY_REQUIRED", field: "politic_name" });
    if (!periodBasis) blockers.push({ code: "PERIOD_BASIS_REQUIRED", field: "period_basis" });

    const commands = [
      {
        type: "RESOLVE_PERSON_EXACT",
        table: "atlas_v2.person_names",
        lookup: { name: personName },
        resolution: "reviewed_exact_name_or_alias_only"
      },
      {
        type: "RESOLVE_POLITY_EXACT",
        table: "atlas_v2.polity_names",
        lookup: { name: polityName },
        resolution: "reviewed_exact_name_or_alias_only"
      },
      {
        type: "RESOLVE_ROLE_EXACT",
        table: "atlas_v2.roles",
        lookup: { code_or_name: role || "general_activity" },
        resolution: "exact_reviewed_vocabulary"
      },
      {
        type: "RESOLVE_PERIOD_BASIS_EXACT",
        table: "atlas_v2.period_bases",
        lookup: { code: periodBasis },
        resolution: "exact_reviewed_vocabulary"
      },
      {
        type: "UPSERT_PERSON_POLITICS_V2",
        table: "atlas_v2.person_politics_v2",
        legacy_record_id: legacyRecordId,
        legacy_source_key: key,
        values: {
          activity_start: Number(row?.activity_start),
          activity_end: Number(row?.activity_end),
          notes: row?.notes ?? null
        },
        dependencies: ["person_id", "polity_id", "role_id", "period_basis_id"]
      }
    ];

    return { commands, blockers, activity_key: key };
  }

  function plan(operation, payload) {
    const result = basePlan(operation);
    if (!["create", "update", "delete", "import"].includes(operation)) {
      result.blockers.push({ code: "UNSUPPORTED_OPERATION", operation });
      return Object.freeze(result);
    }

    if (operation === "delete") {
      const id = payload?.id ?? null;
      if (id == null || id === "") result.blockers.push({ code: "LEGACY_LINEAGE_ID_REQUIRED", field: "id" });
      result.commands.push({
        type: "RESOLVE_RELATIONSHIP_BY_LEGACY_LINEAGE",
        table: "atlas_v2.person_politics_v2",
        lookup: { legacy_record_id: id }
      });
      result.commands.push({
        type: "RETIRE_OR_DELETE_PERSON_POLITICS_V2",
        table: "atlas_v2.person_politics_v2",
        legacy_record_id: id,
        resolution: "deterministic_lineage_only"
      });
      return Object.freeze(result);
    }

    if (operation === "import") {
      const rows = Array.isArray(payload) ? payload : [];
      if (!rows.length) result.blockers.push({ code: "IMPORT_ROWS_REQUIRED" });
      rows.forEach((row, index) => {
        const child = resolveCommands(row, null);
        result.commands.push({ type: "BEGIN_IMPORT_ROW", row_index: index });
        result.commands.push(...child.commands.map((command) => ({ ...command, row_index: index })));
        result.blockers.push(...child.blockers.map((blocker) => ({ ...blocker, row_index: index })));
      });
      return Object.freeze(result);
    }

    const value = operation === "update" ? payload?.value : payload;
    const legacyRecordId = operation === "update" ? payload?.id ?? null : null;
    if (operation === "update" && (legacyRecordId == null || legacyRecordId === "")) {
      result.blockers.push({ code: "LEGACY_LINEAGE_ID_REQUIRED", field: "id" });
    }
    const compiled = resolveCommands(value, legacyRecordId);
    result.commands.push(...compiled.commands);
    result.blockers.push(...compiled.blockers);
    return Object.freeze(result);
  }

  const api = Object.freeze({ plan, activityKey });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_V2_COMMAND_PLANNER = api;
})();
