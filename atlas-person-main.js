(() => {
  "use strict";

  const reader = window.ATLAS_PERSON_BROWSER_READER;
  const mainArea = document.querySelector(".main-area");
  const toolbar = mainArea?.querySelector(":scope > .toolbar");
  const legacyContent = mainArea?.querySelector(":scope > .content-grid");
  const topbar = mainArea?.querySelector(":scope > .topbar");

  if (!reader || !mainArea || !toolbar || !legacyContent || !topbar) {
    console.error("ATLAS Person Main could not initialize required dependencies");
    return;
  }

  const RELATION_LABELS = Object.freeze({
    rules: "통치",
    governs: "통치",
    serves: "복무",
    active_in: "활동",
    opposes: "대립",
    claims_rule: "통치권 주장",
    "relation 미상": "관계 미확정"
  });
  const BASIS_LABELS = Object.freeze({
    reign: "재위",
    term: "임기",
    de_facto_rule: "실권 장악",
    military_activity: "군사 활동",
    religious_activity: "종교 활동",
    intellectual_activity: "학술 활동",
    artistic_activity: "예술 활동",
    general_activity: "주요 활동"
  });
  const CHRONOLOGY_LABELS = Object.freeze({
    exact_as_recorded: null,
    reviewed_stage2_traditional_disputed: "연대 논쟁 있음",
    disputed: "연대 논쟁 있음",
    approximate: "연대 근사",
    inferred: "연대 추정",
    unknown: "연대 미확정"
  });
  const CONFIDENCE_LABELS = Object.freeze({
    legacy_asserted: null,
    high: "신뢰도 높음",
    medium: "신뢰도 보통",
    low: "신뢰도 낮음",
    uncertain: "신뢰도 미확정"
  });

  let persons = [];
  let facetCatalog = Object.freeze({ polities: [], relations: [], roles: [], period_bases: [] });
  let selectedPersonId = null;
  let query = "";
  let sortOrder = "start-asc";
  let facetFilters = { polity_id: "", relation_type_id: "", role_id: "", period_basis_id: "" };
  let requestSerial = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function cleanCode(value) {
    return String(value || "").trim().replaceAll("_", " ");
  }

  function safeHttpUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw, window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function yearLabel(value) {
    if (!Number.isInteger(value)) return "연도 미상";
    if (value < 0) return `BC ${Math.abs(value)}`;
    if (value > 0) return `AD ${value}`;
    return "연도 0";
  }

  function rangeLabel(person) {
    const start = person?.first_activity_year;
    const end = person?.last_activity_year;
    if (!Number.isInteger(start) && !Number.isInteger(end)) return "주요 활동연도 미상";
    if (Number.isInteger(start) && Number.isInteger(end)) return `${yearLabel(start)} – ${yearLabel(end)}`;
    return Number.isInteger(start) ? `${yearLabel(start)} – 종료 미상` : `시작 미상 – ${yearLabel(end)}`;
  }

  function boundaryLabel(boundary) {
    if (!boundary || !Number.isInteger(boundary.year)) return "연도 미상";
    let label = yearLabel(boundary.year);
    if (Number.isInteger(boundary.month)) label += ` ${boundary.month}월`;
    if (Number.isInteger(boundary.day)) label += ` ${boundary.day}일`;
    return label;
  }

  function boundaryMeta(boundary) {
    if (!boundary) return [];
    return [boundary.granularity, boundary.certainty, boundary.calendar]
      .filter((value) => value != null && String(value).trim());
  }

  function normalizedRange(value) {
    return String(value || "").toUpperCase().replace(/[‐‑‒–—―]/g, "-").replace(/\s+/g, "").trim();
  }

  function sourceHtml(source) {
    const display = source?.display_reference || source?.citation_text || source?.title || source?.canonical_url || "출처";
    const url = safeHttpUrl(source?.canonical_url);
    const locator = source?.locator ? `<small>위치: ${escapeHtml(source.locator)}</small>` : "";
    const type = source?.source_type ? `<span class="person-source-type">${escapeHtml(source.source_type)}</span>` : "";
    return `<li class="person-source-item"><div>${type}${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(display)}</a>` : `<span>${escapeHtml(display)}</span>`}</div>${locator}</li>`;
  }

  function sourceListHtml(sources) {
    if (!Array.isArray(sources) || !sources.length) return '<p class="person-empty-inline">연결된 출처 없음</p>';
    return `<ul class="person-source-list">${sources.map(sourceHtml).join("")}</ul>`;
  }

  function exceptionalMetaHtml(activity) {
    const labels = [];
    const chronology = String(activity?.chronology_status || "").trim();
    const confidence = activity?.confidence == null ? "" : String(activity.confidence).trim();
    if (chronology) {
      const mapped = Object.prototype.hasOwnProperty.call(CHRONOLOGY_LABELS, chronology)
        ? CHRONOLOGY_LABELS[chronology]
        : `연대 상태: ${cleanCode(chronology)}`;
      if (mapped) labels.push(mapped);
    }
    if (confidence) {
      const mapped = Object.prototype.hasOwnProperty.call(CONFIDENCE_LABELS, confidence)
        ? CONFIDENCE_LABELS[confidence]
        : `신뢰도: ${cleanCode(confidence)}`;
      if (mapped) labels.push(mapped);
    }
    return labels.length ? `<small class="person-table-exception">${labels.map(escapeHtml).join(" · ")}</small>` : "";
  }

  function compactActivityHtml(activity, personRange, singleActivity) {
    const polity = activity?.polity?.display_name || activity?.polity?.canonical_name_en || "정치체 미상";
    const relationRaw = activity?.relation?.code || "relation 미상";
    const relation = RELATION_LABELS[relationRaw] ?? cleanCode(relationRaw);
    const role = activity?.role?.display_name || activity?.role?.source_label || "역할 미지정";
    const basisRaw = activity?.period_basis?.display_name || activity?.period_basis?.code || "기간 기준 미상";
    const basis = BASIS_LABELS[basisRaw] ?? cleanCode(basisRaw);
    const period = `${boundaryLabel(activity?.start)} – ${boundaryLabel(activity?.end)}`;
    const redundant = singleActivity && normalizedRange(period) === normalizedRange(personRange);
    return `<span class="person-card-activity" data-activity-id="${escapeHtml(activity?.id || "")}">
      <span class="person-card-activity-head"><b>${escapeHtml(polity)}</b><span class="person-relation-badge">${escapeHtml(relation)}</span></span>
      <span class="person-card-activity-role">${escapeHtml(role)} · ${escapeHtml(basis)}</span>
      <span class="person-card-activity-period${redundant ? " is-redundant" : ""}"${redundant ? ' aria-hidden="true"' : ""}>${redundant ? "" : escapeHtml(period)}</span>
      ${exceptionalMetaHtml(activity)}
    </span>`;
  }

  function compactActivitiesHtml(person) {
    const activities = Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
    if (!activities.length) return '<span class="person-card-activities person-table-activities is-empty">등록된 Activity 없음</span>';
    const personRange = rangeLabel(person);
    return `<span class="person-card-activities person-table-activities">${activities.map((activity) => compactActivityHtml(activity, personRange, activities.length === 1)).join("")}</span>`;
  }

  function exceptionalPersonStatusHtml(person) {
    const values = [];
    const historicity = person?.historicity == null || String(person.historicity).trim() === "" ? "historicity 미상" : String(person.historicity).trim();
    const personType = person?.person_type == null || String(person.person_type).trim() === "" ? "type 미상" : String(person.person_type).trim();
    if (historicity.toLowerCase() !== "historical") values.push(`<span class="person-historicity">${escapeHtml(historicity)}</span>`);
    if (personType.toLowerCase() !== "historical") values.push(`<span>${escapeHtml(personType)}</span>`);
    return values.length ? `<span class="person-card-top person-table-status-inline">${values.join("")}</span>` : "";
  }

  function personTableHeaderHtml() {
    return `<div class="person-table-head" aria-hidden="true">
      <span class="person-table-head-cell person-table-col-identity">인물</span>
      <span class="person-table-head-cell person-table-col-range">주요 활동기간</span>
      <span class="person-table-head-cell person-table-col-activities"><span class="person-table-head-title">활동 관계</span><span class="person-table-activity-subhead"><span>정치체 · 관계</span><span>역할 · 기간 기준</span><span>활동 기간</span></span></span>
      <span class="person-table-head-cell person-table-col-count">활동 수</span>
    </div>`;
  }

  function personTableRow(person) {
    const canonical = person?.canonical_name_en && person.canonical_name_en !== person.display_name
      ? `<small class="person-card-canonical">${escapeHtml(person.canonical_name_en)}</small>` : "";
    return `<button class="person-card person-table-row${selectedPersonId === person.id ? " is-selected" : ""}" type="button" data-person-id="${escapeHtml(person.id)}">
      <span class="person-table-identity"><strong>${escapeHtml(person.display_name || person.canonical_name_en || "이름 미상")}</strong>${canonical}${exceptionalPersonStatusHtml(person)}</span>
      <span class="person-card-range person-table-range">${escapeHtml(rangeLabel(person))}</span>
      ${compactActivitiesHtml(person)}
      <span class="person-card-count person-table-count">${Number(person.activity_count || 0)}건</span>
    </button>`;
  }

  function groupSection({ title, description, rows, kind }) {
    const body = rows.length ? rows.map(personTableRow).join("") : '<p class="person-empty-state">현재 조건에 해당하는 인물이 없습니다.</p>';
    return `<section class="person-group person-group-${escapeHtml(kind)}" aria-labelledby="person-group-${escapeHtml(kind)}-title">
      <header class="person-group-head"><div><p class="eyebrow">${kind === "historical" ? "HISTORICAL PERSONS" : "OTHER / UNCERTAIN HISTORICITY"}</p><h2 id="person-group-${escapeHtml(kind)}-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><strong>${rows.length}명</strong></header>
      <div class="person-card-grid person-table-grid">${personTableHeaderHtml()}${body}</div>
    </section>`;
  }

  function activeFacetCount() {
    return Object.values(facetFilters).filter(Boolean).length;
  }

  function updateFilterToggle() {
    const button = document.getElementById("personMainFilterToggle");
    if (!button) return;
    const active = activeFacetCount();
    button.textContent = active ? `필터 ${active}` : "필터";
    button.classList.toggle("has-active-filter", active > 0);
  }

  function notifyPersonRender(shown) {
    window.dispatchEvent(new CustomEvent("atlas-person-main-rendered", {
      detail: { visibleCount: shown, query, activeFacetCount: activeFacetCount() }
    }));
  }

  function renderGroups() {
    const list = document.getElementById("personMainGroups");
    const summary = document.getElementById("personMainSummary");
    if (!list || !summary) return 0;
    const groups = reader.preparePersonGroups(persons, { query, sortOrder, facetFilters });
    const shown = groups.historical.length + groups.other_or_uncertain.length;
    const active = activeFacetCount();
    summary.innerHTML = `<strong>${shown}명 표시</strong><span>전체 ${persons.length}명 · 역사성 분류 ${groups.observed_historicity_values.length}종${active ? ` · 적용된 필터 ${active}개` : ""}</span>`;
    list.innerHTML = [
      groupSection({
        title: "역사 인물",
        description: "역사 자료에서 실재 인물로 분류된 인물입니다. 활동연도가 미상이어도 역사성 분류는 유지됩니다.",
        rows: groups.historical,
        kind: "historical"
      }),
      groupSection({
        title: "전설·신화·역사성 미확정 및 기타",
        description: "전설·신화 또는 역사성 판정이 확정되지 않은 인물을 원래 분류값에 따라 별도로 표시합니다.",
        rows: groups.other_or_uncertain,
        kind: "other"
      })
    ].join("");
    updateFilterToggle();
    notifyPersonRender(shown);
    return shown;
  }

  function namesHtml(names) {
    if (!Array.isArray(names) || !names.length) return '<p class="person-empty-inline">등록된 이름 없음</p>';
    return `<div class="person-name-chips">${names.map((row) => `<span><b>${escapeHtml(row.name)}</b><small>${escapeHtml(row.locale || "")}${row.name_type ? ` · ${escapeHtml(row.name_type)}` : ""}${row.is_preferred ? " · preferred" : ""}</small></span>`).join("")}</div>`;
  }

  function descriptionsHtml(descriptions) {
    if (!Array.isArray(descriptions) || !descriptions.length) return '<p class="person-empty-inline">등록된 설명 없음</p>';
    return descriptions.map((row) => `<article class="person-description"><small>${escapeHtml(row.locale || "")}</small><p>${escapeHtml(row.content || "")}</p></article>`).join("");
  }

  function activityHtml(activity) {
    const role = activity.role?.display_name || activity.role?.source_label || "역할 미지정";
    const relation = activity.relation?.code || "relation 미상";
    const polity = activity.polity?.display_name || activity.polity?.canonical_name_en || "정치체 미상";
    const basis = activity.period_basis?.display_name || activity.period_basis?.code || "기간 기준 미상";
    const startMeta = boundaryMeta(activity.start);
    const endMeta = boundaryMeta(activity.end);
    const semanticMeta = [
      activity.relation?.category ? `relation category: ${activity.relation.category}` : null,
      activity.confidence != null ? `confidence: ${activity.confidence}` : null,
      activity.chronology_status ? `chronology: ${activity.chronology_status}` : null
    ].filter(Boolean);
    const activityId = escapeHtml(activity.id || "");
    return `<article class="person-activity-card" data-activity-id="${activityId}">
      <header><div><span class="person-relation-badge">${escapeHtml(relation)}</span><h4>${escapeHtml(polity)}</h4><p>${escapeHtml(role)} · ${escapeHtml(basis)}</p></div><div class="person-activity-actions"><button class="mini-btn edit" type="button" data-authoring-action="edit" data-activity-id="${activityId}">수정</button><button class="mini-btn danger delete" type="button" data-authoring-action="delete" data-activity-id="${activityId}">삭제</button></div></header>
      <dl class="person-activity-dates"><div><dt>시작</dt><dd>${escapeHtml(boundaryLabel(activity.start))}${startMeta.length ? `<small>${startMeta.map(escapeHtml).join(" · ")}</small>` : ""}</dd></div><div><dt>종료</dt><dd>${escapeHtml(boundaryLabel(activity.end))}${endMeta.length ? `<small>${endMeta.map(escapeHtml).join(" · ")}</small>` : ""}</dd></div></dl>
      ${semanticMeta.length ? `<p class="person-activity-meta">${semanticMeta.map(escapeHtml).join(" · ")}</p>` : ""}
      ${activity.notes ? `<p class="person-activity-notes">${escapeHtml(activity.notes)}</p>` : ""}
      <div class="person-activity-sources"><strong>Activity 출처</strong>${sourceListHtml(activity.sources)}</div>
    </article>`;
  }

  function renderDetail(person) {
    const panel = document.getElementById("personMainDetail");
    if (!panel) return;
    const rawHistoricity = person?.historicity == null || String(person.historicity) === "" ? "historicity 미상" : String(person.historicity);
    panel.innerHTML = `<div class="person-detail-head"><div><p class="eyebrow">PERSON DETAIL</p><h2>${escapeHtml(person.display_name || person.canonical_name_en || "이름 미상")}</h2><p><span class="person-historicity">${escapeHtml(rawHistoricity)}</span><span class="person-type-badge">${escapeHtml(person.person_type || "type 미상")}</span></p></div></div>
      <section class="person-detail-section"><h3>이름</h3>${namesHtml(person.names)}</section>
      <section class="person-detail-section"><h3>설명</h3>${descriptionsHtml(person.descriptions)}</section>
      <section class="person-detail-section"><h3>Person 출처</h3>${sourceListHtml(person.sources)}</section>
      <section class="person-detail-section"><div class="person-detail-section-head"><h3>활동 관계</h3><span>${Number(person.activity_count || 0)}건 · ${escapeHtml(rangeLabel(person))}</span></div><div class="person-activity-list">${Array.isArray(person.activities) && person.activities.length ? person.activities.map(activityHtml).join("") : '<p class="person-empty-inline">등록된 Activity 없음</p>'}</div></section>`;
  }

  function renderDetailLoading() {
    const panel = document.getElementById("personMainDetail");
    if (panel) panel.innerHTML = '<p class="person-detail-placeholder">Person 상세정보를 불러오는 중입니다.</p>';
  }

  function renderDetailError(error) {
    const panel = document.getElementById("personMainDetail");
    if (panel) panel.innerHTML = `<p class="person-detail-placeholder is-error">상세정보 조회 실패: ${escapeHtml(error?.code || error?.message || "unknown")}</p>`;
  }

  async function selectPerson(personId, { force = false } = {}) {
    if (!personId || (!force && selectedPersonId === personId)) return;
    selectedPersonId = personId;
    renderGroups();
    renderDetailLoading();
    const serial = ++requestSerial;
    try {
      const result = await reader.readPerson(personId);
      if (serial !== requestSerial || selectedPersonId !== personId) return;
      renderDetail(result.person);
    } catch (error) {
      if (serial !== requestSerial) return;
      renderDetailError(error);
    }
  }

  function facetLabel(item) {
    return String(item?.display_name || item?.preferred_name_ko || item?.canonical_name_en || item?.source_label || item?.code || item?.id || "");
  }

  function fillFacetSelect(id, items, allLabel, stateKey) {
    const select = document.getElementById(id);
    if (!select) return;
    const selected = facetFilters[stateKey] || "";
    select.replaceChildren();
    const all = document.createElement("option");
    all.value = "";
    all.textContent = allLabel;
    select.append(all);
    for (const item of items || []) {
      const option = document.createElement("option");
      option.value = String(item.id);
      option.textContent = facetLabel(item);
      select.append(option);
    }
    const stillValid = !selected || [...select.options].some((option) => option.value === selected);
    facetFilters[stateKey] = stillValid ? selected : "";
    select.value = facetFilters[stateKey];
  }

  function renderFacetControls() {
    fillFacetSelect("personMainPolityFilter", facetCatalog.polities, "모든 정치체", "polity_id");
    fillFacetSelect("personMainRelationFilter", facetCatalog.relations, "모든 관계", "relation_type_id");
    fillFacetSelect("personMainRoleFilter", facetCatalog.roles, "모든 역할", "role_id");
    fillFacetSelect("personMainBasisFilter", facetCatalog.period_bases, "모든 기간 기준", "period_basis_id");
    updateFilterToggle();
  }

  async function loadPersons({ keepSelection = true } = {}) {
    const status = document.getElementById("personMainStatus");
    const groups = document.getElementById("personMainGroups");
    if (status) {
      status.textContent = "Person 조회 중";
      status.dataset.state = "loading";
    }
    try {
      const result = await reader.listPersons();
      persons = result.persons.slice();
      facetCatalog = result.facet_catalog || reader.facetCatalog(persons);
      renderFacetControls();
      if (status) {
        status.textContent = `Person ${persons.length}명`;
        status.dataset.state = "ready";
      }
      if (!keepSelection || !persons.some((person) => person.id === selectedPersonId)) selectedPersonId = null;
      renderGroups();
      if (selectedPersonId) await selectPerson(selectedPersonId, { force: true });
    } catch (error) {
      if (status) {
        status.textContent = "Person 조회 실패";
        status.dataset.state = "error";
      }
      if (groups) groups.innerHTML = `<p class="person-empty-state is-error">Person 목록 조회 실패: ${escapeHtml(error?.code || error?.message || "unknown")}</p>`;
    }
  }

  function showOperationalMessage(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showOperationalMessage.timer);
    showOperationalMessage.timer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function legacyActivityButton(activityId, action) {
    return [...document.querySelectorAll(`#dataBody button.${action}[data-id]`)]
      .find((button) => String(button.dataset.id) === String(activityId)) || null;
  }

  function waitForLegacyActivityButton(activityId, action, timeoutMs = 4000) {
    const existing = legacyActivityButton(activityId, action);
    if (existing) return Promise.resolve(existing);
    const body = document.getElementById("dataBody");
    if (!body || typeof MutationObserver !== "function") return Promise.resolve(null);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(timer);
        resolve(value);
      };
      const observer = new MutationObserver(() => {
        const button = legacyActivityButton(activityId, action);
        if (button) finish(button);
      });
      const timer = setTimeout(() => finish(null), timeoutMs);
      observer.observe(body, { childList: true, subtree: true });
    });
  }

  function refreshAfterDialogClose() {
    const dialog = document.getElementById("editorDialog");
    dialog?.addEventListener("close", () => loadPersons({ keepSelection: true }), { once: true });
  }

  function refreshAfterLegacyRowsChange(timeoutMs = 15000) {
    const body = document.getElementById("dataBody");
    if (!body || typeof MutationObserver !== "function") return;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      observer.disconnect();
      clearTimeout(timer);
      loadPersons({ keepSelection: true });
    };
    const observer = new MutationObserver(finish);
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      observer.disconnect();
    }, timeoutMs);
    observer.observe(body, { childList: true, subtree: true });
  }

  function openLegacyCreate() {
    const button = document.getElementById("addButton");
    if (!button) return showOperationalMessage("관계 추가 도구를 찾지 못했습니다.");
    refreshAfterDialogClose();
    button.click();
  }

  async function invokeLegacyActivityAction(activityId, action) {
    if (!activityId || !["edit", "delete"].includes(action)) return;
    const button = await waitForLegacyActivityButton(activityId, action);
    if (!button) {
      openLegacyTools();
      showOperationalMessage("해당 Activity 편집 행을 찾지 못해 전체 관계 편집표를 열었습니다.");
      return;
    }
    if (action === "edit") refreshAfterDialogClose();
    if (action === "delete") refreshAfterLegacyRowsChange();
    button.click();
  }

  function exportLegacyExcel() {
    const button = document.getElementById("exportButton");
    if (!button) return showOperationalMessage("엑셀 내보내기 도구를 찾지 못했습니다.");
    button.click();
  }

  function importLegacyExcel() {
    const input = document.getElementById("importInput");
    if (!input) return showOperationalMessage("엑셀 불러오기 도구를 찾지 못했습니다.");
    refreshAfterLegacyRowsChange();
    input.click();
  }

  function openLegacyTools() {
    const tools = document.getElementById("relationshipAuthoringTools");
    if (!tools) return;
    tools.open = true;
    tools.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setMoreMenu(open) {
    const button = document.getElementById("personMainMoreButton");
    const menu = document.getElementById("personMainMoreMenu");
    if (!button || !menu) return;
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  function installShell() {
    const title = topbar.querySelector("h1");
    const eyebrow = topbar.querySelector(".eyebrow");
    const subtitle = topbar.querySelector(".subtitle");
    if (title) title.textContent = "Persons";
    if (eyebrow) eyebrow.textContent = "PERSON-CENTERED DATASET";
    if (subtitle) subtitle.textContent = "Person을 중심으로 역사성·이름·설명·활동·출처를 함께 조회합니다.";

    const personView = document.createElement("section");
    personView.id = "personMainView";
    personView.className = "person-main-view";
    personView.innerHTML = `<section class="person-main-toolbar card"><div class="person-main-toolbar-heading"><p class="eyebrow">AUTHORITATIVE PERSON READ</p><h2>인물 목록</h2><p>역사성 분류와 연대 확실성을 분리해 표시합니다.</p></div><div class="person-main-actions" aria-label="Person 운영 도구"><button id="personMainAdd" class="btn btn-primary" type="button">+ 관계 추가</button><button id="personMainRefresh" class="btn" type="button">↻ 새로고침</button><button id="personMainFilterToggle" class="btn person-main-filter-toggle" type="button" aria-controls="personMainFilters" aria-expanded="false">필터</button><div class="person-main-more"><button id="personMainMoreButton" class="btn" type="button" aria-controls="personMainMoreMenu" aria-expanded="false">⋯ 더보기</button><div id="personMainMoreMenu" class="person-main-more-menu" hidden><button type="button" data-person-main-action="export">엑셀 내보내기</button><button type="button" data-person-main-action="import">엑셀 불러오기</button><a href="./admin.html">관리자 페이지</a><button type="button" data-person-main-action="legacy-tools">전체 관계 편집표</button></div></div></div><div class="person-main-controls"><input id="personMainSearch" type="search" autocomplete="off" placeholder="인물·정치체·관계·역할·기간·비고 검색" /><select id="personMainSort" aria-label="Person 정렬"><option value="start-asc">활동연도 ↑ 과거→현재</option><option value="start-desc">활동연도 ↓ 현재→과거</option></select></div><div id="personMainFilters" class="person-main-filters" role="group" aria-label="Activity semantic filters"><select id="personMainPolityFilter" aria-label="정치체 필터"><option value="">모든 정치체</option></select><select id="personMainRelationFilter" aria-label="관계 필터"><option value="">모든 관계</option></select><select id="personMainRoleFilter" aria-label="역할 필터"><option value="">모든 역할</option></select><select id="personMainBasisFilter" aria-label="기간 기준 필터"><option value="">모든 기간 기준</option></select><button id="personMainClearFilters" class="btn" type="button">필터 초기화</button></div><div id="personMainSummary" class="person-main-summary"></div><span id="personMainStatus" class="person-main-status">초기화</span></section>
      <div class="person-main-layout"><div id="personMainGroups" class="person-main-groups"></div><aside id="personMainDetail" class="person-main-detail card" aria-live="polite"><p class="person-detail-placeholder">왼쪽에서 인물을 선택하면 이름·설명·출처와 모든 Activity 의미를 확인할 수 있습니다.</p></aside></div>`;

    const authoringTools = document.createElement("details");
    authoringTools.id = "relationshipAuthoringTools";
    authoringTools.className = "relationship-authoring-tools";
    authoringTools.innerHTML = `<summary><span><b>전체 관계 편집표</b><small>기존 Activity 행 등록·수정·엑셀 도구의 전체 표</small></span><span aria-hidden="true">＋</span></summary><div class="relationship-authoring-body"></div>`;
    authoringTools.querySelector(".relationship-authoring-body").append(toolbar, legacyContent);

    topbar.insertAdjacentElement("afterend", personView);
    personView.insertAdjacentElement("afterend", authoringTools);

    const search = document.getElementById("personMainSearch");
    const sort = document.getElementById("personMainSort");
    const add = document.getElementById("personMainAdd");
    const refresh = document.getElementById("personMainRefresh");
    const filterToggle = document.getElementById("personMainFilterToggle");
    const filters = document.getElementById("personMainFilters");
    const moreButton = document.getElementById("personMainMoreButton");
    const moreMenu = document.getElementById("personMainMoreMenu");
    const clearFilters = document.getElementById("personMainClearFilters");
    const groups = document.getElementById("personMainGroups");
    const detail = document.getElementById("personMainDetail");
    const facetBindings = [
      ["personMainPolityFilter", "polity_id"],
      ["personMainRelationFilter", "relation_type_id"],
      ["personMainRoleFilter", "role_id"],
      ["personMainBasisFilter", "period_basis_id"]
    ];

    search?.addEventListener("input", () => {
      query = search.value;
      renderGroups();
    });
    sort?.addEventListener("change", () => {
      sortOrder = sort.value === "start-desc" ? "start-desc" : "start-asc";
      renderGroups();
    });
    for (const [id, stateKey] of facetBindings) {
      document.getElementById(id)?.addEventListener("change", (event) => {
        facetFilters = { ...facetFilters, [stateKey]: event.currentTarget.value };
        renderGroups();
      });
    }
    clearFilters?.addEventListener("click", () => {
      facetFilters = { polity_id: "", relation_type_id: "", role_id: "", period_basis_id: "" };
      renderFacetControls();
      renderGroups();
    });
    add?.addEventListener("click", openLegacyCreate);
    refresh?.addEventListener("click", () => loadPersons({ keepSelection: true }));
    filterToggle?.addEventListener("click", () => {
      const open = !filters?.classList.contains("is-open");
      filters?.classList.toggle("is-open", open);
      filterToggle.setAttribute("aria-expanded", String(open));
    });
    moreButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      setMoreMenu(moreMenu?.hidden !== false);
    });
    moreMenu?.addEventListener("click", (event) => {
      const action = event.target.closest("[data-person-main-action]")?.dataset.personMainAction;
      if (!action) return;
      setMoreMenu(false);
      if (action === "export") exportLegacyExcel();
      if (action === "import") importLegacyExcel();
      if (action === "legacy-tools") openLegacyTools();
    });
    groups?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-person-id]");
      if (row) selectPerson(row.dataset.personId);
    });
    detail?.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-authoring-action][data-activity-id]");
      if (!actionButton) return;
      invokeLegacyActivityAction(actionButton.dataset.activityId, actionButton.dataset.authoringAction);
    });
    document.addEventListener("click", (event) => {
      if (moreMenu?.hidden !== false) return;
      if (!event.target.closest("#personMainMoreMenu") && !event.target.closest("#personMainMoreButton")) setMoreMenu(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMoreMenu(false);
    });
  }

  installShell();
  loadPersons({ keepSelection: false });

  window.ATLAS_PERSON_MAIN = Object.freeze({
    loadPersons,
    selectPerson,
    renderGroups,
    yearLabel,
    boundaryLabel,
    safeHttpUrl,
    openLegacyCreate,
    invokeLegacyActivityAction,
    exportLegacyExcel,
    importLegacyExcel,
    openLegacyTools
  });
})();
