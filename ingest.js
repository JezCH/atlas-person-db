(() => {
  "use strict";

  async function runIngest() {
    const config = window.ATLAS_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) return;

    try {
      const response = await fetch(`./pending-records.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const pending = await response.json();
      if (!Array.isArray(pending) || !pending.length) return;

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      let inserted = 0;

      for (const record of pending) {
        const { data, error } = await db
          .from("person_politics")
          .select("id")
          .eq("person_name", record.person_name)
          .eq("politic_name", record.politic_name)
          .eq("activity_start", record.activity_start)
          .eq("activity_end", record.activity_end)
          .limit(1);

        if (error) {
          console.error("ATLAS ingest lookup failed", error);
          continue;
        }
        if (data?.length) continue;

        const { error: insertError } = await db.from("person_politics").insert(record);
        if (insertError) {
          console.error("ATLAS ingest insert failed", insertError);
          continue;
        }
        inserted += 1;
      }

      if (inserted > 0 && !sessionStorage.getItem("atlas-ingest-reloaded")) {
        sessionStorage.setItem("atlas-ingest-reloaded", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS ingest failed", error);
    }
  }

  runIngest();
})();
