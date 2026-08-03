(() => {
  "use strict";

  const DATASET_PATHS = Object.freeze([
    "./pending-records.json",
    "./pending-records-supplement.json",
    "./pending-records-supplement-2.json",
    "./pending-records-supplement-3.json",
    "./pending-records-supplement-4.json",
    "./pending-records-supplement-5.json",
    "./pending-records-supplement-6.json",
    "./pending-records-supplement-7.json",
    "./pending-records-supplement-8.json",
    "./pending-records-supplement-9.json",
    "./pending-records-supplement-10.json",
    "./pending-records-corrections.json"
  ]);

  const NON_TIMELINE_PATH = "./non-timeline-persons.json";

  const LEGACY_NAMES = Object.freeze({
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
  });

  const BASIS_MAP = Object.freeze({
    "재위": "reign",
    "임기": "term",
    "실권 장악": "de_facto_rule",
    "군사 활동": "military_activity",
    "종교 활동": "religious_activity",
    "학술 활동": "intellectual_activity",
    "예술 활동": "artistic_activity",
    "주요 활동": "general_activity"
  });

  const POLITY_ALIASES = Object.freeze({
    "ming dynasty": "Ming Dynasty"
  });

  const OBSOLETE_KEYS = new Set([
    "dido\u0001carthage\u0001-814\u0001-814",
    "isabella i\u0001crown of castile\u00011474\u00011504",
    "jesus\u0001roman judaea\u000127\u000130",
    "gautama buddha\u0001shakya\u0001-445\u0001-400",
    "muhammad\u0001medina\u0001610\u0001632",
    "toyotomi hideyoshi\u0001japan\u00011582\u00011598",
    "benjamin franklin\u0001united states\u00011757\u00011790",
    "edward teach\u0001republic of pirates\u00011716\u00011718",
    "tecumseh\u0001shawnee\u00011805\u00011813",
    "haile selassie i\u0001ethiopian empire\u00011930\u00011974",
    "peter i\u0001russian empire\u00011682\u00011725",
    "kublai khan\u0001yuan dynasty\u00011260\u00011294",
    "cnut the great\u0001north sea empire\u00011016\u00011035",
    "philip ii of spain\u0001spanish empire\u00011556\u00011598",
    "simon bolivar\u0001gran colombia\u00011819\u00011830",
    "nzinga mbande\u0001kingdoms of ndongo and matamba\u00011624\u00011663",
    "maria i of portugal\u0001kingdom of portugal\u00011777\u00011816",
    "hypatia\u0001roman empire\u0001393\u0001415",
    "tokugawa ieyasu\u0001tokugawa shogunate\u00011603\u00011605",
    "tokugawa ieyasu\u0001tokugawa shogunate\u00011605\u00011616"
  ]);

  const normalizeText = (value) => String(value || "").trim().replace(/\s+/g, " ");
  const normalizeLookup = (value) => normalizeText(value).toLowerCase();
  const normalizePolity = (value) => {
    const clean = normalizeText(value);
    return POLITY_ALIASES[clean.toLowerCase()] || clean;
  };

  function normalizeRecord(record) {
    return {
      person_name: LEGACY_NAMES[record.person_name] || normalizeText(record.person_name),
      politic_name: normalizePolity(record.politic_name),
      activity_start: Number(record.activity_start),
      activity_end: Number(record.activity_end),
      role: record.role || null,
      period_basis: BASIS_MAP[record.period_basis] || record.period_basis || "general_activity",
      notes: record.notes || null
    };
  }

  function activityKey(record) {
    const normalized = normalizeRecord(record);
    return [
      normalizeLookup(normalized.person_name),
      normalizeLookup(normalized.politic_name),
      normalized.activity_start,
      normalized.activity_end
    ].join("\u0001");
  }

  async function fetchJson(path) {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} 불러오기 실패 (${response.status})`);
    return response.json();
  }

  async function loadCanonical() {
    const [datasets, nonTimelineRaw] = await Promise.all([
      Promise.all(DATASET_PATHS.map(fetchJson)),
      fetchJson(NON_TIMELINE_PATH)
    ]);

    const excludedNames = new Set((Array.isArray(nonTimelineRaw) ? nonTimelineRaw : [])
      .map((item) => normalizeLookup(item.person_name))
      .filter(Boolean));

    const byKey = new Map();
    for (const raw of datasets.flatMap((rows) => Array.isArray(rows) ? rows : [])) {
      const normalized = normalizeRecord(raw);
      if (!normalized.person_name || !normalized.politic_name) continue;
      if (excludedNames.has(normalizeLookup(normalized.person_name))) continue;
      const key = activityKey(normalized);
      if (OBSOLETE_KEYS.has(key)) continue;
      byKey.set(key, normalized);
    }

    return {
      rows: [...byKey.values()],
      excludedNames,
      datasetPaths: [...DATASET_PATHS]
    };
  }

  window.ATLAS_CANONICAL_DATA = Object.freeze({
    DATASET_PATHS,
    NON_TIMELINE_PATH,
    OBSOLETE_KEYS,
    normalizeText,
    normalizeLookup,
    normalizePolity,
    normalizeRecord,
    activityKey,
    fetchJson,
    loadCanonical
  });
})();
