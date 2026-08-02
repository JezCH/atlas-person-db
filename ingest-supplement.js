(() => {
  "use strict";

  const keyOf = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join("|");

  async function run() {
    const config = window.ATLAS_CONFIG || {};
    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

    try {
      const paths = [
        "./pending-records-supplement.json",
        "./pending-records-supplement-2.json",
        "./pending-records-supplement-3.json"
      ];
      const responses = await Promise.all(paths.map((path) => fetch(`${path}?v=${Date.now()}`, { cache: "no-store" })));
      responses.forEach((response, index) => {
        if (!response.ok) throw new Error(`${paths[index]} lookup failed (${response.status})`);
      });
      const datasets = await Promise.all(responses.map((response) => response.json()));
      const pending = datasets.flatMap((data) => Array.isArray(data) ? data : []);

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data: existingRows, error } = await db.from("person_politics").select("*");
      if (error) throw error;

      const existingByKey = new Map((existingRows || []).map((row) => [keyOf(row), row]));
      let changed = 0;

      for (const record of pending) {
        const key = keyOf(record);
        const existing = existingByKey.get(key);
        if (existing) {
          const payload = {
            person_name: record.person_name,
            politic_name: record.politic_name,
            activity_start: Number(record.activity_start),
            activity_end: Number(record.activity_end),
            role: record.role || null,
            period_basis: record.period_basis || "general_activity",
            notes: record.notes || null
          };
          const differs = ["person_name", "politic_name", "activity_start", "activity_end", "role", "period_basis", "notes"]
            .some((field) => String(existing[field] ?? "") !== String(payload[field] ?? ""));
          if (differs) {
            const { error: updateError } = await db.from("person_politics").update(payload).eq("id", existing.id);
            if (updateError) console.error("ATLAS supplement update failed", updateError);
            else changed += 1;
          }
          continue;
        }

        const { error: insertError } = await db.from("person_politics").insert(record);
        if (insertError) console.error("ATLAS supplement insert failed", insertError);
        else changed += 1;
      }

      if (changed > 0 && !sessionStorage.getItem("atlas-person-supplement-v3")) {
        sessionStorage.setItem("atlas-person-supplement-v3", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS supplemental activity reconciliation failed", error);
    }
  }

  run();
})();
