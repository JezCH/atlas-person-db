(() => {
  "use strict";

  function activityKey(row) {
    return [
      String(row?.person_name || "").trim(),
      String(row?.politic_name || "").trim(),
      Number(row?.activity_start),
      Number(row?.activity_end)
    ].join("\u0001").toLowerCase();
  }

  function compile(operation, payload) {
    const result = {
      available: true,
      operation,
      commit: false,
      writes_performed: 0,
      target_contract: "atlas_v2",
      mutations: [],
      warnings: [],
      errors: []
    };

    if (!["create", "update", "delete", "import"].includes(operation)) {
      result.errors.push("unsupported shadow operation");
      return Object.freeze(result);
    }

    if (operation === "create") {
      result.mutations.push(Object.freeze({ type: "UPSERT_ACTIVITY", activity_key: activityKey(payload), input: payload }));
    } else if (operation === "update") {
      result.mutations.push(Object.freeze({ type: "UPDATE_ACTIVITY", legacy_record_id: payload?.id ?? null, activity_key: activityKey(payload?.value), input: payload?.value ?? null }));
    } else if (operation === "delete") {
      result.mutations.push(Object.freeze({ type: "DELETE_ACTIVITY", legacy_record_id: payload?.id ?? null }));
    } else if (operation === "import") {
      const rows = Array.isArray(payload) ? payload : [];
      rows.forEach((row, index) => {
        result.mutations.push(Object.freeze({ type: "UPSERT_ACTIVITY", row_index: index, activity_key: activityKey(row), input: row }));
      });
    }

    return Object.freeze(result);
  }

  const api = Object.freeze({ compile, activityKey });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_V2_SHADOW_COMPILER = api;
})();
