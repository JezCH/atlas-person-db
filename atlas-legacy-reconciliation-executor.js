(() => {
  "use strict";

  function createLegacyReconciliationExecutor({ db } = {}) {
    if (!db || typeof db.from !== "function") throw new Error("A Supabase-compatible db client is required");

    return async function execute(plan) {
      if (!plan || plan.commit !== false || plan.database_writes !== 0) {
        throw new Error("A non-mutating reconciliation plan is required");
      }

      const counts = { inserts: 0, updates: 0, deletes: 0, duplicate_removals: 0 };

      for (const item of plan.proposed_deletes || []) {
        if (item.id == null) throw new Error("delete proposal is missing id");
        const { error } = await db.from("person_politics").delete().eq("id", item.id);
        if (error) throw error;
        counts.deletes += 1;
      }

      for (const item of plan.proposed_duplicate_removals || []) {
        if (item.id == null) throw new Error("duplicate-removal proposal is missing id");
        const { error } = await db.from("person_politics").delete().eq("id", item.id);
        if (error) throw error;
        counts.duplicate_removals += 1;
      }

      for (const item of plan.proposed_updates || []) {
        if (item.id == null || !item.after) throw new Error("update proposal is incomplete");
        const payload = { ...item.after };
        delete payload.id;
        const { error } = await db.from("person_politics").update(payload).eq("id", item.id);
        if (error) throw error;
        counts.updates += 1;
      }

      for (const item of plan.proposed_inserts || []) {
        if (!item.after) throw new Error("insert proposal is missing payload");
        const payload = { ...item.after };
        delete payload.id;
        const { error } = await db.from("person_politics").insert(payload);
        if (error) throw error;
        counts.inserts += 1;
      }

      return {
        marker: "PHASE_8B_LEGACY_RECONCILIATION_EXECUTOR",
        database_writes: counts.inserts + counts.updates + counts.deletes + counts.duplicate_removals,
        counts
      };
    };
  }

  const api = Object.freeze({ createLegacyReconciliationExecutor });
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.ATLAS_LEGACY_RECONCILIATION_EXECUTOR = api;
})();