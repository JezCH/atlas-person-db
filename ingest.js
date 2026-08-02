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
    "Kublai Khan|Yuan Dynasty|1260|1294",
    "Cnut the Great|North Sea Empire|1016|1035",
    "Philip II of Spain|Spanish Empire|1556|1598",
    "Simon Bolivar|Gran Colombia|1819|1830",
    "Nzinga Mbande|Kingdoms of Ndongo and Matamba|1624|1663",
    "Maria I of Portugal|Kingdom of Portugal|1777|1816",
    "Hypatia|Roman Empire|393|415",
    "Tokugawa Ieyasu|Tokugawa Shogunate|1603|1605",
    "Tokugawa Ieyasu|Tokugawa Shogunate|1605|1616"
  ]);

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

  async function fetchJson(path) {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} lookup failed (${response.status})`);
    return response.json();
  }

  async function reconcile() {
    const config = window.ATLAS_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) return { changed: 0 };

    const paths = [
      "./pending-records.json",
      "./pending-records-supplement.json",
      "./pending-records-supplement-2.json",
      "./pending-records-supplement-3.json",
      "./pending-records-supplement-4.json",
      "./pending-records-supplement-5.json",
      "./pending-records-corrections.json"
    ];

    const [datasets, nonTimelineRaw] = await Promise.all([
      Promise.all(paths.map(fetchJson)),
      fetchJson("./non-timeline-persons.json")
    ]);

    const excludedPersons = new Set((Array.isArray(nonTimelineRaw) ? nonTimelineRaw : [])
      .map((item) => String(item.person_name || "").trim())
      .filter(Boolean));

    const canonicalByKey = new Map();
    for (const raw of datasets.flatMap((rows) => Array.isArray(rows) ? rows : [])) {
      const record = normalizeRecord(raw);
      const key = keyOf(record);
      if (!record.person_name || !record.politic_name) continue;
      if (excludedPersons.has(record.person_name) || obsoleteKeys.has(key)) continue;
      canonicalByKey.set(key, record);
    }

    const canonical = [...canonicalByKey.values()];
    const managedPersons = new Set([...canonical.map((record) => record.person_name), ...excludedPersons]);
    const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    const { data: existingRows, error } = await db.from("person_politics").select("*").order("id", { ascending: true });
    if (error) throw error;

    let changed = 0;
    const retainedKeys = new Set();

    for (const row of existingRows || []) {
      const normalized = normalizeRecord(row);
      const key = keyOf(normalized);
      const desired = canonicalByKey.get(key);

      if ((managedPersons.has(normalized.person_name) && !desired) || obsoleteKeys.has(key)) {
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
      const key = keyOf(record);
      if (retainedKeys.has(key)) continue;
      const { error: insertError } = await db.from("person_politics").insert(record);
      if (insertError) throw insertError;
      retainedKeys.add(key);
      changed += 1;
    }

    return { changed, persons: new Set(canonical.map((row) => row.person_name)).size, activities: canonical.length };
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
