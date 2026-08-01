(() => {
  "use strict";

  const legacyNames = {
    "이순신": "Yi Sun-sin",
    "율리우스 카이사르": "Julius Caesar",
    "프리드리히 대왕": "Frederick the Great",
    "함무라비": "Hammurabi",
    "람세스 2세": "Ramses II",
    "콘스탄티누스 1세": "Constantine I",
    "유스티니아누스 1세": "Justinian I",
    "벨리사리우스": "Belisarius"
  };

  const basisMap = {
    "재위": "reign",
    "임기": "term",
    "실권 장악": "de_facto_rule",
    "군사 활동": "military_activity",
    "종교 활동": "religious_activity",
    "학술 활동": "intellectual_activity",
    "예술 활동": "artistic_activity",
    "주요 활동": "general_activity"
  };

  function keyOf(record) {
    return [
      record.person_name,
      record.politic_name,
      Number(record.activity_start),
      Number(record.activity_end)
    ].join("|");
  }

  function normalizeRecord(record) {
    return {
      person_name: legacyNames[record.person_name] || record.person_name,
      politic_name: record.politic_name,
      activity_start: Number(record.activity_start),
      activity_end: Number(record.activity_end),
      role: record.role || null,
      period_basis: basisMap[record.period_basis] || record.period_basis || "general_activity",
      notes: record.notes || null
    };
  }

  async function runIngest() {
    const config = window.ATLAS_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) return;

    try {
      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const response = await fetch(`./pending-records.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;

      const pendingRaw = await response.json();
      if (!Array.isArray(pendingRaw)) return;
      const pending = pendingRaw.map(normalizeRecord);
      const pendingByKey = new Map(pending.map((record) => [keyOf(record), record]));

      const { data: existingRows, error: existingError } = await db
        .from("person_politics")
        .select("*")
        .order("id", { ascending: true });

      if (existingError) {
        console.error("ATLAS cleanup lookup failed", existingError);
        return;
      }

      let changed = 0;
      const groups = new Map();

      for (const row of existingRows || []) {
        const normalized = normalizeRecord(row);
        const key = keyOf(normalized);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ row, normalized });
      }

      for (const [key, items] of groups.entries()) {
        const keeper = items[0];
        const canonical = pendingByKey.get(key) || keeper.normalized;

        const { error: updateError } = await db
          .from("person_politics")
          .update(canonical)
          .eq("id", keeper.row.id);

        if (updateError) console.error("ATLAS canonical update failed", updateError);
        else changed += 1;

        for (const duplicate of items.slice(1)) {
          const { error: deleteError } = await db
            .from("person_politics")
            .delete()
            .eq("id", duplicate.row.id);
          if (deleteError) console.error("ATLAS duplicate cleanup failed", deleteError);
          else changed += 1;
        }
      }

      const existingKeys = new Set(groups.keys());
      for (const record of pending) {
        const key = keyOf(record);
        if (existingKeys.has(key)) continue;

        const { error: insertError } = await db.from("person_politics").insert(record);
        if (insertError) console.error("ATLAS ingest insert failed", insertError);
        else {
          existingKeys.add(key);
          changed += 1;
        }
      }

      if (changed > 0 && !sessionStorage.getItem("atlas-normalized-v1")) {
        sessionStorage.setItem("atlas-normalized-v1", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS ingest failed", error);
    }
  }

  runIngest();
})();
