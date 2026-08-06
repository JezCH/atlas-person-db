(() => {
  "use strict";

  const VALID_SOURCES = new Set(["legacy", "v2-shadow"]);
  const ORDER = ["politic_name", "activity_start", "activity_end", "person_name"];
  const PERIOD_BASES = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  function resolveSource(source) {
    const configured = source || window.ATLAS_DATA_SOURCE || "legacy";
    if (!VALID_SOURCES.has(configured)) {
      return { source: "legacy", diagnostic: `invalid source '${configured}', using legacy` };
    }
    return { source: configured, diagnostic: null };
  }

  function validateRows(rows) {
    const failures = [];
    const ids = new Set();
    (rows || []).forEach((row, index) => {
      if (!row || typeof row !== "object") return failures.push(`row ${index}: object required`);
      const required = ["id", "person_name", "politic_name", "activity_start", "activity_end", "period_basis"];
      required.forEach((key) => {
        if (row[key] === null || row[key] === undefined || row[key] === "") failures.push(`row ${index}: ${key} required`);
      });
      if (!Number.isInteger(Number(row.activity_start))) failures.push(`row ${index}: activity_start integer required`);
      if (!Number.isInteger(Number(row.activity_end))) failures.push(`row ${index}: activity_end integer required`);
      if (Number(row.activity_end) < Number(row.activity_start)) failures.push(`row ${index}: invalid chronology`);
      if (!PERIOD_BASES.has(String(row.period_basis))) failures.push(`row ${index}: invalid period_basis`);
      if (row.role !== null && row.role !== undefined && typeof row.role !== "string") failures.push(`row ${index}: role must be string/null`);
      if (row.notes !== null && row.notes !== undefined && typeof row.notes !== "string") failures.push(`row ${index}: notes must be string/null`);
      const id = String(row.id);
      if (ids.has(id)) failures.push(`row ${index}: duplicate id ${id}`);
      ids.add(id);
    });
    return failures;
  }

  function tableFor(source) {
    return source === "v2-shadow" ? "atlas_person_politics_compat_v1" : "person_politics";
  }

  async function queryRows(client, source) {
    let query = client.from(tableFor(source)).select("id,person_name,politic_name,activity_start,activity_end,role,period_basis,notes");
    ORDER.forEach((column) => { query = query.order(column); });
    return query;
  }

  async function loadPersonPolitics({ client, source, fallbackToLegacy = true } = {}) {
    if (!client) {
      return { data: null, error: new Error("Supabase client is required"), source: "legacy", diagnostics: ["missing client"] };
    }
    const resolved = resolveSource(source);
    const diagnostics = resolved.diagnostic ? [resolved.diagnostic] : [];
    const primary = await queryRows(client, resolved.source);
    if (!primary.error) {
      const failures = validateRows(primary.data || []);
      if (!failures.length) return { data: primary.data || [], error: null, source: resolved.source, diagnostics };
      diagnostics.push(...failures);
    } else {
      diagnostics.push(`${resolved.source} read failed: ${primary.error.message}`);
    }

    if (resolved.source === "v2-shadow" && fallbackToLegacy) {
      const fallback = await queryRows(client, "legacy");
      if (!fallback.error) {
        const failures = validateRows(fallback.data || []);
        if (!failures.length) {
          diagnostics.push("fallback to legacy");
          return { data: fallback.data || [], error: null, source: "legacy", diagnostics };
        }
        diagnostics.push(...failures);
      } else {
        diagnostics.push(`legacy fallback failed: ${fallback.error.message}`);
      }
    }

    return { data: null, error: primary.error || new Error("Row contract validation failed"), source: resolved.source, diagnostics };
  }

  window.AtlasReader = Object.freeze({ loadPersonPolitics, validateRows, resolveSource });
})();
