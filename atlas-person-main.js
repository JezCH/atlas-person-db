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
    </button>`;
  }

  function groupSection({ title, description, rows, kind }) {
    return `<section class="person-group person-group-${escapeHtml(kind)}" aria-labelledby="person-group-${escapeHtml(kind)}-title">
      <header class="person-group-head"><div><p class="eyebrow">${kind === "historical" ? "HISTORICAL PERSONS" : "OTHER / UNCERTAIN HISTORICITY"}</p><h2 id="person-group-${escapeHtml(kind)}-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><strong>${rows.length}명</strong></header>
      <div class="person-card-grid">${rows.length ? rows.map(personCard).join("") : '<p class="person-empty-state">현재 조건에 해당하는 인물이 없습니다.</p>'}</div>
    </section>`;
  }

  function activeFacetCount() {
    return Object.values(facetFilters).filter(Boolean).length;
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
    summary.innerHTML = `<strong>${shown}명 표시</strong><span>전체 ${persons.length}명 · historicity 값 ${groups.observed_historicity_values.length}종${active ? ` · semantic filter ${active}개` : ""}</span>`;
    list.innerHTML = [
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
    return `<article class="person-activity-card">
      <header><div><span class="person-relation-badge">${escapeHtml(relation)}</span><h4>${escapeHtml(polity)}</h4><p>${escapeHtml(role)} · ${escapeHtml(basis)}</p></div></header>
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
    personView.innerHTML = `<section class="person-main-toolbar card"><div><p class="eyebrow">AUTHORITATIVE PERSON READ</p><h2>인물 목록</h2><p>역사성 분류와 연대 확실성을 분리해 표시합니다.</p></div><div class="person-main-controls"><input id="personMainSearch" type="search" autocomplete="off" placeholder="인물·정치체·관계·역할 검색" /><select id="personMainSort" aria-label="Person 정렬"><option value="start-asc">활동연도 ↑ 과거→현재</option><option value="start-desc">활동연도 ↓ 현재→과거</option></select><button id="personMainRefresh" class="btn" type="button">↻ 새로고침</button></div><div class="person-main-filters" role="group" aria-label="Activity semantic filters"><select id="personMainPolityFilter" aria-label="정치체 필터"><option value="">모든 정치체</option></select><select id="personMainRelationFilter" aria-label="관계 필터"><option value="">모든 관계</option></select><select id="personMainRoleFilter" aria-label="역할 필터"><option value="">모든 역할</option></select><select id="personMainBasisFilter" aria-label="기간 기준 필터"><option value="">모든 기간 기준</option></select><button id="personMainClearFilters" class="btn" type="button">필터 초기화</button></div><div id="personMainSummary" class="person-main-summary"></div><span id="personMainStatus" class="person-main-status">초기화</span></section>
      <div class="person-main-layout"><div id="personMainGroups" class="person-main-groups"></div><aside id="personMainDetail" class="person-main-detail card" aria-live="polite"><p class="person-detail-placeholder">왼쪽에서 인물을 선택하면 이름·설명·출처와 모든 Activity 의미를 확인할 수 있습니다.</p></aside></div>`;

    const authoringTools = document.createElement("details");
    authoringTools.id = "relationshipAuthoringTools";
    authoringTools.className = "relationship-authoring-tools";
    authoringTools.innerHTML = `<summary><span><b>관계 편집 도구</b><small>기존 Activity 행 등록·수정·엑셀 도구</small></span><span aria-hidden="true">＋</span></summary><div class="relationship-authoring-body"></div>`;
    const body = authoringTools.querySelector(".relationship-authoring-body");
    body.append(toolbar, legacyContent);

    topbar.insertAdjacentElement("afterend", personView);
    personView.insertAdjacentElement("afterend", authoringTools);

    const search = document.getElementById("personMainSearch");
    const sort = document.getElementById("personMainSort");
    const refresh = document.getElementById("personMainRefresh");
    const clearFilters = document.getElementById("personMainClearFilters");
    const groups = document.getElementById("personMainGroups");
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
    refresh?.addEventListener("click", () => loadPersons({ keepSelection: true }));
    groups?.addEventListener("click", (event) => {
      const card = event.target.closest("[data-person-id]");
      if (card) selectPerson(card.dataset.personId);
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
    safeHttpUrl
  });
})();
