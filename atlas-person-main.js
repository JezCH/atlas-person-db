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

  let persons = [];
  let facetCatalog = Object.freeze({ polities: [], relations: [], roles: [], period_bases: [] });
  let selectedPersonId = null;
  let query = "";
  let sortOrder = "start-asc";
  let facetFilters = { polity_id: "" };
  let requestSerial = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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
    return [boundary.granularity, boundary.certainty, boundary.calendar].filter((value) => value != null && String(value).trim());
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

  function compactActivityHtml(activity) {
    const polity = activity?.polity?.display_name || activity?.polity?.canonical_name_en || "정치체 미상";
    const relation = activity?.relation?.code || "relation 미상";
    const role = activity?.role?.display_name || activity?.role?.source_label || "역할 미지정";
    const basis = activity?.period_basis?.display_name || activity?.period_basis?.code || "기간 기준 미상";
    const semantic = [
      activity?.chronology_status ? `chronology: ${activity.chronology_status}` : null,
      activity?.confidence != null ? `confidence: ${activity.confidence}` : null
    ].filter(Boolean);
    return `<span class="person-card-activity" data-activity-id="${escapeHtml(activity?.id || "")}">
      <span class="person-card-activity-head"><b>${escapeHtml(polity)}</b><span class="person-relation-badge">${escapeHtml(relation)}</span></span>
      <span class="person-card-activity-role">${escapeHtml(role)} · ${escapeHtml(basis)}</span>
      <span class="person-card-activity-period">${escapeHtml(boundaryLabel(activity?.start))} – ${escapeHtml(boundaryLabel(activity?.end))}</span>
      ${semantic.length ? `<small>${semantic.map(escapeHtml).join(" · ")}</small>` : ""}
    </span>`;
  }

  function compactActivitiesHtml(person) {
    const activities = Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
    if (!activities.length) return '<span class="person-card-activities is-empty">등록된 Activity 없음</span>';
    return `<span class="person-card-activities">${activities.map(compactActivityHtml).join("")}</span>`;
  }

  function personCard(person) {
    const rawHistoricity = person?.historicity == null || String(person.historicity) === "" ? "historicity 미상" : String(person.historicity);
    const canonical = person?.canonical_name_en && person.canonical_name_en !== person.display_name
      ? `<small class="person-card-canonical">${escapeHtml(person.canonical_name_en)}</small>` : "";
    return `<button class="person-card${selectedPersonId === person.id ? " is-selected" : ""}" type="button" data-person-id="${escapeHtml(person.id)}">
      <span class="person-card-top"><span class="person-historicity">${escapeHtml(rawHistoricity)}</span><span>${escapeHtml(person.person_type || "type 미상")}</span></span>
      <strong>${escapeHtml(person.display_name || person.canonical_name_en || "이름 미상")}</strong>
      ${canonical}
      <span class="person-card-range">${escapeHtml(rangeLabel(person))}</span>
      <span class="person-card-count">Activity ${Number(person.activity_count || 0)}건</span>
      ${compactActivitiesHtml(person)}
    </button>`;
  }

  function groupSection({ title, description, rows, kind }) {
    return `<section class="person-group person-group-${escapeHtml(kind)}" aria-labelledby="person-group-${escapeHtml(kind)}-title">
      <header class="person-group-head"><div><p class="eyebrow">${kind === "historical" ? "HISTORICAL PERSONS" : "OTHER / UNCERTAIN HISTORICITY"}</p><h2 id="person-group-${escapeHtml(kind)}-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></header>
      <div class="person-card-grid">${rows.length ? rows.map(personCard).join("") : '<p class="person-empty-state">현재 조건에 해당하는 인물이 없습니다.</p>'}</div>
    </section>`;
  }

  function facetLabel(item) {
    return String(item?.display_name || item?.preferred_name_ko || item?.canonical_name_en || item?.source_label || item?.code || item?.id || "");
  }

  function polityOptions() {
    return (facetCatalog.polities || [])
      .map((item) => ({ id: String(item?.id || "").trim(), label: facetLabel(item) }))
      .filter((item) => item.id && item.label);
  }

  function polityFacetId(value) {
    if (value && typeof value === "object") return String(value.id || "").trim();
    return String(value || "").trim();
  }

  function visiblePolityCount(rows) {
    const ids = new Set();
    for (const person of rows) {
      for (const value of person?.facets?.polities || []) {
        const id = polityFacetId(value);
        if (id) ids.add(id);
      }
    }
    return ids.size;
  }

  function notifyPersonRender({ shown, polityCount }) {
    window.dispatchEvent(new CustomEvent("atlas-person-main-rendered", {
      detail: {
        visibleCount: shown,
        visiblePolityCount: polityCount,
        query,
        selectedPolityId: facetFilters.polity_id,
        polityOptions: polityOptions()
      }
    }));
  }

  function renderGroups() {
    const list = document.getElementById("personMainGroups");
    if (!list) return 0;
    const groups = reader.preparePersonGroups(persons, { query, sortOrder, facetFilters });
    const rows = [...groups.historical, ...groups.other_or_uncertain];
    const shown = rows.length;
    const renderedGroups = [
      groupSection({
        title: "역사 인물",
        description: "Person.historicity가 historical로 기록된 인물입니다. 활동연도가 미상이어도 역사성 분류는 유지됩니다.",
        rows: groups.historical,
        kind: "historical"
      }),
      groupSection({
        title: "전설·신화·역사성 미확정 및 기타",
        description: "historical 이외의 authoritative historicity 값을 별도 구역에 원문 그대로 표시합니다.",
        rows: groups.other_or_uncertain,
        kind: "other"
      })
    ].join("");
    for (const child of [...list.children]) {
      if (child.id !== "personEraNavigator") child.remove();
    }
    list.insertAdjacentHTML("beforeend", renderedGroups);
    notifyPersonRender({ shown, polityCount: visiblePolityCount(rows) });
    return shown;
  }

  function setSearchQuery(value) {
    const next = String(value ?? "");
    if (query === next) return false;
    query = next;
    renderGroups();
    return true;
  }

  function setPolityFilter(value) {
    const requested = String(value || "").trim();
    const valid = !requested || polityOptions().some((item) => item.id === requested);
    const next = valid ? requested : "";
    if (facetFilters.polity_id === next) return false;
    facetFilters = { polity_id: next };
    renderGroups();
    return true;
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
      <dl class="person-activity-dates">
        <div><dt>시작</dt><dd>${escapeHtml(boundaryLabel(activity.start))}${startMeta.length ? `<small>${startMeta.map(escapeHtml).join(" · ")}</small>` : ""}</dd></div>
        <div><dt>종료</dt><dd>${escapeHtml(boundaryLabel(activity.end))}${endMeta.length ? `<small>${endMeta.map(escapeHtml).join(" · ")}</small>` : ""}</dd></div>
      </dl>
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

  async function loadPersons({ keepSelection = true } = {}) {
    const groups = document.getElementById("personMainGroups");
    try {
      const result = await reader.listPersons();
      persons = result.persons.slice();
      facetCatalog = result.facet_catalog || reader.facetCatalog(persons);
      if (facetFilters.polity_id && !polityOptions().some((item) => item.id === facetFilters.polity_id)) {
        facetFilters = { polity_id: "" };
      }
      if (!keepSelection || !persons.some((person) => person.id === selectedPersonId)) selectedPersonId = null;
      renderGroups();
      if (selectedPersonId) await selectPerson(selectedPersonId, { force: true });
    } catch (error) {
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
    personView.innerHTML = `<section class="person-main-toolbar card"><div class="person-main-toolbar-heading"><p class="eyebrow">AUTHORITATIVE PERSON READ</p><h2>인물 목록</h2><p>역사성 분류와 연대 확실성을 분리해 표시합니다.</p></div><div class="person-main-actions" aria-label="Person 운영 도구"><button id="personMainAdd" class="btn btn-primary" type="button">+ 관계 추가</button><button id="personMainRefresh" class="btn" type="button">↻ 새로고침</button><div class="person-main-more"><button id="personMainMoreButton" class="btn" type="button" aria-controls="personMainMoreMenu" aria-expanded="false">⋯ 더보기</button><div id="personMainMoreMenu" class="person-main-more-menu" hidden><button type="button" data-person-main-action="export">엑셀 내보내기</button><button type="button" data-person-main-action="import">엑셀 불러오기</button><a href="./admin.html">관리자 페이지</a><button type="button" data-person-main-action="legacy-tools">전체 관계 편집표</button></div></div></div><div class="person-main-controls"><select id="personMainSort" aria-label="Person 정렬"><option value="start-asc">활동연도 ↑ 과거→현재</option><option value="start-desc">활동연도 ↓ 현재→과거</option></select></div></section>
      <div class="person-main-layout"><div id="personMainGroups" class="person-main-groups"></div><aside id="personMainDetail" class="person-main-detail card" aria-live="polite"><p class="person-detail-placeholder">왼쪽에서 인물을 선택하면 이름·설명·출처와 모든 Activity 의미를 확인할 수 있습니다.</p></aside></div>`;

    const authoringTools = document.createElement("details");
    authoringTools.id = "relationshipAuthoringTools";
    authoringTools.className = "relationship-authoring-tools";
    authoringTools.innerHTML = `<summary><span><b>전체 관계 편집표</b><small>기존 Activity 행 등록·수정·엑셀 도구의 전체 표</small></span><span aria-hidden="true">＋</span></summary><div class="relationship-authoring-body"></div>`;
    const body = authoringTools.querySelector(".relationship-authoring-body");
    body.append(toolbar, legacyContent);

    topbar.insertAdjacentElement("afterend", personView);
    personView.insertAdjacentElement("afterend", authoringTools);

    const sort = document.getElementById("personMainSort");
    const add = document.getElementById("personMainAdd");
    const refresh = document.getElementById("personMainRefresh");
    const moreButton = document.getElementById("personMainMoreButton");
    const moreMenu = document.getElementById("personMainMoreMenu");
    const groups = document.getElementById("personMainGroups");
    const detail = document.getElementById("personMainDetail");

    sort?.addEventListener("change", () => {
      sortOrder = sort.value === "start-desc" ? "start-desc" : "start-asc";
      renderGroups();
    });
    add?.addEventListener("click", openLegacyCreate);
    refresh?.addEventListener("click", () => loadPersons({ keepSelection: true }));
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
      const card = event.target.closest("[data-person-id]");
      if (card) selectPerson(card.dataset.personId);
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
    window.addEventListener("atlas-person-search-change", (event) => {
      setSearchQuery(event?.detail?.query);
    });
    window.addEventListener("atlas-person-polity-filter-change", (event) => {
      setPolityFilter(event?.detail?.polityId);
    });
  }

  installShell();
  loadPersons({ keepSelection: false });

  window.ATLAS_PERSON_MAIN = Object.freeze({
    loadPersons,
    selectPerson,
    renderGroups,
    setSearchQuery,
    getSearchQuery: () => query,
    setPolityFilter,
    getPolityFilter: () => facetFilters.polity_id,
    getPolityOptions: polityOptions,
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