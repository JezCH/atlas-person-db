(() => {
  "use strict";

  const allowedBasis = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  const normalize = (value) => String(value || "").trim().toLowerCase();
  const activityKey = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join("\u0001").toLowerCase();

  async function fetchJson(path) {
    const response = await fetch(`${path}?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} 불러오기 실패 (${response.status})`);
    return response.json();
  }

  function duplicates(rows) {
    const counts = new Map();
    rows.forEach((row) => counts.set(activityKey(row), (counts.get(activityKey(row)) || 0) + 1));
    return [...counts.values()].filter((count) => count > 1).length;
  }

  function invalidRows(rows) {
    return rows.filter((row) =>
      !String(row.person_name || "").trim() ||
      !String(row.politic_name || "").trim() ||
      !Number.isInteger(Number(row.activity_start)) ||
      !Number.isInteger(Number(row.activity_end)) ||
      Number(row.activity_end) < Number(row.activity_start) ||
      !allowedBasis.has(String(row.period_basis || ""))
    );
  }

  async function verifyTimelineDatabase(button) {
    const output = document.getElementById("verifyResult");
    const config = window.ATLAS_CONFIG || {};
    if (!output || !window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

    button.disabled = true;
    output.dataset.type = "info";
    output.textContent = "Supabase 실시간 데이터와 GitHub 전체 기준 데이터를 검증하는 중...";

    try {
      const [base, supplement1, supplement2, supplement3, nonTimelineRaw] = await Promise.all([
        fetchJson("./pending-records.json"),
        fetchJson("./pending-records-supplement.json"),
        fetchJson("./pending-records-supplement-2.json"),
        fetchJson("./pending-records-supplement-3.json"),
        fetchJson("./non-timeline-persons.json")
      ]);

      const excludedNames = new Set(nonTimelineRaw.map((item) => normalize(item.person_name)).filter(Boolean));
      const expectedRows = [base, supplement1, supplement2, supplement3]
        .flatMap((rows) => Array.isArray(rows) ? rows : [])
        .filter((row) => !excludedNames.has(normalize(row.person_name)));

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data, error } = await db.from("person_politics").select("*");
      if (error) throw error;
      const dbRows = data || [];

      const expectedNames = new Set(expectedRows.map((row) => normalize(row.person_name)).filter(Boolean));
      const expectedKeys = new Set(expectedRows.map(activityKey));
      const dbNames = new Set(dbRows.map((row) => normalize(row.person_name)).filter(Boolean));
      const dbKeys = new Set(dbRows.map(activityKey));

      const missingDbPersons = [...expectedNames].filter((name) => !dbNames.has(name));
      const missingDbActivities = expectedRows.filter((row) => !dbKeys.has(activityKey(row)));
      const excludedStillInDb = [...excludedNames].filter((name) => dbNames.has(name));
      const extraDbPersons = [...dbNames].filter((name) => !expectedNames.has(name) && !excludedNames.has(name));
      const extraDbActivities = dbRows.filter((row) => !expectedKeys.has(activityKey(row)) && !excludedNames.has(normalize(row.person_name)));
      const invalidExpected = invalidRows(expectedRows);
      const invalidDb = invalidRows(dbRows);
      const expectedDuplicates = duplicates(expectedRows);
      const dbDuplicates = duplicates(dbRows);

      const failures = missingDbPersons.length + missingDbActivities.length + excludedStillInDb.length + invalidExpected.length + invalidDb.length + expectedDuplicates + dbDuplicates;
      const lines = [
        "ATLAS Database Verification — LIVE", "",
        `GitHub persons      : ${expectedNames.size}`,
        `GitHub activities   : ${expectedKeys.size}`,
        `Supabase persons    : ${dbNames.size}`,
        `Supabase activities : ${dbRows.length}`,
        `Non-timeline persons: ${excludedNames.size}`, "",
        `Missing Supabase persons   : ${missingDbPersons.length}`,
        `Missing Supabase activities: ${missingDbActivities.length}`,
        `Non-timeline still in DB   : ${excludedStillInDb.length}`,
        `Invalid GitHub rows        : ${invalidExpected.length}`,
        `Invalid Supabase rows      : ${invalidDb.length}`,
        `Duplicate GitHub rows      : ${expectedDuplicates}`,
        `Duplicate Supabase rows    : ${dbDuplicates}`,
        `Extra Supabase persons     : ${extraDbPersons.length}`,
        `Extra Supabase activities  : ${extraDbActivities.length}`, "",
        `Status: ${failures === 0 ? "PASS ✅" : "FAIL ❌"}`
      ];

      if (missingDbPersons.length) lines.push("", "[Supabase 누락 인물]", ...missingDbPersons.map((name) => `- ${name}`));
      if (missingDbActivities.length) lines.push("", "[Supabase 누락 활동]", ...missingDbActivities.map((row) => `- ${row.person_name} | ${row.politic_name} | ${row.activity_start}–${row.activity_end}`));
      if (excludedStillInDb.length) lines.push("", "[비연표 인물 DB 잔존]", ...excludedStillInDb.map((name) => `- ${name}`));
      if (extraDbPersons.length) lines.push("", "[GitHub 기준 외 Supabase 인물]", ...extraDbPersons.map((name) => `- ${name}`));
      if (extraDbActivities.length) lines.push("", "[GitHub 기준 외 Supabase 활동]", ...extraDbActivities.map((row) => `- ${row.person_name} | ${row.politic_name} | ${row.activity_start}–${row.activity_end}`));

      output.dataset.type = failures === 0 ? "success" : "error";
      output.textContent = lines.join("\n");
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = error.message;
    } finally {
      button.disabled = false;
    }
  }

  function replaceVerifier() {
    const oldButton = document.getElementById("verifyButton");
    if (!oldButton || oldButton.dataset.timelineVerifier === "true") return;
    const button = oldButton.cloneNode(true);
    button.dataset.timelineVerifier = "true";
    oldButton.replaceWith(button);
    button.addEventListener("click", () => verifyTimelineDatabase(button));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", replaceVerifier, { once: true });
  else replaceVerifier();
})();
