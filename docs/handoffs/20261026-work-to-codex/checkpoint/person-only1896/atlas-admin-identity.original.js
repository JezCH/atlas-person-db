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

  const periodBasisLabels = Object.freeze({
    reign:"재위", term:"임기", de_facto_rule:"실권 장악",
    military_activity:"군사 활동", religious_activity:"종교 활동",
    intellectual_activity:"학술 활동", artistic_activity:"예술 활동",
    general_activity:"주요 활동"
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
        throw new Error(body?.error || `식별정보 저장 실패 (${response.status})`);
      }
      const outcome = body.outcome;
      const key = outcome.canonical_key || outcome.code || "";
      setResult([
        `${outcome.entity} 저장 완료${outcome.replay ? " (동일 요청 재사용)" : ""}`,
        `UUID: ${outcome.id}`,
        key ? `식별 키: ${key}` : ""
      ].filter(Boolean).join("\n"), "success");
    } catch (error) {
      setResult(error.message || String(error), "error");
    } finally {
      if (button) button.disabled = false;
    }
  }

  function sealRegistrationGatedIdentityForm(formId, message) {
    const form = document.getElementById(formId);
    if (!form) return;
    for (const control of form.querySelectorAll("input,select,textarea,button")) control.disabled = true;
    const notice = document.createElement("p");
    notice.className = "identity-help";
    notice.dataset.registrationGate = "true";
    notice.textContent = message;
    form.prepend(notice);
    form.addEventListener("submit", (event) => event.preventDefault());
  }

  sealRegistrationGatedIdentityForm(
    "createPersonForm",
    "인물 직접 생성 방식은 폐지되었습니다. 위의 ‘일반 신규 인물 등록’에서 출처·나무위키 검토·연대표 등록 여부·대표 분야를 함께 등록하세요."
  );
  sealRegistrationGatedIdentityForm(
    "createPolityForm",
    "정치체 직접 생성 방식은 폐지되었습니다. 정치체는 검증된 등록 절차 안에서만 생성할 수 있습니다."
  );

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
    return `<option value="unspecified_historical">역법 미특정</option><option value="gregorian">그레고리력</option><option value="julian">율리우스력</option><option value="source_calendar">출처 기록의 역법</option>`;
  }

  function certaintyOptions() {
    return `<option value="exact">정확</option><option value="approximate">근사</option><option value="uncertain">불확실</option>`;
  }

  function insertHumanAuthoringPanel() {
    const identityTitle = document.getElementById("identity-title");
    const identityPanel = identityTitle?.closest(".panel");
    if (!identityPanel || document.getElementById("humanAuthoringForm")) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.setAttribute("aria-labelledby", "human-authoring-title");
    panel.innerHTML = `
      <div class="panel-head"><div><p class="status-label">일반 등록 · 2단계 원본</p><h2 id="human-authoring-title">일반 신규 인물 등록</h2><p>UUID나 JSON을 입력하지 않습니다. 기존 인물·정치체·역할·출처는 정확히 일치하는 현재 식별정보가 있으면 재사용하고, 없으면 같은 트랜잭션 안에서 생성합니다. 신규 인물 또는 나무위키 미검토 인물만 나무위키 판정이 필요하며, 이미 검토된 기존 인물은 비워두면 서버가 기존 값을 재사용합니다.</p></div></div>
      <form id="humanAuthoringForm" class="identity-form">
        <div class="identity-two"><label>인물 영문명<input id="humanPersonEn" required /></label><label>인물 한국어명 <small>신규 인물 생성 시 필수</small><input id="humanPersonKo" /></label></div>
        <h3>생존 상태 검토</h3>
        <div class="identity-two"><label>생존 상태<select id="humanLifeStatus"><option value="">기존 인물 재사용 시 생략 가능</option><option value="deceased">사망 확인됨</option></select></label><label>검토일<input id="humanLifeStatusCheckedAt" type="date" /></label></div>
        <label>판정 근거<select id="humanLifeStatusBasis"><option value="">선택</option><option value="documented_death">문헌·공식 기록으로 사망 확인</option><option value="historical_certainty">역사적 연대상 사망이 확실</option></select></label>
        <p class="identity-help">새 인물은 반드시 사망 확인 판정이 있어야 합니다. 현재 생존자는 직책·분야와 무관하게 제외하며, 활동 종료연도·진행 중 여부·대표 활동연도는 생존 판정에 사용하지 않습니다.</p>
        <label>대표 분야 검토<select id="humanRepresentativeDomain"><option value="">기존 인물 재사용 시 생략 · 신규 인물은 반드시 검토</option></select></label>
        <p class="identity-help">대표 분야는 Activity Role에서 자동 추론하지 않습니다. 신규 인물은 8개 기준 분야 중 하나 또는 “검토했으나 미확정”을 명시해야 하며, 기존 인물 재사용 시 비워두면 기존 값을 변경하지 않습니다.</p>
        <div class="identity-two"><label>정치체 영문명<input id="humanPolityEn" required /></label><label>정치체 한국어명 <small>신규 정치체 생성 시 필수</small><input id="humanPolityKo" /></label></div>
        <h3>신규 정치체 공간 검토</h3>
        <div class="identity-two"><label>공간 배치 판정<select id="humanSpatialDispositionState"><option value="">기존 정치체 재사용 · 공간 검토 생략</option></select></label><label>검토 근거<input id="humanSpatialDispositionEvidence" disabled /></label></div>
        <p class="identity-help">새 정치체 생성이 필요한 경우에만 기준 공간 등록 상태와 근거를 선택합니다. 검토 후 보류는 정상적인 검토 완료 상태이며, 여기서 영토·지리 형상·경계·좌표를 만들지 않습니다.</p>
        <div class="identity-two"><label>관계<select id="humanRelation" required><option value="">불러오는 중...</option></select></label><label>기간 기준<select id="humanPeriodBasis" required><option value="">불러오는 중...</option></select></label></div>
        <div class="identity-two"><label>역할 영문명 <small>역할이 없으면 비움</small><input id="humanRoleEn" placeholder="예: Sultan" /></label><label>역할 한국어명 <small>신규 역할 생성 시 필수</small><input id="humanRoleKo" placeholder="예: 술탄" /></label></div>
        <h3>나무위키 확인</h3>
        <div class="identity-two"><label>문서 확인 결과<select id="humanNamuWikiStatus"><option value="">기존 검토값 재사용 · 기존 인물만</option><option value="linked">문서 있음 · 링크 연결</option><option value="not_found">문서 없음</option></select></label><label>확인일<input id="humanNamuWikiCheckedAt" type="date" /></label></div>
        <div class="identity-two"><label>정확한 문서명 <small>문서 있음일 때 필수</small><input id="humanNamuWikiTitle" /></label><label>정확한 문서 URL <small>https://namu.wiki/w/...</small><input id="humanNamuWikiUrl" type="url" placeholder="https://namu.wiki/w/..." /></label></div>
        <label>문서 없음 세부 사유 <small>문서 없음일 때 필수</small><select id="humanNamuWikiReviewReason" disabled><option value="">선택</option><option value="no_exact_document">독립 인물 문서·유의미한 관련 후보 모두 확인되지 않음</option><option value="related_or_derivative_only">관련·파생·문단·인접 문서만 확인됨</option></select></label>
        <p class="identity-help">새 Person이거나 기존 Person에 나무위키 검토값이 없으면 반드시 실제 검색 후 linked/not_found를 선택합니다. not_found는 검색 결과의 성격까지 세부 사유로 기록해야 완료됩니다. 이미 검토된 기존 인물은 첫 옵션 그대로 두면 재검사하지 않습니다.</p>
        <h3>활동 시작</h3>
        <div class="identity-two"><label>시작 연도 <small>비우면 경계 미상</small><input id="humanStartYear" type="number" step="1" /></label><label>시작 월 <small>연도 입력 시 선택</small><input id="humanStartMonth" type="number" min="1" max="12" step="1" /></label></div>
        <div class="identity-two"><label>시작 일 <small>선택 · 월 입력 필요</small><input id="humanStartDay" type="number" min="1" max="31" step="1" /></label><label>시작 확실성<select id="humanStartCertainty" required>${certaintyOptions()}</select></label></div>
        <label>시작 역법<select id="humanStartCalendar" required>${calendarOptions()}</select></label>
        <h3>활동 종료</h3>
        <div class="identity-two"><label>종료 연도 <small>비우면 경계 미상</small><input id="humanEndYear" type="number" step="1" /></label><label>종료 월 <small>연도 입력 시 선택</small><input id="humanEndMonth" type="number" min="1" max="12" step="1" /></label></div>
        <div class="identity-two"><label>종료 일 <small>선택 · 월 입력 필요</small><input id="humanEndDay" type="number" min="1" max="31" step="1" /></label><label>종료 확실성<select id="humanEndCertainty" required>${certaintyOptions()}</select></label></div>
        <label>종료 역법<select id="humanEndCalendar" required>${calendarOptions()}</select></label>
        <label>근거 신뢰도<select id="humanConfidence" required><option value="well_established">근거 확립</option><option value="likely">가능성 높음</option><option value="speculative">추정</option><option value="disputed">논쟁 있음</option><option value="unknown">미확정</option></select></label>
        <label>출처 제목<input id="humanSourceTitle" required /></label><label>출처 URL <small>웹 출처일 때만 입력 · 같은 기준 URL은 기존 출처 자동 재사용</small><input id="humanSourceUrl" type="url" /></label><label>인용·참조 문구 <small>선택 · 입력 권장</small><input id="humanSourceCitation" /></label><label>활동 메모<textarea id="humanNotes" rows="3"></textarea></label>
        <button class="button primary" type="submit">인물·활동·출처 한 번에 등록</button>
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

  function populateRepresentativeDomains(select, definitions, reviewedNullAllowed) {
    select.innerHTML = '<option value="">기존 인물 재사용 시 생략 · 신규 인물은 반드시 검토</option>';
    for (const item of definitions) {
      if (!item?.code) continue;
      const option = document.createElement("option");
      option.value = String(item.code);
      option.textContent = item.label_ko ? `${item.label_ko}` : String(item.code);
      select.appendChild(option);
    }
    if (reviewedNullAllowed) {
      const option = document.createElement("option");
      option.value = "__reviewed_null__";
      option.textContent = "검토했으나 미확정";
      select.appendChild(option);
    }
  }

  const spatialStateLabels = Object.freeze({
    existing_disposition:"기존 공간 검토 상태 확인",
    reviewed_static:"정적 지리 기준 검토 완료",
    reviewed_place_function:"정치체 장소 기능 기준 검토 완료",
    reviewed_hold:"검토 완료 · 위치 판단 보류"
  });

  function populateSpatialStates(select, states) {
    select.innerHTML = '<option value="">기존 정치체 재사용 · 공간 검토 생략</option>';
    for (const state of states) {
      const option = document.createElement("option");
      option.value = String(state);
      option.textContent = spatialStateLabels[state] ? `${spatialStateLabels[state]}` : String(state);
      select.appendChild(option);
    }
  }

  function syncSpatialDispositionFields() {
    const state = value("humanSpatialDispositionState");
    const evidence = document.getElementById("humanSpatialDispositionEvidence");
    if (!evidence) return;
    evidence.disabled = !state;
    evidence.required = Boolean(state);
    if (!state) evidence.value = "";
  }

  function representativeDomainReview() {
    const select = document.getElementById("humanRepresentativeDomain");
    const raw = value("humanRepresentativeDomain");
    if (!raw) return {};
    if (raw === "__reviewed_null__") return { representative_domain:null };
    const allowed = new Set([...select.options].map((option) => option.value).filter((code) => code && code !== "__reviewed_null__"));
    if (!allowed.has(raw)) throw new Error("대표 분야 값이 현재 기준 목록에 없습니다.");
    return { representative_domain:raw };
  }

  function spatialDispositionReview() {
    const select = document.getElementById("humanSpatialDispositionState");
    const state = value("humanSpatialDispositionState");
    if (!state) return null;
    const allowed = new Set([...select.options].map((option) => option.value).filter(Boolean));
    if (!allowed.has(state)) throw new Error("공간 배치 판정값이 현재 기준 목록에 없습니다.");
    const evidence = value("humanSpatialDispositionEvidence");
    if (!evidence) throw new Error("신규 정치체 공간 검토 근거를 입력해야 합니다.");
    return { state, evidence };
  }

  async function loadHumanCatalogs() {
    const output = document.getElementById("humanAuthoringResult");
    const relationSelect = document.getElementById("humanRelation");
    const periodSelect = document.getElementById("humanPeriodBasis");
    const domainSelect = document.getElementById("humanRepresentativeDomain");
    const spatialSelect = document.getElementById("humanSpatialDispositionState");
    if (!output || !relationSelect || !periodSelect || !domainSelect || !spatialSelect) return;
    try {
      const response = await fetch(authoringEndpoint, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" }
      });
      const body = await response.json();
      if (!response.ok || body?.ok !== true || body?.ready !== true) {
        throw new Error(body?.code || `카탈로그 조회 실패 (${response.status})`);
      }
      const relationTypes = Array.isArray(body.catalogs?.relation_types) ? body.catalogs.relation_types : [];
      const periodBases = Array.isArray(body.catalogs?.period_bases) ? body.catalogs.period_bases : [];
      const representativeDomains = Array.isArray(body.catalogs?.representative_domains) ? body.catalogs.representative_domains : [];
      const spatialStates = Array.isArray(body.catalogs?.spatial_registration_states) ? body.catalogs.spatial_registration_states : [];
      if (relationTypes.length === 0 || periodBases.length === 0 || representativeDomains.length === 0 || spatialStates.length === 0) {
        throw new Error("관계·기간 기준·분야·공간 배치 선택 목록이 비어 있습니다.");
      }
      appendCatalogOptions(relationSelect, relationTypes, (code) => relationLabels[code] ? `${relationLabels[code]}` : code);
      appendCatalogOptions(periodSelect, periodBases, (code) => periodBasisLabels[code] || code);
      populateRepresentativeDomains(domainSelect, representativeDomains, body.catalogs?.representative_domain_reviewed_null_allowed === true);
      populateSpatialStates(spatialSelect, spatialStates);
      syncSpatialDispositionFields();
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
    const yearText = value(`human${prefix}Year`);
    const month = optionalInteger(`human${prefix}Month`);
    const day = optionalInteger(`human${prefix}Day`);
    const key = prefix.toLowerCase();
    if (!yearText) {
      if (month !== null || day !== null) throw new Error(`${label} 연도가 미상이면 월·일도 비워야 합니다.`);
      return {
        [`${key}_year`]: null,
        [`${key}_month`]: null,
        [`${key}_day`]: null,
        [`${key}_certainty`]: null,
        [`${key}_calendar`]: null
      };
    }
    const year = Number(yearText);
    if (!Number.isInteger(year) || year === 0) throw new Error(`${label} 연도는 0이 아닌 정수 역사연도여야 합니다.`);
    if (month !== null && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error(`${label} 월은 1~12여야 합니다.`);
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) throw new Error(`${label} 일은 1~31이어야 합니다.`);
    if (day !== null && month === null) throw new Error(`${label} 일을 입력하려면 월을 먼저 입력해야 합니다.`);
    return {
      [`${key}_year`]: year,
      [`${key}_month`]: month,
      [`${key}_day`]: day,
      [`${key}_certainty`]: value(`human${prefix}Certainty`),
      [`${key}_calendar`]: value(`human${prefix}Calendar`)
    };
  }

  function syncNamuWikiFields() {
    const status = value("humanNamuWikiStatus");
    const checkedAt = document.getElementById("humanNamuWikiCheckedAt");
    const title = document.getElementById("humanNamuWikiTitle");
    const url = document.getElementById("humanNamuWikiUrl");
    const reviewReason = document.getElementById("humanNamuWikiReviewReason");
    const linked = status === "linked";
    const notFound = status === "not_found";
    const reviewed = linked || notFound;
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
    if (reviewReason) {
      reviewReason.disabled = !notFound;
      reviewReason.required = notFound;
      if (!notFound) reviewReason.value = "";
    }
  }

  function namuwikiReference() {
    const status = value("humanNamuWikiStatus");
    if (!status) return null;
    const checkedAt = value("humanNamuWikiCheckedAt");
    if (status !== "linked" && status !== "not_found") throw new Error("나무위키 문서 확인 결과가 올바르지 않습니다.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) throw new Error("나무위키 확인일을 입력해야 합니다.");
    if (status === "not_found") {
      const reviewReason = value("humanNamuWikiReviewReason");
      if (!["no_exact_document","related_or_derivative_only"].includes(reviewReason)) {
        throw new Error("나무위키 문서 없음의 세부 사유를 선택해야 합니다.");
      }
      return { status, checked_at:checkedAt, review_reason:reviewReason };
    }
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
      PERSON_LIVING_EXCLUDED: "현재 생존 인물은 ATLAS Person DB 등록 대상이 아닙니다.",
      PERSON_LIFE_STATUS_REVIEW_REQUIRED: "신규 Person 생성에는 사망 확인(deceased) 검토가 필요합니다.",
      PERSON_LIFE_STATUS_CHECKED_AT_INVALID: "생존 상태 검토일이 올바르지 않습니다.",
      PERSON_LIFE_STATUS_BASIS_INVALID: "생존 상태 판정 근거는 documented_death 또는 historical_certainty여야 합니다.",
      HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED: "신규 Polity 생성에는 한국어명이 필요합니다. 기존 정치체 재사용이면 비워둘 수 있습니다.",
      HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED: "신규 Role 생성에는 한국어명이 필요합니다. 기존 Role 재사용이면 비워둘 수 있습니다.",
      HUMAN_AUTHORING_NAMUWIKI_REQUIRED: "신규 인물 또는 나무위키 미검토 인물은 나무위키 확인 결과가 필요합니다.",
      HUMAN_AUTHORING_NAMUWIKI_OVERWRITE_REVIEW_REQUIRED: "이미 연결된 나무위키 문서와 다른 값입니다. 자동 덮어쓰지 말고 별도 검토하세요.",
      HUMAN_AUTHORING_NAMUWIKI_STATUS_INVALID: "나무위키 결과는 문서 있음 또는 문서 없음이어야 합니다.",
      HUMAN_AUTHORING_NAMUWIKI_CHECKED_AT_INVALID: "나무위키 확인일이 올바르지 않습니다.",
      HUMAN_AUTHORING_NAMUWIKI_DOCUMENT_TITLE_REQUIRED: "나무위키 문서가 있으면 정확한 문서명이 필요합니다.",
      HUMAN_AUTHORING_NAMUWIKI_URL_INVALID: "나무위키 문서 URL이 올바르지 않습니다.",
      HUMAN_AUTHORING_NAMUWIKI_REVIEW_REASON_REQUIRED: "나무위키 문서 없음 판정에는 세부 사유가 필요합니다.",
      HUMAN_AUTHORING_NAMUWIKI_REVIEW_REASON_INVALID: "나무위키 문서 없음 세부 사유는 no_exact_document 또는 related_or_derivative_only만 사용할 수 있습니다.",
      HUMAN_AUTHORING_SOURCE_CANONICAL_URL_AMBIGUOUS: "같은 Source URL이 여러 identity에 존재합니다. Source 중복 검토가 필요합니다.",
      HUMAN_AUTHORING_NEW_PERSON_DOMAIN_REVIEW_REQUIRED: "신규 Person은 대표 분야를 검토해야 합니다. 8개 분야 또는 ‘검토했으나 미확정’을 선택하세요.",
      PERSON_DOMAIN_VALUE_UNSUPPORTED: "대표 분야가 현재 canonical 8개 분야에 포함되지 않습니다.",
      HUMAN_AUTHORING_SPATIAL_DISPOSITION_REQUIRED: "신규 Polity 생성에는 공간 검토 상태가 필요합니다. 기존 정치체 재사용이면 비워두세요.",
      HUMAN_AUTHORING_SPATIAL_DISPOSITION_INVALID: "공간 검토 상태가 현재 canonical registration contract에 포함되지 않습니다.",
      HUMAN_AUTHORING_SPATIAL_DISPOSITION_EVIDENCE_REQUIRED: "신규 정치체 공간 검토에는 근거가 필요합니다."
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
      const spatialDisposition = spatialDispositionReview();
      const payload = {
        schema: "atlas-human-authoring/v1",
        request_id: requestId(),
        person: {
          canonical_name_en: value("humanPersonEn"),
          display_name_ko: value("humanPersonKo") || null,
          life_status: value("humanLifeStatus") || null,
          life_status_checked_at: value("humanLifeStatusCheckedAt") || null,
          life_status_basis: value("humanLifeStatusBasis") || null,
          ...representativeDomainReview()
        },
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
        external_references: namuwiki ? { namuwiki } : {},
        ...(spatialDisposition ? { spatial_disposition:spatialDisposition } : {})
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
              ? `나무위키: 문서 없음 — ${savedNamuWiki.review_reason || "세부 사유 미기록"}`
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
  document.getElementById("humanSpatialDispositionState")?.addEventListener("change", syncSpatialDispositionFields);
  syncNamuWikiFields();
  syncSpatialDispositionFields();
  document.getElementById("humanAuthoringForm")?.addEventListener("submit", submitHumanAuthoring);
  loadHumanCatalogs();
})();