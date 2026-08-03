(() => {
  "use strict";

  const allowedBasis = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  function duplicates(rows, activityKey) {
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

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("클립보드 복사에 실패했습니다.");
  }

  async function copyVerificationResult(button) {
    const output = document.getElementById("verifyResult");
    const text = String(output?.textContent || "").trim();
    if (!text) return;

    const originalLabel = button.textContent;
    try {
      await copyText(text);
      button.textContent = "복사됨 ✓";
    } catch (error) {
      console.error("Verification result copy failed", error);
      button.textContent = "복사 실패";
    } finally {
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 1400);
    }
  }

  async function verifyTimelineDatabase(button) {
    const output = document.getElementById("verifyResult");
    const copyButton = document.getElementById("verifyCopyButton");
    const config = window.ATLAS_CONFIG || {};
    const canonicalApi = window.ATLAS_CANONICAL_DATA;
    if (!output || !window.supabase || !config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) return;

    button.disabled = true;
    if (copyButton) copyButton.disabled = true;
    output.dataset.type = "info";
    output.textContent = "Supabase 실시간 데이터와 GitHub 연표 데이터를 검증하는 중...";

    try {
      if (!canonicalApi) throw new Error("ATLAS canonical data loader is not available.");
      const { rows: expectedRows, excludedNames } = await canonicalApi.loadCanonical();
      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      const { data, error } = await db.from("person_politics").select("*");
      if (error) throw error;

      const dbRows = (data || [])
        .map(canonicalApi.normalizeRecord)
        .filter((row) => !excludedNames.has(canonicalApi.normalizeLookup(row.person_name)))
        .filter((row) => !canonicalApi.OBSOLETE_KEYS.has(canonicalApi.activityKey(row)));

      const expectedNames = new Set(expectedRows.map((row) => canonicalApi.normalizeLookup(row.person_name)).filter(Boolean));
      const expectedKeys = new Set(expectedRows.map(canonicalApi.activityKey));
      const dbNames = new Set(dbRows.map((row) => canonicalApi.normalizeLookup(row.person_name)).filter(Boolean));
      const dbKeys = new Set(dbRows.map(canonicalApi.activityKey));

      const missingDbPersons = [...expectedNames].filter((name) => !dbNames.has(name));
      const missingDbActivities = expectedRows.filter((row) => !dbKeys.has(canonicalApi.activityKey(row)));
      const extraDbPersons = [...dbNames].filter((name) => !expectedNames.has(name));
      const extraDbActivities = dbRows.filter((row) => !expectedKeys.has(canonicalApi.activityKey(row)));
      const invalidExpected = invalidRows(expectedRows);
      const invalidDb = invalidRows(dbRows);
      const expectedDuplicates = duplicates(expectedRows, canonicalApi.activityKey);
      const dbDuplicates = duplicates(dbRows, canonicalApi.activityKey);

      const failures = missingDbPersons.length + missingDbActivities.length + extraDbPersons.length + extraDbActivities.length + invalidExpected.length + invalidDb.length + expectedDuplicates + dbDuplicates;
      const lines = [
        "ATLAS Database Verification — LIVE", "",
        `Timeline persons    : ${expectedNames.size}`,
        `Timeline activities : ${expectedKeys.size}`,
        `Supabase persons    : ${dbNames.size}`,
        `Supabase activities : ${dbRows.length}`,
        `Non-timeline persons: ${excludedNames.size}`,
        `Total canonical     : ${expectedNames.size + excludedNames.size}`, "",
        `Missing Supabase persons   : ${missingDbPersons.length}`,
        `Missing Supabase activities: ${missingDbActivities.length}`,
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
      if (extraDbPersons.length) lines.push("", "[GitHub 기준 외 Supabase 인물]", ...extraDbPersons.map((name) => `- ${name}`));
      if (extraDbActivities.length) lines.push("", "[GitHub 기준 외 Supabase 활동]", ...extraDbActivities.map((row) => `- ${row.person_name} | ${row.politic_name} | ${row.activity_start}–${row.activity_end}`));

      output.dataset.type = failures === 0 ? "success" : "error";
      output.textContent = lines.join("\n");
    } catch (error) {
      output.dataset.type = "error";
      output.textContent = error.message;
    } finally {
      button.disabled = false;
      if (copyButton) copyButton.disabled = false;
    }
  }

  function replaceVerifier() {
    const oldButton = document.getElementById("verifyButton");
    if (!oldButton || oldButton.dataset.timelineVerifier === "true") return;

    const button = oldButton.cloneNode(true);
    button.dataset.timelineVerifier = "true";
    oldButton.replaceWith(button);

    const copyButton = document.createElement("button");
    copyButton.id = "verifyCopyButton";
    copyButton.className = "button secondary";
    copyButton.type = "button";
    copyButton.textContent = "결과 복사";
    copyButton.disabled = true;
    button.insertAdjacentElement("afterend", copyButton);

    button.addEventListener("click", () => verifyTimelineDatabase(button));
    copyButton.addEventListener("click", () => copyVerificationResult(copyButton));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", replaceVerifier, { once: true });
  else replaceVerifier();
})();
