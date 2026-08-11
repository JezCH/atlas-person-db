(() => {
  "use strict";

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "./atlas-admin-identity.css?v=20260811-maintenance-m1";
  document.head.appendChild(style);

  const endpoint = "/api/atlas-identity";
  const result = document.getElementById("identityResult");

  function value(id) {
    return String(document.getElementById(id)?.value || "").normalize("NFC").trim().replace(/\s+/g, " ");
  }

  function checked(id) {
    return document.getElementById(id)?.checked === true;
  }

  function setResult(message, type = "info") {
    if (!result) return;
    result.textContent = message;
    result.dataset.type = type;
  }

  async function submit(operation, payload, button) {
    if (button) button.disabled = true;
    setResult("저장 중...");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ operation, payload })
      });
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      if (!response.ok || body?.ok !== true || body?.outcome?.committed !== true) {
        throw new Error(body?.error || `identity mutation failed (${response.status})`);
      }
      const outcome = body.outcome;
      const key = outcome.canonical_key || outcome.code || "";
      setResult([
        `${outcome.entity} 저장 완료${outcome.replay ? " (동일 요청 재사용)" : ""}`,
        `UUID: ${outcome.id}`,
        key ? `Key: ${key}` : ""
      ].filter(Boolean).join("\n"), "success");
    } catch (error) {
      setResult(error.message || String(error), "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  document.getElementById("createPersonForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submit("create_person", {
      canonical_name_en: value("personCanonicalNameEn"),
      display_name_ko: value("personDisplayNameKo"),
      canonical_key: value("personCanonicalKey") || null,
      person_type: value("personType") || "historical",
      historicity: value("personHistoricity") || "historical",
      allow_display_name_collision: checked("personAllowKoCollision")
    }, event.submitter);
  });

  document.getElementById("createPolityForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submit("create_polity", {
      canonical_name_en: value("polityCanonicalNameEn"),
      display_name_ko: value("polityDisplayNameKo"),
      canonical_key: value("polityCanonicalKey") || null,
      polity_type: value("polityType") || "historical_polity",
      historicity: value("polityHistoricity") || "historical",
      allow_display_name_collision: checked("polityAllowKoCollision")
    }, event.submitter);
  });

  document.getElementById("createRoleForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    submit("create_role", {
      code: value("roleCode"),
      source_label: value("roleSourceLabel"),
      display_name_ko: value("roleDisplayNameKo"),
      category: value("roleCategory")
    }, event.submitter);
  });
})();
