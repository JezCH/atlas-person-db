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
    "벨리사리우스": "Belisarius",
    "도쿠가와 이에야스": "Tokugawa Ieyasu",
    "나폴레옹": "Napoleon I",
    "샤카 카센장가코나": "Shaka kaSenzangakhona"
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

  function keyOf(record) {
    return [record.person_name, record.politic_name, Number(record.activity_start), Number(record.activity_end)].join("|");
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
      const managedPersons = new Set(pending.map((record) => record.person_name));

      const { data: existingRows, error: existingError } = await db
        .from("person_politics")
        .select("*")
        .order("id", { ascending: true });

      if (existingError) {
        console.error("ATLAS activity reconciliation lookup failed", existingError);
        return;
      }

      let changed = 0;
      const seenKeys = new Set();

      for (const row of existingRows || []) {
        const normalized = normalizeRecord(row);
        const key = keyOf(normalized);
        const canonical = pendingByKey.get(key);

        if (managedPersons.has(normalized.person_name) && !canonical) {
          const { error } = await db.from("person_politics").delete().eq("id", row.id);
          if (error) console.error("ATLAS obsolete activity cleanup failed", error);
          else changed += 1;
          continue;
        }

        if (seenKeys.has(key)) {
          const { error } = await db.from("person_politics").delete().eq("id", row.id);
          if (error) console.error("ATLAS duplicate activity cleanup failed", error);
          else changed += 1;
          continue;
        }

        seenKeys.add(key);
        if (!canonical) continue;

        const { error } = await db.from("person_politics").update(canonical).eq("id", row.id);
        if (error) console.error("ATLAS canonical activity update failed", error);
        else changed += 1;
      }

      for (const record of pending) {
        const key = keyOf(record);
        if (seenKeys.has(key)) continue;

        const { error } = await db.from("person_politics").insert(record);
        if (error) console.error("ATLAS activity insert failed", error);
        else {
          seenKeys.add(key);
          changed += 1;
        }
      }

      if (changed > 0 && !sessionStorage.getItem("atlas-person-activity-v2")) {
        sessionStorage.setItem("atlas-person-activity-v2", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS activity reconciliation failed", error);
    }
  }

  runIngest();
})();
