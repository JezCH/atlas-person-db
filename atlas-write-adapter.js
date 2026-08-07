(() => {
  "use strict";

  const BASIS = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  function normalizeInput(input) {
    const person = String(input?.person_name || "").trim();
    const polity = String(input?.politic_name || "").trim();
    const start = Number(input?.activity_start);
    const end = Number(input?.activity_end);
    const basis = String(input?.period_basis || "").trim();
    const errors = [];
    if (!person) errors.push("person_name is required");
    if (!polity) errors.push("politic_name is required");
    if (!Number.isInteger(start)) errors.push("activity_start must be an integer");
    if (!Number.isInteger(end)) errors.push("activity_end must be an integer");
    if (Number.isInteger(start) && Number.isInteger(end) && end < start) errors.push("activity_end must be greater than or equal to activity_start");
    if (!BASIS.has(basis)) errors.push("unsupported period_basis");
    return {
      value: {
        person_name: person,
        politic_name: polity,
        activity_start: start,
        activity_end: end,
        role: String(input?.role || "").trim() || null,
        period_basis: basis,
        notes: String(input?.notes || "").trim() || null
      },
      errors
    };
  }

  function requestId(operation, payload) {
    const raw = JSON.stringify([operation, payload]);
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `atlas-${operation}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function resultBase(operation, mode, payload) {
    return {
      request_id: requestId(operation, payload),
      mode,
      operation,
      legacy: { attempted: false, committed: false, record_ids: [] },
      v2: { attempted: mode === "shadow-validate", committed: false, validation: null },
      rollback_required: false,
      errors: []
    };
  }

  function createAdapter({ db, mode = "legacy-only", modeResolver, shadowCompiler } = {}) {
    if (!db || typeof db.from !== "function") throw new Error("A Supabase-compatible db client is required");
    const resolver = modeResolver || globalThis.ATLAS_WRITE_MODE?.resolveMode || ((value) => value === "shadow-validate" ? value : "legacy-only");
    const resolvedMode = resolver(mode);

    async function compileShadow(operation, payload, result) {
      if (resolvedMode !== "shadow-validate") return;
      if (typeof shadowCompiler !== "function") {
        result.v2.validation = { available: false, reason: "shadow compiler not provided" };
        return;
      }
      result.v2.validation = await shadowCompiler(operation, payload);
      result.v2.committed = false;
    }

    async function createActivity(input) {
      const { value, errors } = normalizeInput(input);
      const result = resultBase("create", resolvedMode, value);
      if (errors.length) { result.errors.push(...errors); return result; }
      await compileShadow("create", value, result);
      result.legacy.attempted = true;
      const response = await db.from("person_politics").insert(value).select("id").single();
      if (response.error) { result.errors.push(response.error.message || String(response.error)); return result; }
      result.legacy.committed = true;
      if (response.data?.id != null) result.legacy.record_ids.push(response.data.id);
      return result;
    }

    async function updateActivity(id, input) {
      const { value, errors } = normalizeInput(input);
      const result = resultBase("update", resolvedMode, { id, value });
      if (id == null || id === "") errors.push("record id is required");
      if (errors.length) { result.errors.push(...errors); return result; }
      await compileShadow("update", { id, value }, result);
      result.legacy.attempted = true;
      const response = await db.from("person_politics").update(value).eq("id", id);
      if (response.error) { result.errors.push(response.error.message || String(response.error)); return result; }
      result.legacy.committed = true;
      result.legacy.record_ids.push(id);
      return result;
    }

    async function deleteActivity(id) {
      const result = resultBase("delete", resolvedMode, { id });
      if (id == null || id === "") { result.errors.push("record id is required"); return result; }
      await compileShadow("delete", { id }, result);
      result.legacy.attempted = true;
      const response = await db.from("person_politics").delete().eq("id", id);
      if (response.error) { result.errors.push(response.error.message || String(response.error)); return result; }
      result.legacy.committed = true;
      result.legacy.record_ids.push(id);
      return result;
    }

    async function importActivities(inputs) {
      const rows = Array.isArray(inputs) ? inputs : [];
      const normalized = rows.map(normalizeInput);
      const result = resultBase("import", resolvedMode, rows);
      result.row_outcomes = normalized.map((entry, index) => ({ index, errors: [...entry.errors], committed: false }));
      if (!rows.length) { result.errors.push("at least one row is required"); return result; }
      if (normalized.some((entry) => entry.errors.length)) {
        result.errors.push("one or more rows are invalid");
        return result;
      }
      const payload = normalized.map((entry) => entry.value);
      await compileShadow("import", payload, result);
      result.legacy.attempted = true;
      const response = await db.from("person_politics").insert(payload);
      if (response.error) { result.errors.push(response.error.message || String(response.error)); return result; }
      result.legacy.committed = true;
      result.row_outcomes.forEach((row) => { row.committed = true; });
      return result;
    }

    async function reconcileCanonical(snapshot) {
      const result = resultBase("reconcile", resolvedMode, snapshot || null);
      result.errors.push("reconciliation is disabled in the unloaded Phase 8B adapter");
      return result;
    }

    return Object.freeze({ createActivity, updateActivity, deleteActivity, importActivities, reconcileCanonical, mode: resolvedMode });
  }

  const api = Object.freeze({ createAdapter, normalizeInput, requestId });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_WRITE_ADAPTER = api;
})();
