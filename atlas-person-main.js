(() => {
  "use strict";

  const reader = window.ATLAS_PERSON_BROWSER_READER;
  const dataStore = window.ATLAS_CLIENT_DATA_STORE;
  const domainRegistry = window.ATLAS_PERSON_DOMAIN_REGISTRY;
  const externalReferences = window.ATLAS_PERSON_EXTERNAL_REFERENCES;
  const portraitView = window.ATLAS_PERSON_PORTRAIT_VIEW;
  const profileWriter = window.ATLAS_SERVER_WRITE_ADAPTER?.createAdapter?.() || null;
  const mainArea = document.querySelector(".main-area");
  const topbar = mainArea?.querySelector(":scope > .topbar");

  if (!reader || !dataStore || !portraitView?.createRenderer || !portraitControllerFactory?.createController || !mainArea || !topbar) {
    console.error("ATLAS Person Main could not initialize required dependencies");
    return;
  }

  let persons = [];
  let unknownChronologyRegistry = [];
  let facetCatalog = Object.freeze({ polities: [], relations: [], roles: [], period_bases: [] });
  let selectedPersonId = null;
  let query = "";
  let sortOrder = "start-asc";
  let facetFilters = { polity_id: "", relation_type_id: "", domain: "" };
  let personDomainsById = Object.freeze({});
  let dashboardFilter = null;
  let requestSerial = 0;
  let selectedPersonDetail = null;
  let selectedPortrait = null;
  let selectedPortraitSourceCandidates = null;
  const PERSON_PORTRAIT_IMAGE_SCRIPT_URL = "./atlas-person-portrait-image.js?v=20260922-image-pipeline-v1";
  const PERSON_EXCEL_EXPORT_SCRIPT_URL = "./atlas-person-excel-export.js?v=20260922-feature-split-v1";
  let personPortraitImageModulePromise = null;
  let personExcelExportModulePromise = null;
  let excelExportInFlight = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const portraitRenderer = portraitView.createRenderer({ escapeHtml });
  const portraitController = portraitControllerFactory.createController({
    writer:profileWriter,
    getSelectedPersonId:() => selectedPersonId,
    getSelectedPortrait:() => selectedPortrait,
    outcomeError
  });

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

  function externalLinksHtml(person) {
    const links = externalReferences?.linksForPerson?.(person) || [];
    const safeLinks = links
      .map((link) => ({ ...link, href: safeHttpUrl(link?.url) }))
      .filter((link) => link.href);
    if (!safeLinks.length) return "";
    return `<span class="person-external-links">${safeLinks.map((link) =>
      `<a class="person-external-link" href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer" data-provider="${escapeHtml(link.provider || "external")}">${escapeHtml(link.label || link.provider || "외부 링크")} ↗</a>`
    ).join("")}</span>`;
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
    if (person?.activity_summaries?.some(a => a.end?.status === "ongoing")) return `${yearLabel(start)} – 현재`;
    if (!Number.isInteger(start) && !Number.isInteger(end)) return "주요 활동연도 미상";
    if (Number.isInteger(start) && Number.isInteger(end)) return `${yearLabel(start)} – ${yearLabel(end)}`;
    return Number.isInteger(start) ? `${yearLabel(start)} – 종료 미상` : `시작 미상 – ${yearLabel(end)}`;
  }

  function boundaryLabel(boundary) {
    if (boundary?.status === "ongoing") return `현재 (${boundary.as_of || "확인일 미상"} 확인)`;
    if (!boundary || !Number.isInteger(boundary.year)) return "연도 미상";
    let label = yearLabel(boundary.year);
    if (Number.isInteger(boundary.month)) label += ` ${boundary.month}월`;
    if (Number.isInteger(boundary.day)) label += ` ${boundary.day}일`;
    if (boundary.certainty === "approximate") return `약 ${label}`;
    if (boundary.certainty === "uncertain") return `${label}?`;
    return label;
  }

  function normalizeRegistryText(value) {
    return String(value ?? "").trim().toLocaleLowerCase("ko");
  }

  function personIdentityKeys(person) {
    const names = Array.isArray(person?.names) ? person.names.map((row) => row?.name) : [];
    return [person?.display_name, person?.canonical_name_en, person?.preferred_name_ko, ...names]
      .map(normalizeRegistryText)
      .filter(Boolean);
  }

  function registryIdentityKeys(row) {
    return [row?.person_name, row?.display_name_ko]
      .map(normalizeRegistryText)
      .filter(Boolean);
  }

  function registrySearchText(row) {
    return [
      row?.person_name,
      row?.display_name_ko,
      row?.politic_name,
      row?.politic_display_name_ko,
      row?.role_ko,
      row?.historicity,
      row?.historicity_display_ko
    ].map((value) => String(value ?? "")).join("\n").toLocaleLowerCase("ko");
  }

  function registryPerson(row) {
    const displayName = row?.display_name_ko || row?.person_name || "이름 미상";
    const polity = row?.politic_display_name_ko || row?.politic_name || "정치체 미상";
    const role = row?.role_ko || row?.historicity_display_ko || "역할 미상";
    return {
      id: null,
      registry_only: true,
      person_type: "연대 미상 등록",
      historicity: row?.historicity || "uncertain",
      historicity_display_ko: row?.historicity_display_ko || null,
      display_name: displayName,
      canonical_name_en: row?.person_name || displayName,
      preferred_name_ko: row?.display_name_ko || null,
      names: [],
      first_activity_year: null,
      last_activity_year: null,
      activity_count: 0,
      activity_summaries: [{
        id: "",
        registry_only: true,
        polity: { display_name: polity, canonical_name_en: row?.politic_name || polity },
        relation: { code: "연대 미상" },
        role: { display_name: role },
        period_basis: { display_name: "개인 활동연대 미상" },
        start: null,
        end: null
      }],
      facets: { polities: [], relations: [], roles: [], period_bases: [] }
    };
  }

  function unknownRegistryRowForPerson(person) {
    const keys = new Set(personIdentityKeys(person));
    if (!keys.size) return null;
    return unknownChronologyRegistry.find((row) => registryIdentityKeys(row).some((key) => keys.has(key))) || null;
  }

  function withUnknownRegistryContext(person) {
    if (!person || String(person.historicity || "") === "historical") return person;
    if (Array.isArray(person.activity_summaries) && person.activity_summaries.length) return person;
    const row = unknownRegistryRowForPerson(person);
    if (!row) return person;
    const context = registryPerson(row).activity_summaries[0];
    return {
      ...person,
      historicity_display_ko: row.historicity_display_ko || person.historicity_display_ko || null,
      activity_summaries: [{ ...context, registry_context_for_first_class: true }]
    };
  }

  function visibleUnknownRegistryPersons({ ignoreDomain = false } = {}) {
    if (dashboardFilter) return [];
    if (facetFilters.polity_id || facetFilters.relation_type_id) return [];
    if (facetFilters.domain && !ignoreDomain) return [];
    const firstClassNames = new Set(persons.flatMap(personIdentityKeys));
    const needle = normalizeRegistryText(query);
    return unknownChronologyRegistry
      .filter((row) => !registryIdentityKeys(row).some((key) => firstClassNames.has(key)))
      .filter((row) => !needle || registrySearchText(row).includes(needle))
      .map(registryPerson);
  }

  function boundaryMeta(boundary) {
    if (!boundary) return [];
    return [boundary.granularity, boundary.calendar].filter((value) => value != null && String(value).trim());
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
    const polityHead = `<span class="person-card-activity-head"><b>${escapeHtml(polity)}</b><span class="person-relation-badge">${escapeHtml(relation)}</span></span>`;
    return `<span class="person-card-activity" data-activity-id="${escapeHtml(activity?.id || "")}">
      ${polityHead}
      <span class="person-card-activity-role">${escapeHtml(role)} · ${escapeHtml(basis)}</span>
      <span class="person-card-activity-period">${escapeHtml(boundaryLabel(activity?.start))} – ${escapeHtml(boundaryLabel(activity?.end))}</span>
    </span>`;
  }

  function compactActivitiesHtml(person) {
    const activities = Array.isArray(person?.activity_summaries) ? person.activity_summaries : [];
    if (!activities.length) return '<span class="person-card-activities is-empty">등록된 Activity 없음</span>';
    return `<span class="person-card-activities">${activities.map(compactActivityHtml).join("")}</span>`;
  }

  function personCard(person) {
    const rawHistoricity = person?.historicity_display_ko
      || (person?.historicity == null || String(person.historicity) === "" ? "historicity 미상" : String(person.historicity));
    const canonical = person?.canonical_name_en && person.canonical_name_en !== person.display_name
      ? `<small class="person-card-canonical">${escapeHtml(person.canonical_name_en)}</small>` : "";
    const selectedClass = !person?.registry_only && selectedPersonId === person.id ? " is-selected" : "";
    const open = person?.registry_only
      ? `<div class="person-card${selectedClass}" data-unknown-chronology-registry="true">`
      : `<button class="person-card${selectedClass}" type="button" data-person-id="${escapeHtml(person.id)}">`;
    const close = person?.registry_only ? "</div>" : "</button>";
    return `${open}
      <span class="person-card-top"><span class="person-historicity">${escapeHtml(rawHistoricity)}</span><span>${escapeHtml(person.person_type || "type 미상")}</span></span>
      <strong>${escapeHtml(person.display_name || person.canonical_name_en || "이름 미상")}</strong>
      ${canonical}
      <span class="person-card-range">${escapeHtml(rangeLabel(person))}</span>
      <span class="person-card-count">Activity ${Number(person.activity_count || 0)}건</span>
      ${compactActivitiesHtml(person)}
    ${close}`;
  }

  function groupSection({ title, description, rows }) {
    return `<section class="person-group person-group-historical" aria-labelledby="person-group-historical-title">
      <header class="person-group-head"><div><p class="eyebrow">PERSONS</p><h2 id="person-group-historical-title">${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div></header>
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

  const RELATION_FILTER_LABELS = Object.freeze({
    rules:"통치", governs:"통치", serves:"복무", active_in:"활동",
    opposes:"대립", claims_rule:"통치권 주장"
  });

  function relationOptions() {
    return (facetCatalog.relations || [])
      .map((item) => {
        const id = String(item?.id || "").trim();
        const code = String(item?.code || item?.source_label || "").trim();
        const label = RELATION_FILTER_LABELS[code] || facetLabel(item);
        return { id, label };
      })
      .filter((item) => item.id && item.label);
  }

  function dashboardMatches(person) {
    return !dashboardFilter || dashboardFilter.ids.has(String(person?.id || ""));
  }

  function domainMatches(person) {
    const selected = String(facetFilters.domain || "").trim();
    if (!selected) return true;
    return String(personDomainsById?.[person?.id] || "") === selected;
  }

  function secondaryMatches(person) {
    return dashboardMatches(person) && domainMatches(person);
  }

  function domainFilterCounts() {
    const baseFilters = {
      polity_id: facetFilters.polity_id,
      relation_type_id: facetFilters.relation_type_id
    };
    const groups = reader.preparePersonGroups(persons, {
      query,
      sortOrder,
      facetFilters: baseFilters,
      secondaryPredicate: dashboardMatches
    });
    const baseRows = [...groups.historical, ...groups.other_or_uncertain];
    const counts = { all: baseRows.length + visibleUnknownRegistryPersons({ ignoreDomain:true }).length };
    const definitions = Array.isArray(domainRegistry?.DEFINITIONS) ? domainRegistry.DEFINITIONS : [];
    for (const item of definitions) counts[item.code] = 0;
    for (const person of baseRows) {
      const code = String(personDomainsById?.[person?.id] || "");
      if (Object.prototype.hasOwnProperty.call(counts, code)) counts[code] += 1;
    }
    return counts;
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
        polityOptions: polityOptions(),
        selectedRelationId: facetFilters.relation_type_id,
        relationOptions: relationOptions(),
        selectedDomain: facetFilters.domain,
        domainCounts: domainFilterCounts()
      }
    }));
  }

  function renderGroups() {
    const list = document.getElementById("personMainGroups");
    if (!list) return 0;
    const groups = reader.preparePersonGroups(persons, {
      query,
      sortOrder,
      facetFilters: { polity_id: facetFilters.polity_id, relation_type_id: facetFilters.relation_type_id },
      secondaryPredicate: secondaryMatches
    });
    const rows = [
      ...groups.historical,
      ...groups.other_or_uncertain.map(withUnknownRegistryContext),
      ...visibleUnknownRegistryPersons()
    ].sort((left, right) => reader.comparePersons(left, right, sortOrder));
    const shown = rows.length;
    const renderedGroups = groupSection({
      title: "인물",
      description: "연대가 있는 인물은 시대별로, 개인 활동연대를 방어할 수 없는 인물은 모두 ‘전설, 신화, 연대미상’에 함께 표시합니다. 역사성 분류는 별도 값으로 유지됩니다.",
      rows
    });
    for (const child of [...list.children]) {
      if (child.id !== "personEraNavigator") child.remove();
    }
    if (dashboardFilter) {
      list.insertAdjacentHTML("beforeend", `<div class="person-dashboard-filter"><strong>Dashboard · ${escapeHtml(dashboardFilter.label)}</strong><span>${dashboardFilter.ids.size.toLocaleString("ko-KR")}명</span><button type="button" class="mini-btn" data-person-dashboard-filter-clear>필터 해제</button></div>`);
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
    facetFilters = { ...facetFilters, polity_id: next };
    renderGroups();
    return true;
  }

  function setRelationFilter(value) {
    const requested = String(value || "").trim();
    const valid = !requested || relationOptions().some((item) => item.id === requested);
    const next = valid ? requested : "";
    if (facetFilters.relation_type_id === next) return false;
    facetFilters = { ...facetFilters, relation_type_id: next };
    renderGroups();
    return true;
  }

  function setDomainFilter(value) {
    const requested = String(value || "").trim();
    const validCodes = Array.isArray(domainRegistry?.CODES) ? domainRegistry.CODES : [];
    const next = !requested || validCodes.includes(requested) ? requested : "";
    if (facetFilters.domain === next) return false;
    facetFilters = { ...facetFilters, domain: next };
    renderGroups();
    return true;
  }

  function setDashboardFilter({ code = "", label = "", personIds = [] } = {}) {
    const ids = [...new Set((Array.isArray(personIds) ? personIds : []).map((id) => String(id || "").trim()).filter(Boolean))];
    if (!ids.length) return clearDashboardFilter();
    dashboardFilter = Object.freeze({
      code:String(code || "").trim(),
      label:String(label || code || "Attention Queue").trim(),
      ids:new Set(ids)
    });
    query = "";
    facetFilters = { polity_id:"", relation_type_id:"", domain:"" };
    renderGroups();
    return true;
  }

  function clearDashboardFilter() {
    if (!dashboardFilter) return false;
    dashboardFilter = null;
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

  function portraitEditorHtml(person, portraitResult = null) {
    return portraitRenderer.portraitEditorHtml(person, portraitResult, {
      sourceCandidates:selectedPortraitSourceCandidates
    });
  }

  function profileEditorHtml(person, portraitResult = null) {
    const personId = escapeHtml(person?.id || "");
    const koreanName = escapeHtml(person?.preferred_name_ko || "");
    const namuwiki = person?.external_references?.namuwiki;
    const namuwikiValue = namuwiki?.status === "linked" ? escapeHtml(namuwiki.url || "") : "";
    const namuwikiState = namuwiki?.status === "linked"
      ? `현재 연결: ${escapeHtml(namuwiki.document_title || namuwiki.url || "나무위키")}`
      : namuwiki?.status === "not_found" ? "현재 연결된 나무위키 문서 없음" : "미등록";
    return `<section class="person-detail-section person-profile-editor"><div class="person-detail-section-head"><h3>표시 정보 수정</h3><span>Person 전체 화면에 공통 반영</span></div>
      <form class="person-profile-form" data-person-profile-operation="set_person_korean_name" data-person-id="${personId}">
        <label><span>한국어 이름</span><input type="text" name="korean_name" value="${koreanName}" maxlength="160" autocomplete="off" placeholder="한국어 표시 이름" required></label>
        <button class="mini-btn edit" type="submit">이름 저장</button>
      </form>
      <form class="person-profile-form" data-person-profile-operation="set_person_external_reference" data-person-id="${personId}">
        <label><span>나무위키 문서</span><input type="text" name="namuwiki_reference" value="${namuwikiValue}" autocomplete="off" inputmode="url" placeholder="https://namu.wiki/w/... 또는 문서명" required></label>
        <button class="mini-btn edit" type="submit">등록</button>
      </form>
      <p class="person-profile-help">${namuwikiState} · 저장 시 관리자 인증 후 authoritative Person 데이터에 기록됩니다.</p>
      ${portraitEditorHtml(person, portraitResult)}
    </section>`;
  }

  function activityHtml(activity) {
    const role = activity.role?.display_name || activity.role?.source_label || "역할 미지정";
    const relation = activity.relation?.code || "relation 미상";
    const polity = activity.polity?.display_name || activity.polity?.canonical_name_en || "정치체 미상";
    const basis = activity.period_basis?.display_name || activity.period_basis?.code || "기간 기준 미상";
    const startMeta = boundaryMeta(activity.start);
    const endMeta = boundaryMeta(activity.end);
    const semanticMeta = [
      activity.relation?.category ? `relation category: ${activity.relation.category}` : null
    ].filter(Boolean);
    const activityId = escapeHtml(activity.id || "");
    return `<article class="person-activity-card" data-activity-id="${activityId}">
      <header><div><span class="person-relation-badge">${escapeHtml(relation)}</span><h4>${escapeHtml(polity)}</h4><p>${escapeHtml(role)} · ${escapeHtml(basis)}</p></div><div class="person-activity-actions"><button class="mini-btn danger delete" type="button" data-authoring-action="delete" data-activity-id="${activityId}">삭제</button></div></header>
      <dl class="person-activity-dates">
        <div><dt>시작</dt><dd>${escapeHtml(boundaryLabel(activity.start))}${startMeta.length ? `<small>${startMeta.map(escapeHtml).join(" · ")}</small>` : ""}</dd></div>
        <div><dt>종료</dt><dd>${escapeHtml(boundaryLabel(activity.end))}${endMeta.length ? `<small>${endMeta.map(escapeHtml).join(" · ")}</small>` : ""}</dd></div>
      </dl>
      ${semanticMeta.length ? `<p class="person-activity-meta">${semanticMeta.map(escapeHtml).join(" · ")}</p>` : ""}
      ${activity.notes ? `<p class="person-activity-notes">${escapeHtml(activity.notes)}</p>` : ""}
      <div class="person-activity-sources"><strong>Activity 출처</strong>${sourceListHtml(activity.sources)}</div>
    </article>`;
  }

  function portraitFrameHtml(person, portraitResult) {
    const displayName = person?.display_name || person?.canonical_name_en || "인물";
    if (portraitResult?.error) {
      return '<figure class="person-detail-portrait" aria-label="초상화 조회 실패" title="초상화 조회 실패"><img data-person-portrait-image alt="" hidden /><span class="person-detail-portrait-empty">오류</span></figure>';
    }
    const portrait = portraitResult?.portrait || null;
    if (!portrait) {
      return '<figure class="person-detail-portrait" aria-label="초상화 없음" title="초상화 없음"><img data-person-portrait-image alt="" hidden /><span class="person-detail-portrait-empty">없음</span></figure>';
    }
    const href = safeHttpUrl(portrait.asset_url);
    if (!href) {
      return '<figure class="person-detail-portrait" aria-label="초상화 주소 오류" title="초상화 주소 오류"><img data-person-portrait-image alt="" hidden /><span class="person-detail-portrait-empty">오류</span></figure>';
    }
    const meta = [portrait.portrait_kind, portrait.evidence_level].filter(Boolean).join(" · ");
    const title = meta ? `${displayName} 초상화 · ${meta}` : `${displayName} 초상화`;
    return `<figure class="person-detail-portrait" aria-label="${escapeHtml(displayName)} 초상화" title="${escapeHtml(title)}"><img data-person-portrait-image src="${escapeHtml(href)}" alt="${escapeHtml(displayName)} 초상화" loading="lazy" decoding="async" referrerpolicy="no-referrer" /></figure>`;
  }

  function renderDetail(person) {
    const portraitResult = arguments[1] || null;
    const panel = document.getElementById("personMainDetail");
    if (!panel) return;
    const rawHistoricity = person?.historicity == null || String(person.historicity) === "" ? "historicity 미상" : String(person.historicity);
    panel.innerHTML = `<div class="person-detail-head">${portraitFrameHtml(person, portraitResult)}<div><p class="eyebrow">PERSON DETAIL</p><div class="person-detail-name-row"><h2>${escapeHtml(person.display_name || person.canonical_name_en || "이름 미상")}</h2>${externalLinksHtml(person)}</div><p><span class="person-historicity">${escapeHtml(rawHistoricity)}</span><span class="person-type-badge">${escapeHtml(person.person_type || "type 미상")}</span></p></div></div>
      ${profileEditorHtml(person, portraitResult)}
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
    selectedPersonDetail = null;
    selectedPortrait = null;
    selectedPortraitSourceCandidates = null;
    renderGroups();
    renderDetailLoading();
    const serial = ++requestSerial;
    try {
      const [result, portraitResult] = await Promise.all([
        reader.readPerson(personId),
        reader.readPortrait(personId).catch((error) => Object.freeze({ error }))
      ]);
      if (serial !== requestSerial || selectedPersonId !== personId) return;
      selectedPersonDetail = result.person;
      selectedPortrait = portraitResult?.portrait || null;
      renderDetail(result.person, portraitResult);
    } catch (error) {
      if (serial !== requestSerial) return;
      renderDetailError(error);
    }
  }

  async function loadPersons({ keepSelection = true, force = false } = {}) {
    const groups = document.getElementById("personMainGroups");
    try {
      const [result, registryRows, domainResult] = await Promise.all([
        dataStore.loadPersons({ force }),
        dataStore.loadNonTimelinePersons({ force }),
        dataStore.loadPersonDomains({ force }).catch(() => null)
      ]);
      persons = result.persons.slice();
      unknownChronologyRegistry = registryRows.slice();
      personDomainsById = Object.freeze({ ...(domainResult?.by_person_id || {}) });
      facetCatalog = result.facet_catalog || reader.facetCatalog(persons);
      if (facetFilters.polity_id && !polityOptions().some((item) => item.id === facetFilters.polity_id)) {
        facetFilters = { ...facetFilters, polity_id: "" };
      }
      if (facetFilters.relation_type_id && !relationOptions().some((item) => item.id === facetFilters.relation_type_id)) {
        facetFilters = { ...facetFilters, relation_type_id: "" };
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

  function outcomeError(outcome, fallback) {
    if (Array.isArray(outcome?.errors) && outcome.errors.length) return outcome.errors.join("; ");
    if (Array.isArray(outcome?.validation_failures) && outcome.validation_failures.length) {
      return outcome.validation_failures.map((row) => row?.code || row?.field || "validation failed").join("; ");
    }
    return outcome?.transaction_failure || fallback;
  }

  function ensurePortraitImageModule() {
    if (window.ATLAS_PERSON_PORTRAIT_IMAGE?.portraitFileToWebpBase64) {
      return Promise.resolve(window.ATLAS_PERSON_PORTRAIT_IMAGE);
    }
    if (personPortraitImageModulePromise) return personPortraitImageModulePromise;

    personPortraitImageModulePromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-atlas-person-portrait-image="true"]');
      const created = !script;
      if (!script) {
        script = document.createElement("script");
        script.src = PERSON_PORTRAIT_IMAGE_SCRIPT_URL;
        script.async = true;
        script.dataset.atlasPersonPortraitImage = "true";
      }

      const finish = () => {
        if (window.ATLAS_PERSON_PORTRAIT_IMAGE?.portraitFileToWebpBase64) {
          resolve(window.ATLAS_PERSON_PORTRAIT_IMAGE);
          return;
        }
        script?.remove?.();
        reject(new Error("ATLAS_PERSON_PORTRAIT_IMAGE_MODULE_MISSING"));
      };
      const fail = () => {
        script?.remove?.();
        reject(new Error("ATLAS_PERSON_PORTRAIT_IMAGE_MODULE_LOAD_FAILED"));
      };

      script.addEventListener("load", finish, { once:true });
      script.addEventListener("error", fail, { once:true });
      if (created) document.head.append(script);
    }).catch((error) => {
      personPortraitImageModulePromise = null;
      throw error;
    });

    return personPortraitImageModulePromise;
  }

  async function portraitFileToWebpBase64(file) {
    const converter = await ensurePortraitImageModule();
    return converter.portraitFileToWebpBase64(file);
  }

  async function loadPortraitSourceCandidates(personId) {
    const id = String(personId || "").trim();
    if (!id || id !== selectedPersonId || !selectedPortrait || !selectedPersonDetail) return;
    try {
      const { candidates } = await portraitController.loadSourceCandidates(id);
      selectedPortraitSourceCandidates = candidates;
      renderDetail(selectedPersonDetail, { portrait:selectedPortrait });
      showOperationalMessage(`초상 근거 후보 ${selectedPortraitSourceCandidates.length}건을 불러왔습니다.`);
    } catch (error) {
      showOperationalMessage(error?.message || "Person 출처 조회에 실패했습니다.");
    }
  }

  async function refreshPortraitAfterWrite(personId, successMessage) {
    await selectPerson(personId, { force:true });
    showOperationalMessage(successMessage);
  }

  async function handlePortraitMetadataSubmit(event) {
    const form = event.target.closest?.("form[data-person-portrait-operation][data-person-id]");
    if (!form) return;
    const operation = String(form.dataset.personPortraitOperation || "");
    if (!["metadata","source-add","source-edit"].includes(operation)) return;
    event.preventDefault();
    const personId = String(form.dataset.personId || "").trim();
    if (!personId || personId !== selectedPersonId || !selectedPortrait) {
      return showOperationalMessage("현재 초상화 상태를 다시 불러온 뒤 시도하세요.");
    }
    const controls = [...form.querySelectorAll("button,input,select")];
    controls.forEach((control) => { control.disabled = true; });
    try {
      if (operation === "metadata") {
        await portraitController.patchMetadata(personId, {
          portraitKind:form.elements.portrait_kind?.value,
          evidenceLevel:form.elements.evidence_level?.value
        });
        return await refreshPortraitAfterWrite(personId, "초상 유형과 근거 수준을 저장했습니다.");
      }

      if (operation === "source-add") {
        const sourceId = String(form.elements.source_id?.value || "").trim();
        const evidenceRole = String(form.elements.evidence_role?.value || "").trim();
        if (!sourceId || !evidenceRole) return showOperationalMessage("연결할 출처와 근거 역할을 선택하세요.");
        await portraitController.addSource(personId, sourceId, evidenceRole);
        return await refreshPortraitAfterWrite(personId, "초상 근거 출처를 연결했습니다.");
      }

      const sourceId = String(form.dataset.sourceId || "").trim();
      const originalRole = String(form.dataset.originalRole || "").trim();
      const evidenceRole = String(form.elements.evidence_role?.value || "").trim();
      if (!sourceId || !originalRole || !evidenceRole) return showOperationalMessage("초상 근거 연결 정보가 올바르지 않습니다.");
      await portraitController.editSource(personId, sourceId, originalRole, evidenceRole);
      return await refreshPortraitAfterWrite(personId, "초상 근거 역할을 변경했습니다.");
    } catch (error) {
      showOperationalMessage(error?.message || "초상 근거 저장에 실패했습니다.");
    } finally {
      controls.forEach((control) => { if (control.isConnected) control.disabled = false; });
    }
  }

  async function removePortraitSource(personId, sourceId, evidenceRole) {
    const id = String(personId || "").trim();
    const sid = String(sourceId || "").trim();
    const role = String(evidenceRole || "").trim();
    if (!id || id !== selectedPersonId || !selectedPortrait || !sid || !role) return;
    if (!window.confirm("이 출처와 초상화의 근거 연결을 해제할까요?")) return;
    try {
      await portraitController.removeSource(id, sid, role);
      await refreshPortraitAfterWrite(id, "초상 근거 연결을 해제했습니다.");
    } catch (error) {
      showOperationalMessage(error?.message || "초상 근거 연결 해제에 실패했습니다.");
    }
  }

  async function handlePortraitSubmit(event) {
    const form = event.target.closest?.("form[data-person-portrait-operation='upload'][data-person-id]");
    if (!form) return;
    event.preventDefault();
    const personId = String(form.dataset.personId || "").trim();
    if (!personId || selectedPersonId !== personId) return showOperationalMessage("현재 선택한 인물과 초상화 편집 대상이 다릅니다.");
    const file = form.elements.portrait_file?.files?.[0] || null;
    const portraitKind = String(form.elements.portrait_kind?.value || "").trim();
    const evidenceLevel = String(form.elements.evidence_level?.value || "").trim();
    if (!file) return showOperationalMessage("업로드할 이미지를 선택하세요.");
    if (!portraitKind || !evidenceLevel) return showOperationalMessage("초상 유형과 근거 수준을 선택하세요.");

    const controls = [...form.querySelectorAll("button,input,select")];
    controls.forEach((control) => { control.disabled = true; });
    try {
      showOperationalMessage("초상 이미지를 WebP로 변환 중입니다.");
      const imageBase64 = await portraitFileToWebpBase64(file);
      const outcome = await portraitController.setPortrait({
        personId,
        imageBase64,
        portraitKind,
        evidenceLevel
      });
      await selectPerson(personId, { force:true });
      if (outcome?.replaced_asset_cleanup?.ok === false) {
        showOperationalMessage("초상화는 교체됐지만 이전 저장 파일 정리에 실패했습니다.");
      } else {
        showOperationalMessage("초상화를 저장했습니다.");
      }
    } catch (error) {
      showOperationalMessage(error?.message || "초상화 저장에 실패했습니다.");
    } finally {
      controls.forEach((control) => { if (control.isConnected) control.disabled = false; });
    }
  }

  async function deletePersonPortrait(personId) {
    const id = String(personId || "").trim();
    if (!id || id !== selectedPersonId) return;
    if (!window.confirm("이 인물의 초상화를 삭제할까요?")) return;
    try {
      const outcome = await portraitController.deletePortrait(id);
      await selectPerson(id, { force:true });
      if (outcome?.storage_cleanup?.ok === false) {
        showOperationalMessage("초상화 DB 연결은 삭제됐지만 저장 파일 정리에 실패했습니다.");
      } else {
        showOperationalMessage("초상화를 삭제했습니다.");
      }
    } catch (error) {
      showOperationalMessage(error?.message || "초상화 삭제에 실패했습니다.");
    }
  }

  async function handleProfileSubmit(event) {
    const form = event.target.closest?.("form[data-person-profile-operation][data-person-id]");
    if (!form) return;
    event.preventDefault();
    if (!profileWriter) return showOperationalMessage("Person 편집 서비스가 초기화되지 않았습니다.");
    const operation = form.dataset.personProfileOperation;
    const personId = form.dataset.personId;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      let outcome;
      if (operation === "set_person_korean_name") {
        const value = form.elements.korean_name?.value || "";
        outcome = await profileWriter.setPersonKoreanName(personId, value);
      } else if (operation === "set_person_external_reference") {
        const value = form.elements.namuwiki_reference?.value || "";
        outcome = await profileWriter.setPersonExternalReference(personId, "namuwiki", value);
      } else {
        return showOperationalMessage("지원하지 않는 Person 편집 작업입니다.");
      }
      if (outcome?.committed !== true) {
        return showOperationalMessage(outcomeError(outcome, "Person 정보 저장에 실패했습니다."));
      }
      await loadPersons({ keepSelection:true, force:true });
      if (operation === "set_person_external_reference") await externalReferences?.reload?.();
      showOperationalMessage(operation === "set_person_korean_name" ? "한국어 이름을 전체 화면에 반영했습니다." : "나무위키 문서를 연결했습니다.");
    } catch (error) {
      showOperationalMessage(error?.message || "Person 정보 저장에 실패했습니다.");
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }

  async function deleteActivity(activityId) {
    if (!activityId) return;
    if (!profileWriter) return showOperationalMessage("Activity 삭제 서비스를 사용할 수 없습니다.");
    if (!window.confirm("이 Activity를 삭제할까요?")) return;
    try {
      const outcome = await profileWriter.deleteActivity(activityId);
      if (outcome?.committed !== true) return showOperationalMessage(outcomeError(outcome, "Activity 삭제에 실패했습니다."));
      await loadPersons({ keepSelection:true, force:true });
      showOperationalMessage("Activity를 삭제했습니다.");
    } catch (error) {
      showOperationalMessage(error?.message || "Activity 삭제에 실패했습니다.");
    }
  }

  function ensurePersonExcelExportModule() {
    if (window.ATLAS_PERSON_EXCEL_EXPORT?.exportPersons) {
      return Promise.resolve(window.ATLAS_PERSON_EXCEL_EXPORT);
    }
    if (personExcelExportModulePromise) return personExcelExportModulePromise;

    personExcelExportModulePromise = new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-atlas-person-excel-export="true"]');
      const created = !script;
      if (!script) {
        script = document.createElement("script");
        script.src = PERSON_EXCEL_EXPORT_SCRIPT_URL;
        script.async = true;
        script.dataset.atlasPersonExcelExport = "true";
      }

      const finish = () => {
        if (window.ATLAS_PERSON_EXCEL_EXPORT?.exportPersons) {
          resolve(window.ATLAS_PERSON_EXCEL_EXPORT);
          return;
        }
        script?.remove?.();
        reject(new Error("ATLAS_PERSON_EXCEL_EXPORT_MODULE_MISSING"));
      };
      const fail = () => {
        script?.remove?.();
        reject(new Error("ATLAS_PERSON_EXCEL_EXPORT_MODULE_LOAD_FAILED"));
      };

      script.addEventListener("load", finish, { once:true });
      script.addEventListener("error", fail, { once:true });
      if (created) document.head.append(script);
    }).catch((error) => {
      personExcelExportModulePromise = null;
      throw error;
    });

    return personExcelExportModulePromise;
  }

  async function exportCurrentExcel() {
    if (excelExportInFlight) return;
    excelExportInFlight = true;
    const exportButton = document.getElementById("personMainExcelExport");
    if (exportButton) exportButton.disabled = true;

    try {
      const exporter = await ensurePersonExcelExportModule();
      await exporter.exportPersons({ persons, boundaryLabel });
    } catch (error) {
      console.error("ATLAS Excel export failed", error);
      showOperationalMessage("엑셀 모듈을 불러오지 못했습니다. 다시 시도해주세요.");
    } finally {
      excelExportInFlight = false;
      if (exportButton?.isConnected) exportButton.disabled = false;
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
    personView.innerHTML = `<section class="person-main-toolbar card"><div class="person-main-toolbar-heading"><p class="eyebrow">AUTHORITATIVE PERSON READ</p><h2>인물 목록</h2><p>연대 불확실성은 활동기간 표기에 직접 반영합니다.</p></div><div class="person-main-actions" aria-label="Person 운영 도구"><button id="personMainRefresh" class="btn" type="button">↻ 새로고침</button><button id="personMainExcelExport" class="btn" type="button">⇩ 엑셀 출력</button><a class="btn" href="./admin.html">관리자</a></div><div class="person-main-controls"><select id="personMainSort" aria-label="Person 정렬"><option value="start-asc">활동연도 ↑ 과거→현재</option><option value="start-desc">활동연도 ↓ 현재→과거</option></select></div></section>
      <div class="person-main-layout"><div id="personMainGroups" class="person-main-groups"></div><aside id="personMainDetail" class="person-main-detail card" aria-live="polite"><p class="person-detail-placeholder">왼쪽에서 인물을 선택하면 이름·설명·출처와 모든 Activity 의미를 확인할 수 있습니다.</p></aside></div>`;

    topbar.insertAdjacentElement("afterend", personView);

    const sort = document.getElementById("personMainSort");
    const refresh = document.getElementById("personMainRefresh");
    const excelExport = document.getElementById("personMainExcelExport");
    const groups = document.getElementById("personMainGroups");
    const detail = document.getElementById("personMainDetail");

    sort?.addEventListener("change", () => {
      sortOrder = sort.value === "start-desc" ? "start-desc" : "start-asc";
      renderGroups();
    });
    refresh?.addEventListener("click", () => loadPersons({ keepSelection: true, force: true }));
    excelExport?.addEventListener("click", exportCurrentExcel);
    groups?.addEventListener("click", (event) => {
      if (event.target.closest("[data-person-dashboard-filter-clear]")) {
        clearDashboardFilter();
        return;
      }
      const card = event.target.closest("[data-person-id]");
      if (card) selectPerson(card.dataset.personId);
    });
    detail?.addEventListener("submit", handleProfileSubmit);
    detail?.addEventListener("submit", handlePortraitSubmit);
    detail?.addEventListener("submit", handlePortraitMetadataSubmit);
    detail?.addEventListener("click", (event) => {
      const sourceLoad = event.target.closest("[data-person-portrait-load-sources][data-person-id]");
      if (sourceLoad) {
        loadPortraitSourceCandidates(sourceLoad.dataset.personId);
        return;
      }
      const sourceRemove = event.target.closest("[data-person-portrait-source-remove][data-person-id]");
      if (sourceRemove) {
        removePortraitSource(sourceRemove.dataset.personId, sourceRemove.dataset.sourceId, sourceRemove.dataset.evidenceRole);
        return;
      }
      const portraitDelete = event.target.closest("[data-person-portrait-delete][data-person-id]");
      if (portraitDelete) {
        deletePersonPortrait(portraitDelete.dataset.personId);
        return;
      }
      const actionButton = event.target.closest("[data-authoring-action][data-activity-id]");
      if (!actionButton) return;
      if (actionButton.dataset.authoringAction === "delete") deleteActivity(actionButton.dataset.activityId);
    });
    window.addEventListener("atlas-person-search-change", (event) => {
      setSearchQuery(event?.detail?.query);
    });
    window.addEventListener("atlas-person-polity-filter-change", (event) => {
      setPolityFilter(event?.detail?.polityId);
    });
    window.addEventListener("atlas-person-relation-filter-change", (event) => {
      setRelationFilter(event?.detail?.relationId);
    });
    window.addEventListener("atlas-person-domain-filter-change", (event) => {
      setDomainFilter(event?.detail?.domain);
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
    setRelationFilter,
    getRelationFilter: () => facetFilters.relation_type_id,
    getRelationOptions: relationOptions,
    setDomainFilter,
    getDomainFilter: () => facetFilters.domain,
    setDashboardFilter,
    clearDashboardFilter,
    getDashboardFilter: () => dashboardFilter ? Object.freeze({ code:dashboardFilter.code, label:dashboardFilter.label, person_ids:Object.freeze([...dashboardFilter.ids]) }) : null,
    yearLabel,
    boundaryLabel,
    safeHttpUrl,
    externalLinksHtml,
    profileEditorHtml,
    portraitFileToWebpBase64,
    handlePortraitSubmit,
    handlePortraitMetadataSubmit,
    loadPortraitSourceCandidates,
    removePortraitSource,
    deletePersonPortrait,
    deleteActivity,
    exportCurrentExcel
  });
})();