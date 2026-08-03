(() => {
  "use strict";

  async function reconcile() {
    const config = window.ATLAS_CONFIG || {};
    const canonicalApi = window.ATLAS_CANONICAL_DATA;
    if (!canonicalApi) throw new Error("ATLAS canonical data loader is not available.");
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) return { changed: 0 };

    const { rows: canonical, excludedNames } = await canonicalApi.loadCanonical();
    const canonicalByKey = new Map(canonical.map((record) => [canonicalApi.activityKey(record), record]));
    const managedPersons = new Set([
      ...canonical.map((record) => canonicalApi.normalizeLookup(record.person_name)),
      ...excludedNames
    ]);

    const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const { data: existingRows, error } = await db.from("person_politics").select("*").order("id", { ascending: true });
    if (error) throw error;

    let changed = 0;
    const retainedKeys = new Set();

    for (const row of existingRows || []) {
      const normalized = canonicalApi.normalizeRecord(row);
      const key = canonicalApi.activityKey(normalized);
      const desired = canonicalByKey.get(key);
      const personKey = canonicalApi.normalizeLookup(normalized.person_name);

      if ((managedPersons.has(personKey) && !desired) || canonicalApi.OBSOLETE_KEYS.has(key)) {
        const { error: deleteError } = await db.from("person_politics").delete().eq("id", row.id);
        if (deleteError) throw deleteError;
        changed += 1;
        continue;
      }

      if (!desired) continue;

      if (retainedKeys.has(key)) {
        const { error: duplicateError } = await db.from("person_politics").delete().eq("id", row.id);
        if (duplicateError) throw duplicateError;
        changed += 1;
        continue;
      }

      retainedKeys.add(key);
      const differs = ["person_name", "politic_name", "activity_start", "activity_end", "role", "period_basis", "notes"]
        .some((field) => String(row[field] ?? "") !== String(desired[field] ?? ""));
      if (differs) {
        const { error: updateError } = await db.from("person_politics").update(desired).eq("id", row.id);
        if (updateError) throw updateError;
        changed += 1;
      }
    }

    for (const record of canonical) {
      const key = canonicalApi.activityKey(record);
      if (retainedKeys.has(key)) continue;
      const { error: insertError } = await db.from("person_politics").insert(record);
      if (insertError) throw insertError;
      retainedKeys.add(key);
      changed += 1;
    }

    return {
      changed,
      persons: new Set(canonical.map((row) => canonicalApi.normalizeLookup(row.person_name))).size,
      activities: canonical.length
    };
  }

  window.ATLAS_RECONCILE_PROMISE = reconcile()
    .then((result) => {
      window.dispatchEvent(new CustomEvent("atlas:reconciled", { detail: result }));
      return result;
    })
    .catch((error) => {
      console.error("ATLAS canonical reconciliation failed", error);
      window.dispatchEvent(new CustomEvent("atlas:reconcile-error", { detail: error }));
      return { changed: 0, error };
    });
})();
