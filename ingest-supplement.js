(() => {
  "use strict";

  const keyOf = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join("|");

  const obsoleteKeys = new Set([
    "Dido|Carthage|-814|-814",
    "Isabella I|Crown of Castile|1474|1504",
    "Jesus|Roman Judaea|27|30",
    "Gautama Buddha|Shakya|-445|-400",
    "Muhammad|Medina|610|632",
    "Toyotomi Hideyoshi|Japan|1582|1598",
    "Benjamin Franklin|United States|1757|1790",
    "Edward Teach|Republic of Pirates|1716|1718",
    "Tecumseh|Shawnee|1805|1813",
    "Haile Selassie I|Ethiopian Empire|1930|1974",
    "Peter I|Russian Empire|1682|1725",
    "Kublai Khan|Yuan Dynasty|1260|1294"
  ]);

  async function run() {
    const config = window.ATLAS_CONFIG || {};
    if (!window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

    try {
      const paths = [
        "./pending-records-supplement.json",
        "./pending-records-supplement-2.json",
        "./pending-records-supplement-3.json",
        "./pending-records-supplement-4.json",
        "./pending-records-supplement-5.json",
        "./pending-records-corrections.json"
      ];
      const responses = await Promise.all(paths.map((path) => fetch(`${path}?v=${Date.now()}`, { cache: "no-store" })));
      responses.forEach((response, index) => {
        if (!response.ok) throw new Error(`${paths[index]} lookup failed (${response.status})`);
      });
      const datasets = await Promise.all(responses.map((response) => response.json()));
      const merged = datasets.flatMap((data) => Array.isArray(data) ? data : []);
      const pendingByKey = new Map();
      for (const record of merged) {
        const key = keyOf(record);
        if (!obsoleteKeys.has(key)) pendingByKey.set(key, record);
      }
      const pending = [...pendingByKey.values()];

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data: existingRows, error } = await db.from("person_politics").select("*");
      if (error) throw error;

      let changed = 0;
      for (const row of existingRows || []) {
        if (!obsoleteKeys.has(keyOf(row))) continue;
        const { error: deleteError } = await db.from("person_politics").delete().eq("id", row.id);
        if (deleteError) console.error("ATLAS obsolete row delete failed", deleteError);
        else changed += 1;
      }

      const { data: refreshedRows, error: refreshError } = await db.from("person_politics").select("*");
      if (refreshError) throw refreshError;
      const existingByKey = new Map((refreshedRows || []).map((row) => [keyOf(row), row]));

      for (const record of pending) {
        const key = keyOf(record);
        const existing = existingByKey.get(key);
        const payload = {
          person_name: record.person_name,
          politic_name: record.politic_name,
          activity_start: Number(record.activity_start),
          activity_end: Number(record.activity_end),
          role: record.role || null,
          period_basis: record.period_basis || "general_activity",
          notes: record.notes || null
        };

        if (existing) {
          const differs = ["person_name", "politic_name", "activity_start", "activity_end", "role", "period_basis", "notes"]
            .some((field) => String(existing[field] ?? "") !== String(payload[field] ?? ""));
          if (differs) {
            const { error: updateError } = await db.from("person_politics").update(payload).eq("id", existing.id);
            if (updateError) console.error("ATLAS supplement update failed", updateError);
            else changed += 1;
          }
          continue;
        }

        const { error: insertError } = await db.from("person_politics").insert(payload);
        if (insertError) console.error("ATLAS supplement insert failed", insertError);
        else changed += 1;
      }

      if (changed > 0 && !sessionStorage.getItem("atlas-person-map-corrections-v2")) {
        sessionStorage.setItem("atlas-person-map-corrections-v2", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS supplemental activity reconciliation failed", error);
    }
  }

  run();
})();
