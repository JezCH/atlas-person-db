(() => {
  "use strict";

  function activityKey(row) {
    return [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)]
      .join("\u0001")
      .toLowerCase();
  }

  function mutationSucceeded(result) {
    return result?.committed === true
      && result?.v2?.committed === true
      && !result?.errors?.length;
  }

  async function loadDirectRows({ fetchImpl, endpoint }) {
    const response = await fetchImpl(endpoint, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok || body?.ok !== true || body?.source !== "v2-direct" || !Array.isArray(body?.data)) {
      throw new Error(body?.error || `normalized read failed (${response.status})`);
    }
    return body.data;
  }

  function createAdminWriteService({
    adapterApi,
    fetchImpl = globalThis.fetch,
    readEndpoint = "/api/atlas-read"
  } = {}) {
    if (!adapterApi || typeof adapterApi.createAdapter !== "function") throw new Error("ATLAS server write adapter is required");
    if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required for normalized read lookup");

    const adapter = adapterApi.createAdapter();

    async function saveRows(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        return { inserted: 0, updated: 0, failures: ["at least one row is required"], mode: adapter.mode };
      }

      let existingRows;
      try {
        existingRows = await loadDirectRows({ fetchImpl, endpoint: readEndpoint });
      } catch (error) {
        return { inserted: 0, updated: 0, failures: [`normalized lookup failed - ${error.message || error}`], mode: adapter.mode };
      }

      const byKey = new Map();
      for (const existing of existingRows) {
        const key = activityKey(existing);
        const ids = byKey.get(key) || [];
        ids.push(String(existing.id));
        byKey.set(key, ids);
      }

      let inserted = 0;
      let updated = 0;
      const failures = [];

      for (const row of rows) {
        const key = activityKey(row);
        const ids = byKey.get(key) || [];
        if (ids.length > 1) {
          failures.push(`${row.person_name}: normalized activity lookup is ambiguous; review required`);
          continue;
        }

        const result = ids.length === 1
          ? await adapter.updateActivity(ids[0], row)
          : await adapter.createActivity(row);

        if (!mutationSucceeded(result)) {
          const detail = result?.errors?.length ? result.errors.join("; ") : "v2-only server mutation was not committed";
          failures.push(`${row.person_name}: ${detail}`);
          continue;
        }

        if (ids.length === 1) {
          updated += 1;
        } else {
          const newId = result?.v2?.normalized_relationship_ids?.[0];
          if (!newId) {
            failures.push(`${row.person_name}: committed create did not return normalized id`);
            continue;
          }
          byKey.set(key, [String(newId)]);
          inserted += 1;
        }
      }

      return { inserted, updated, failures, mode: adapter.mode };
    }

    return Object.freeze({ saveRows, activityKey, mode: adapter.mode });
  }

  const api = Object.freeze({ createAdminWriteService, activityKey, loadDirectRows });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_ADMIN_WRITE_SERVICE = api;
})();
