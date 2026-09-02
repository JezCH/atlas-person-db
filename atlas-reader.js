(() => {
  "use strict";

  const MARKER = "ATLAS_READER_V2_DIRECT";
  const SOURCE = "v2-direct";
  const DEFAULT_ENDPOINT = "/api/atlas-read";
  const PERIOD_BASES = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  function validateRows(rows) {
    const failures = [];
    const ids = new Set();
    (rows || []).forEach((row, index) => {
      if (!row || typeof row !== "object") return failures.push(`row ${index}: object required`);
      const ongoing = row.chronology_status === "ongoing" && row.activity_end === null;
      const required = ["id", "person_name", "politic_name", "activity_start", ...(ongoing ? [] : ["activity_end"]), "period_basis"];
      required.forEach((key) => {
        if (row[key] === null || row[key] === undefined || row[key] === "") failures.push(`row ${index}: ${key} required`);
      });
      for (const key of ["person_display_name", "politic_display_name"]) {
        if (row[key] !== null && row[key] !== undefined && (typeof row[key] !== "string" || !row[key].trim())) failures.push(`row ${index}: ${key} must be non-empty string when present`);
      }
      if (!Number.isInteger(Number(row.activity_start))) failures.push(`row ${index}: activity_start integer required`);
      if (!ongoing && !Number.isInteger(Number(row.activity_end))) failures.push(`row ${index}: activity_end integer required`);
      if (!ongoing && Number(row.activity_end) < Number(row.activity_start)) failures.push(`row ${index}: invalid chronology`);
      if (!PERIOD_BASES.has(String(row.period_basis))) failures.push(`row ${index}: invalid period_basis`);
      if (row.role !== null && row.role !== undefined && typeof row.role !== "string") failures.push(`row ${index}: role must be string/null`);
      if (row.role_display_name !== null && row.role_display_name !== undefined && typeof row.role_display_name !== "string") failures.push(`row ${index}: role_display_name must be string/null`);
      if (row.notes !== null && row.notes !== undefined && typeof row.notes !== "string") failures.push(`row ${index}: notes must be string/null`);
      const id = String(row.id);
      if (ids.has(id)) failures.push(`row ${index}: duplicate id ${id}`);
      ids.add(id);
    });
    return failures;
  }

  function emitOutcome({ rows, validationFailures }) {
    window.AtlasReaderObservability?.record({
      requested_source: SOURCE,
      effective_source: SOURCE,
      fallback: false,
      row_count: rows,
      validation_failures: validationFailures
    });
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function loadPersonPolitics({
    fetchImpl = globalThis.fetch,
    endpoint = DEFAULT_ENDPOINT
  } = {}) {
    const diagnostics = [];
    if (typeof fetchImpl !== "function") {
      const error = new Error("fetch implementation is required");
      emitOutcome({ rows: 0, validationFailures: 1 });
      return { data: null, error, source: SOURCE, diagnostics: [error.message] };
    }

    try {
      const response = await fetchImpl(endpoint, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" }
      });
      const body = await readJson(response);
      if (!response.ok || body?.ok !== true || body?.source !== SOURCE || !Array.isArray(body?.data)) {
        const message = body?.error || `normalized read failed (${response.status})`;
        throw new Error(message);
      }

      const failures = validateRows(body.data);
      if (failures.length) {
        diagnostics.push(...failures);
        emitOutcome({ rows: body.data.length, validationFailures: failures.length });
        return { data: null, error: new Error("Row contract validation failed"), source: SOURCE, diagnostics };
      }

      emitOutcome({ rows: body.data.length, validationFailures: 0 });
      return { data: body.data, error: null, source: SOURCE, diagnostics };
    } catch (error) {
      diagnostics.push(error?.message || String(error));
      emitOutcome({ rows: 0, validationFailures: diagnostics.length });
      return { data: null, error, source: SOURCE, diagnostics };
    }
  }

  window.AtlasReader = Object.freeze({
    MARKER,
    SOURCE,
    DEFAULT_ENDPOINT,
    loadPersonPolitics,
    validateRows
  });
})();
