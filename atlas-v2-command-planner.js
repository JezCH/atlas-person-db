(() => {
  "use strict";

  const PERIOD_BASES = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  function normalizeExact(value) {
    return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  }

  function normalizeOptional(value) {
    const normalized = normalizeExact(value);
    return normalized || null;
  }

  function normalizeRow(row) {
    const personName = normalizeExact(row?.person_name);
    const polityName = normalizeExact(row?.politic_name);
    const start = Number(row?.activity_start);
    const end = Number(row?.activity_end);
    const role = normalizeOptional(row?.role);
    const periodBasis = normalizeExact(row?.period_basis);
    const notes = normalizeOptional(row?.notes);
    const blockers = [];

    if (!personName) blockers.push({ code: "PERSON_IDENTITY_REQUIRED", field: "person_name" });
    if (!polityName) blockers.push({ code: "POLITY_IDENTITY_REQUIRED", field: "politic_name" });
    if (!Number.isInteger(start)) blockers.push({ code: "ACTIVITY_START_INTEGER_REQUIRED", field: "activity_start" });
    if (!Number.isInteger(end)) blockers.push({ code: "ACTIVITY_END_INTEGER_REQUIRED", field: "activity_end" });
    if (Number.isInteger(start) && (start === 0 || start < -10000 || start > 9999)) blockers.push({ code: "ACTIVITY_START_OUT_OF_RANGE", field: "activity_start" });
    if (Number.isInteger(end) && (end === 0 || end < -10000 || end > 9999)) blockers.push({ code: "ACTIVITY_END_OUT_OF_RANGE", field: "activity_end" });
    if (Number.isInteger(start) && Number.isInteger(end) && end < start) blockers.push({ code: "ACTIVITY_RANGE_INVALID", field: "activity_end" });
    if (!periodBasis) blockers.push({ code: "PERIOD_BASIS_REQUIRED", field: "period_basis" });
    else if (!PERIOD_BASES.has(periodBasis)) blockers.push({ code: "PERIOD_BASIS_UNSUPPORTED", field: "period_basis" });

    return {
      value: {
        person_name: personName,
        politic_name: polityName,
        activity_start: start,
        activity_end: end,
        role,
        period_basis: periodBasis,
        notes
      },
      blockers
    };
  }

  function activityKey(row) {
    const normalized = normalizeRow(row).value;
    return [
      normalized.person_name,
      normalized.politic_name,
      normalized.activity_start,
      normalized.activity_end
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
      warnings: [],
      normalized_payload: null
    };
  }

  function resolveCommands(row, legacyRecordId = null) {
    const normalized = normalizeRow(row);
    const value = normalized.value;
    const key = activityKey(value);
    const commands = [
      {
        type: "RESOLVE_PERSON_EXACT",
        table: "atlas_v2.person_names",
        lookup: { name: value.person_name },
        resolution: "reviewed_exact_name_or_alias_only"
      },
      {
        type: "RESOLVE_POLITY_EXACT",
        table: "atlas_v2.polity_names",
        lookup: { name: value.politic_name },
        resolution: "reviewed_exact_name_or_alias_only"
      }
    ];

    if (value.role !== null) {
      commands.push({
        type: "RESOLVE_ROLE_EXACT",
        table: "atlas_v2.roles",
        lookup: { code_or_name: value.role },
        resolution: "exact_reviewed_vocabulary"
      });
    }

    commands.push(
      {
        type: "RESOLVE_PERIOD_BASIS_EXACT",
        table: "atlas_v2.period_bases",
        lookup: { code: value.period_basis },
        resolution: "exact_reviewed_vocabulary"
      },
      {
        type: "UPSERT_PERSON_POLITICS_V2",
        table: "atlas_v2.person_politics_v2",
        legacy_record_id: legacyRecordId,
        legacy_source_key: key,
        values: {
          activity_start: value.activity_start,
          activity_end: value.activity_end,
          notes: value.notes
        },
        dependencies: ["person_id", "polity_id", "period_basis_id"],
        optional_dependencies: ["role_id"]
      }
    );

    return { commands, blockers: normalized.blockers, activity_key: key, value };
  }

  function reconciliationStep(kind, index, item, operation, payload) {
    const childPlan = plan(operation, payload);
    return {
      kind,
      index,
      reason_code: item?.reason_code || null,
      operation,
      payload: childPlan.normalized_payload,
      plan: childPlan
    };
  }

  function planReconciliation(payload, result) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      result.blockers.push({ code: "RECONCILIATION_PLAN_REQUIRED" });
      return Object.freeze(result);
    }
    if (payload.commit !== false || Number(payload.database_writes) !== 0) {
      result.blockers.push({ code: "RECONCILIATION_PLAN_MUST_BE_NON_MUTATING" });
    }
    if (payload.marker !== "PHASE_8B_RECONCILIATION_DRY_RUN") {
      result.blockers.push({ code: "RECONCILIATION_PLAN_MARKER_INVALID" });
    }

    const validationFailures = Array.isArray(payload.validation_failures) ? payload.validation_failures : [];
    if (validationFailures.length) {
      result.blockers.push({
        code: "RECONCILIATION_VALIDATION_FAILURES_PRESENT",
        count: validationFailures.length
      });
    }

    const steps = [];
    const append = (kind, items, operation, makePayload) => {
      (Array.isArray(items) ? items : []).forEach((item, index) => {
        const step = reconciliationStep(kind, index, item, operation, makePayload(item));
        steps.push(step);
        for (const blocker of step.plan.blockers || []) {
          result.blockers.push({
            ...blocker,
            reconciliation_kind: kind,
            reconciliation_index: index,
            reason_code: item?.reason_code || null
          });
        }
      });
    };

    append("delete", payload.proposed_deletes, "delete", (item) => ({ id: item?.id ?? null }));
    append("duplicate_removal", payload.proposed_duplicate_removals, "delete", (item) => ({ id: item?.id ?? null }));
    append("update", payload.proposed_updates, "update", (item) => ({ id: item?.id ?? null, value: item?.after ?? null }));
    append("insert", payload.proposed_inserts, "create", (item) => item?.after ?? null);

    result.reconciliation_steps = steps;
    result.normalized_payload = {
      canonical_snapshot: payload.canonical_snapshot || null,
      steps: steps.map((step) => ({
        kind: step.kind,
        index: step.index,
        reason_code: step.reason_code,
        operation: step.operation,
        payload: step.payload
      }))
    };
    return Object.freeze(result);
  }

  function plan(operation, payload) {
    const result = basePlan(operation);

    if (operation === "reconcile") return planReconciliation(payload, result);

    if (!["create", "update", "delete", "import"].includes(operation)) {
      result.blockers.push({ code: "UNSUPPORTED_OPERATION", operation });
      return Object.freeze(result);
    }

    if (operation === "delete") {
      const id = payload?.id ?? null;
      if (id == null || id === "") result.blockers.push({ code: "LEGACY_LINEAGE_ID_REQUIRED", field: "id" });
      result.normalized_payload = { id };
      result.commands.push({
        type: "RESOLVE_RELATIONSHIP_BY_LEGACY_LINEAGE",
        table: "atlas_v2.person_politics_v2",
        lookup: { legacy_record_id: id }
      });
      result.commands.push({
        type: "RETIRE_OR_DELETE_PERSON_POLITICS_V2",
        table: "atlas_v2.person_politics_v2",
        legacy_record_id: id,
        resolution: "deterministic_lineage_or_exact_preimage_only"
      });
      return Object.freeze(result);
    }

    if (operation === "import") {
      const rows = Array.isArray(payload) ? payload : [];
      if (!rows.length) result.blockers.push({ code: "IMPORT_ROWS_REQUIRED" });
      const normalizedRows = [];
      rows.forEach((row, index) => {
        const child = resolveCommands(row, null);
        normalizedRows.push(child.value);
        result.commands.push({ type: "BEGIN_IMPORT_ROW", row_index: index });
        result.commands.push(...child.commands.map((command) => ({ ...command, row_index: index })));
        result.blockers.push(...child.blockers.map((blocker) => ({ ...blocker, row_index: index })));
      });
      result.normalized_payload = normalizedRows;
      return Object.freeze(result);
    }

    const rawValue = operation === "update" ? payload?.value : payload;
    const legacyRecordId = operation === "update" ? payload?.id ?? null : null;
    if (operation === "update" && (legacyRecordId == null || legacyRecordId === "")) {
      result.blockers.push({ code: "LEGACY_LINEAGE_ID_REQUIRED", field: "id" });
    }
    const compiled = resolveCommands(rawValue, legacyRecordId);
    result.commands.push(...compiled.commands);
    result.blockers.push(...compiled.blockers);
    result.normalized_payload = operation === "update"
      ? { id: legacyRecordId, value: compiled.value }
      : compiled.value;
    return Object.freeze(result);
  }

  const api = Object.freeze({ plan, activityKey, normalizeRow });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_V2_COMMAND_PLANNER = api;
})();
