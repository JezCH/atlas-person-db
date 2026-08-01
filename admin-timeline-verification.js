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
    output.textContent = "연표 데이터와 비연표 인물을 분리해 검증하는 중...";

    try {
      const [expectedRaw, pendingRaw, nonTimelineRaw] = await Promise.all([
        fetchJson("./expected-persons.json"),
        fetchJson("./pending-records.json"),
        fetchJson("./non-timeline-persons.json")
      ]);
      const excludedNames = new Set(nonTimelineRaw.map((item) => String(item.person_name || "").trim()).filter(Boolean));
      const expected = expectedRaw.map((item) => typeof item === "string" ? item : item.person_name).filter((name) => name && !excludedNames.has(name));
      const pending = pendingRaw.filter((row) => !excludedNames.has(String(row.person_name || "").trim()));

      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data, error } = await db.from("person_politics").select("*");
      if (error) throw error;
      const dbRows = data || [];

      const expectedSet = new Set(expected.map(normalize));
      const pendingNames = new Set(pending.map((row) => normalize(row.person_name)));
      const dbNames = new Set(dbRows.map((row) => normalize(row.person_name)));
      const pendingKeys = new Set(pending.map(activityKey));
      const dbKeys = new Set(dbRows.map(activityKey));

      const missingPending = expected.filter((name) => !pendingNames.has(normalize(name)));
      const missingDb = expected.filter((name) => !dbNames.has(normalize(name)));
      const missingActivities = pending.filter((row) => !dbKeys.has(activityKey(row)));
      const excludedStillInDb = [...excludedNames].filter((name) => dbNames.has(normalize(name)));
      const extraDb = [...dbNames].filter((name) => !expectedSet.has(name) && ![...excludedNames].some((excluded) => normalize(excluded) === name));
      const invalidPending = invalidRows(pending);
      const invalidDb = invalidRows(dbRows);
      const pendingDuplicates = duplicates(pending);
      const dbDuplicates = duplicates(dbRows);

      const failures = missingPending.length + missingDb.length + missingActivities.length + excludedStillInDb.length + invalidPending.length + invalidDb.length + pendingDuplicates + dbDuplicates;
      const lines = [
        "ATLAS Timeline Verification", "",
        `Timeline persons    : ${expectedSet.size}`,
        `Timeline activities : ${pendingKeys.size}`,
        `Non-timeline persons: ${excludedNames.size}`,
        `DB persons          : ${dbNames.size}`,
        `DB activities       : ${dbRows.length}`, "",
        `Missing GitHub timeline persons : ${missingPending.length}`,
        `Missing Supabase persons        : ${missingDb.length}`,
        `Missing activity rows           : ${missingActivities.length}`,
        `Non-timeline persons still in DB: ${excludedStillInDb.length}`,
        `Invalid timeline rows           : ${invalidPending.length}`,
        `Invalid DB rows                 : ${invalidDb.length}`,
        `Duplicate timeline rows         : ${pendingDuplicates}`,
        `Duplicate DB rows               : ${dbDuplicates}`,
        `Extra DB persons                : ${extraDb.length}`, "",
        `Status: ${failures === 0 ? "PASS ✅" : "FAIL ❌"}`
      ];
      if (excludedStillInDb.length) lines.push("", "[비연표 인물 DB 잔존]", ...excludedStillInDb.map((name) => `- ${name}`));
      if (missingDb.length) lines.push("", "[Supabase 누락]", ...missingDb.map((name) => `- ${name}`));
      if (missingActivities.length) lines.push("", "[활동행 누락]", ...missingActivities.map((row) => `- ${row.person_name} | ${row.activity_start}–${row.activity_end}`));
      lines.push("", "[비연표 보관]", ...nonTimelineRaw.map((item) => `- ${item.person_name}: ${item.timeline_status || "excluded"} (${item.historicity || "uncertain"})`));

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
