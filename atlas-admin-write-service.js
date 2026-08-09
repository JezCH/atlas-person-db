(() => {
  "use strict";

  function activityKey(row) {
    return [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)]
      .join("\u0001")
      .toLowerCase();
  }

  function createAdminWriteService({ db, adapterApi } = {}) {
    if (!db || typeof db.from !== "function") throw new Error("A Supabase-compatible db client is required for read lookup");
    if (!adapterApi || typeof adapterApi.createAdapter !== "function") throw new Error("ATLAS server write adapter is required");

    const adapter = adapterApi.createAdapter();

    async function saveRows(rows) {
      if (!Array.isArray(rows) || rows.length === 0) {
        return { inserted: 0, updated: 0, failures: ["at least one row is required"], mode: adapter.mode };
      }

      let inserted = 0;
      let updated = 0;
      const failures = [];

      for (const row of rows) {
        const { data, error: lookupError } = await db
          .from("person_politics")
          .select("id")
          .eq("person_name", row.person_name)
          .eq("politic_name", row.politic_name)
          .eq("activity_start", row.activity_start)
          .eq("activity_end", row.activity_end)
          .limit(1);

        if (lookupError) {
          failures.push(`${row.person_name}: lookup failed - ${lookupError.message || lookupError}`);
          continue;
        }

        const result = data?.length
          ? await adapter.updateActivity(data[0].id, row)
          : await adapter.createActivity(row);

        if (result.errors?.length || !result.legacy?.committed) {
          const detail = result.errors?.length ? result.errors.join("; ") : "server mutation was not committed";
          failures.push(`${row.person_name}: ${detail}`);
          continue;
        }

        if (data?.length) updated += 1;
        else inserted += 1;
      }

      return { inserted, updated, failures, mode: adapter.mode };
    }

    return Object.freeze({ saveRows, activityKey, mode: adapter.mode });
  }

  const api = Object.freeze({ createAdminWriteService, activityKey });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_ADMIN_WRITE_SERVICE = api;
})();
