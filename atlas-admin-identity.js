(() => {
  "use strict";

  const style = document.createElement("link");
  style.rel = "stylesheet";
  style.href = "./atlas-admin-identity.css?v=20260811-maintenance-m1";
  document.head.appendChild(style);

  const endpoint = "/api/atlas-identity";
  const authoringEndpoint = "/api/atlas-authoring";
  const result = document.getElementById("identityResult");
  const relationLabels = Object.freeze({
    rules: "통치",
    governs: "정부권한",
    serves: "공직/군직 복무",
    active_in: "해당 정치체에서 활동",
    opposes: "해당 정치체에 저항",
    claims_rule: "통치권 주장"
  });

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

  function calendarOptions() {
    return `<option value="unspecified_historical">unspecified_historical</option><option value="gregorian">gregorian</option><option value="julian">julian</option><option value="source_calendar">source_calendar</option>`;
  }

  function certaintyOptions() {
    return `<option value="exact">exact</option><option value="approximate">approximate</option><option value="uncertain">uncertain</option>`;
  }

  function insertHumanAuthoringPanel() {
    const identityTitle = document.getElementById("identity-title");
    const identityPanel = identityTitle?.closest(".panel");
    if (!identityPanel || document.getElementById("humanAuthoringForm")) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.setAttribute("aria-labelledby", "human-authoring-title");
    panel.innerHTML = `
      <div class="panel-head"><div><p class="status-label">NORMAL AUTHORING · STAGE 2 NATIVE</p><h2 id="human-authoring-title">일반 신규 인물 등록</h2><p>UUID나 JSON을 입력하지 않습니다. 기존 Person·Polity·Role·Source는 정확한 live identity가 있으면 재사용하고, 없으면 같은 트랜잭션 안에서 생성합니다. 신규 Person 또는 나무위키 미검토 Person만 나무위키 판정이 필요하며, 이미 검토된 기존 Person은 비워두면 서버가 기존 값을 재사용합니다.</p></div></div>
      <form id="humanAuthoringForm" class="identity-form">
        <div class="identity-two"><label>인물 영문명<input id="humanPersonEn" required /></label><label>인물 한국어명 <small>신규 Person 생성 시 필수</small><input id="humanPersonKo" /></label></div>
        <div class="identity-two"><label>정치체 영문명<input id="humanPolityEn" required /></label><label>정치체 한국어명 <small>신규 Polity 생성 시 필수</small><input id="humanPolityKo" /></label></div>
        <div class="identity-two"><label>관계<select id="humanRelation" required><option value="">불러오는 중...</option></select></label><label>Period basis<select id="humanPeriodBasis" required><option value="">불러오는 중...</option></select></label></div>
        <div class="identity-two"><label>Role 영문명 <small>역할이 없으면 비움</small><input id="humanRoleEn" placeholder="예: Sultan" /></label><label>Role 한국어명 <small>신규 Role 생성 시 필수</small><input id="humanRoleKo" placeholder="예: 술탄" /></label></div>
        <h3>나무위키 확인</h3>
        <div class="identity-two"><label>문서 확인 결과<select id="humanNamuWikiStatus"><option value="">기존 검토값 재사용 · 기존 Person만</option><option value="linked">문서 있음 · 링크 연결</option><option value="not_found">문서 없음</option></select></label><label>확인일<input id="humanNamuWikiCheckedAt" type="date" /></label></div>
        <div class="identity-two"><label>정확한 문서명 <small>문서 있음일 때 필수</small><input id="humanNamuWikiTitle" /></label><label>정확한 문서 URL <small>https://namu.wiki/w/...</small><input id="humanNamuWikiUrl" type="url" placeholder="https://namu.wiki/w/..." /></label></div>
        <p class="identity-help">새 Person이거나 기존 Person에 나무위키 검토값이 없으면 반드시 실제 검색 후 linked/not_found를 선택합니다. 이미 검토된 기존 Person은 첫 옵션 그대로 두면 재검사하지 않습니다.</p>
        <h3>활동 시작</h3>
        <div class="identity-two"><label>시작 연도<input id="humanStartYear" type="number" step="1" required /></label><label>시작 월 <small>선택</small><input id="humanStartMonth" type="number" min="1" max="12" step="1" /></label></div>
        <div class="identity-two"><label>시작 일 <small>선택 · 월 입력 필요</small><input id="humanStartDay" type="number" min="1" max="31" step="1" /></label><label>시작 확실성<select id="humanStartCertainty" required>${certaintyOptions()}</select></label></div>
        <label>시작 Calendar<select id="humanStartCalendar" required>${calendarOptions()}</select></label>
        <h3>활동 종료</h3>
        <div class="identity-two"><label>종료 연도<input id="humanEndYear" type="number" step="1" required /></label><label>종료 월 <small>선택</small><input id="humanEndMonth" type="number" min="1" max="12" step="1" /></label></div>
        <div class="identity-two"><label>종료 일 <small>선택 · 월 입력 필요</small><input id="humanEndDay" type="number" min="1" max="31" step="1" /></label><label>종료 확실성<select id="humanEndCertainty" required>${certaintyOptions()}</select></label></div>
        <label>종료 Calendar<select id="humanEndCalendar" required>${calendarOptions()}</select></label>
        <label>근거 신뢰도<select id="humanConfidence" required><option value="well_established">Well established</option><option value="likely">Likely</option><option value="speculative">Speculative</option><option value="disputed">Disputed</option><option value="unknown">Unknown</option></select></label>
        <label>출처 제목<input id="humanSourceTitle" required /></label><label>출처 URL <small>웹 출처일 때만 입력 · 같은 canonical URL은 기존 Source 자동 재사용</small><input id="humanSourceUrl" type="url" /></label><label>인용/Reference text <small>선택 · 입력 권장</small><input id="humanSourceCitation" /></label><label>활동 메모<textarea id="humanNotes" rows="3"></textarea></label>
        <button class="button primary" type="submit">Person + Activity + Source 한 번에 등록</button>
      </form><pre id="humanAuthoringResult" class="result" aria-live="polite">카탈로그를 불러오는 중...</pre>`;
    identityPanel.parentNode.insertBefore(panel, identityPanel);
  }

  function appendCatalogOptions(select, codes, labelForCode = (code) => code) {
    select.innerHTML = '<option value="">선택</option>';
    for (const code of codes) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = labelForCode(code);
      select.appendChild(option);
    }
  }

  async function loadHumanCatalogs() {
    const output = document.getElementById("humanAuthoringResult");
    const relationSelect = document.getElementById("humanRelation");
    const periodSelect = document.getElementById("humanPeriodBasis");
    if (!output || !relationSelect || !periodSelect) return;
    try {
      const response = await fetch(authoringEndpoint, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" }
      });
      const body = await response.json();
      if (!response.ok || body?.ok !== true || body?.ready !== true) {
        throw new Error(body?.code || `catalog load failed (${response.status})`);
      }
      const relationTypes = Array.isArray(body.catalogs?.relation_types) ? body.catalogs.relation_types : [];
      const periodBases = Array.isArray(body.catalogs?.period_bases) ? body.catalogs.period_bases : [];
      if (relationTypes.length === 0 || periodBases.length === 0) throw new Error("활성 Relation/Period Basis 카탈로그가 비어 있습니다.");
      appendCatalogOptions(relationSelect, relationTypes, (code) => relationLabels[code] ? `${code} · ${relationLabels[code]}` : code);
      appendCatalogOptions(periodSelect, periodBases);
      output.textContent = "일반 신규등록 준비됨";
      output.dataset.type = "success";
    } catch (error) {
      output.textContent = `카탈로그 로드 실패: ${error.message}`;
      output.dataset.type = "error";
    }
  }

  let humanRequestId = null;

  function requestId() {
    if (!humanRequestId) humanRequestId = `admin:${crypto.randomUUID()}`;
    return humanRequestId;
  }

  function optionalInteger(id) {
    const raw = value(id);
    return raw === "" ? null : Number(raw);
  }

  function boundary(prefix, label) {
    const year = Number(value(`human${prefix}Year`));
    const month = optionalInteger(`human${prefix}Month`);
    const day = optionalInteger(`human${prefix}Day`);
    if (!Number.isInteger(year) || year === 0) throw new Error(`${label} 연도는 0이 아닌 정수 역사연도여야 합니다.`);
    if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error(`${label} 월은 1~12여야 합니다.`);
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) throw new Error(`${label} 일은 1~31이어야 합니다.`);
    if (day !== null && month === null) throw new Error(`${label} 일을 입력하려면 월을 먼저 입력해야 합니다.`);
    return {
      [`${prefix.toLowerCase()}_year`]: year,
      [`${prefix.toLowerCase()}_month`]: month,
      [`${prefix.toLowerCase()}_day`]: day,
      [`${prefix.toLowerCase()}_certainty`]: value(`human${prefix}Certainty`),
      [`${prefix.toLowerCase()}_calendar`]: value(`human${prefix}Calendar`)
    };
  }

  function syncNamuWikiFields() {
    const status = value("humanNamuWikiStatus");
    const checkedAt = document.getElementById("humanNamuWikiCheckedAt");
    const title = document.getElementById("humanNamuWikiTitle");
    const url = document.getElementById("humanNamuWikiUrl");
    const linked = status === "linked";
    const reviewed = linked || status === "not_found";
    if (checkedAt) {
      checkedAt.disabled = !reviewed;
      checkedAt.required = reviewed;
      if (!reviewed) checkedAt.value = "";
    }
    for (const input of [title, url]) {
      if (!input) continue;
      input.disabled = !linked;
      input.required = linked;
      if (!linked) input.value = "";
    }
  }

  function namuwikiReference() {
    const status = value("humanNamuWikiStatus");
    if (!status) return null;
    const checkedAt = value("humanNamuWikiCheckedAt");
    if (status !== "linked" && status !== "not_found") throw new Error("나무위키 문서 확인 결과가 올바르지 않습니다.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) throw new Error("나무위키 확인일을 입력해야 합니다.");
    if (status === "not_found") return { status, checked_at:checkedAt };
    const documentTitle = value("humanNamuWikiTitle");
    const rawUrl = value("humanNamuWikiUrl");
    if (!documentTitle) throw new Error("나무위키 문서가 있으면 정확한 문서명을 입력해야 합니다.");
    let url;
    try { url = new URL(rawUrl); } catch { throw new Error("나무위키 문서 URL이 올바르지 않습니다."); }
    if (url.protocol !== "https:" || url.hostname !== "namu.wiki" || !url.pathname.startsWith("/w/") || url.pathname.length <= 3) {
      throw new Error("나무위키 문서 URL은 정확한 https://namu.wiki/w/... 주소여야 합니다.");
    }
    url.search = "";
    url.hash = "";
    return { status, checked_at:checkedAt, document_title:documentTitle, url:url.href };
  }

  function friendlyAuthoringError(code, fallback) {
    return ({
      HUMAN_AUTHORING_NEW_PERSON_KO_REQUIRED: "신규 Person 생성에는 한국어명이 필요합니다. 기존 Person 재사용이면 비워둘 수 있습니다.",
      HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED: "신규 Polity 생성에는 한국어명이 필요합니다. 기존 Polity 재사용이면 비워둘 수 있습니다.",
      HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED: "신규 Role 생성에는 한국어명이 필요합니다. 기존 Role 재사용이면 비워둘 수 있습니다.",
      HUMAN_AUTHORING_NAMUWIKI_REQUIRED: "신규 Person 또는 나무위키 미검토 Person은 나무위키 확인 결과가 필요합니다.",
      HUMAN_AUTHORING_NAMUWIKI_OVERWRITE_REVIEW_REQUIRED: "이미 연결된 나무위키 문서와 다른 값입니다. 자동 덮어쓰지 말고 별도 검토하세요.",
      HUMAN_AUTHORING_NAMUWIKI_STATUS_INVALID: "나무위키 결과는 문서 있음 또는 문서 없음이어야 합니다.",
      HUMAN_AUTHORING_NAMUWIKI_CHECKED_AT_INVALID: "나무위키 확인일이 올바르지 않습니다.",
      HUMAN_AUTHORING_NAMUWIKI_DOCUMENT_TITLE_REQUIRED: "나무위키 문서가 있으면 정확한 문서명이 필요합니다.",
      HUMAN_AUTHORING_NAMUWIKI_URL_INVALID: "나무위키 문서 URL이 올바르지 않습니다.",
      HUMAN_AUTHORING_SOURCE_CANONICAL_URL_AMBIGUOUS: "같은 Source URL이 여러 identity에 존재합니다. Source 중복 검토가 필요합니다."
    })[code] || fallback || code;
  }

  async function submitHumanAuthoring(event) {
    event.preventDefault();
    const button = event.submitter;
    const output = document.getElementById("humanAuthoringResult");
    if (button) button.disabled = true;
    if (output) {
      output.textContent = "Person · Polity · Role · Source · Activity를 저장 중입니다. 기존 나무위키 검토값과 Source URL은 가능한 경우 재사용합니다...";
      output.dataset.type = "info";
    }
    try {
      const sourceUrl = value("humanSourceUrl");
      const namuwiki = namuwikiReference();
      const payload = {
        schema: "atlas-human-authoring/v1",
        request_id: requestId(),
        person: { canonical_name_en: value("humanPersonEn"), display_name_ko: value("humanPersonKo") || null },
        polity: { canonical_name_en: value("humanPolityEn"), display_name_ko: value("humanPolityKo") || null },
        activity: {
          relation_type: value("humanRelation"),
          period_basis: value("humanPeriodBasis"),
          role: value("humanRoleEn") || null,
          role_display_name_ko: value("humanRoleKo") || null,
          ...boundary("Start", "시작"),
          ...boundary("End", "종료"),
          confidence: value("humanConfidence"),
          chronology_status: "reviewed",
          notes: value("humanNotes") || null
        },
        sources: [{
          source_type: sourceUrl ? "web_bibliographic_reference" : "bibliographic_reference",
          title: value("humanSourceTitle"),
          canonical_url: sourceUrl || null,
          citation_text: value("humanSourceCitation") || null
        }],
        external_references: namuwiki ? { namuwiki } : {}
      };
      const response = await fetch(authoringEndpoint, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload)
      });
      let body = null;
      try { body = await response.json(); } catch { body = null; }
      if (!response.ok || body?.ok !== true || body?.committed !== true) {
        const code = body?.code || null;
        throw new Error(friendlyAuthoringError(code, code || `authoring failed (${response.status})`));
      }
      if (output) {
        const savedNamuWiki = body.external_references?.namuwiki || null;
        output.textContent = [
          `등록 완료${body.replay ? " (동일 요청 재검증)" : ""}`,
          `Person UUID: ${body.person_id}`,
          `Polity UUID: ${body.polity_id}`,
          body.role_id ? `Role UUID: ${body.role_id}` : "Role: 없음",
          `Activity UUID: ${body.relationship_id}`,
          `Source UUID: ${(body.source_ids || []).join(", ")}`,
          savedNamuWiki?.status === "linked"
            ? `나무위키: 연결됨 — ${savedNamuWiki.document_title}`
            : savedNamuWiki?.status === "not_found"
              ? "나무위키: 문서 없음"
              : "나무위키: 기존 검토값 없음"
        ].join("\n");
        output.dataset.type = "success";
      }
      humanRequestId = null;
    } catch (error) {
      if (output) {
        output.textContent = error.message || String(error);
        output.dataset.type = "error";
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  insertHumanAuthoringPanel();
  document.getElementById("humanNamuWikiStatus")?.addEventListener("change", syncNamuWikiFields);
  syncNamuWikiFields();
  document.getElementById("humanAuthoringForm")?.addEventListener("submit", submitHumanAuthoring);
  loadHumanCatalogs();
})();