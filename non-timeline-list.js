(() => {
  "use strict";

  const koPolities = Object.freeze({
    Carthage: "카르타고"
  });

  const historicityLabels = Object.freeze({
    legendary: "전설",
    mythical: "신화",
    uncertain: "역사성 불확실",
    legendary_or_composite: "전설·복합 인물 가능성",
    legendary_possible_historical_core: "전설·역사적 핵심 가능성",
    legendary_or_unverified: "전설·검증 미확정",
    historical_tradition_uncertain_chronology: "역사 전승·연대 불확실"
  });

  const dateBasisLabels = Object.freeze({
    traditional_foundation_association: "전승상 건국 연대 연계",
    none: "확정 연대 기준 없음",
    uncertain_king_list_tradition: "왕명록 전승·불확실",
    non_mainstream_inscription_claim: "비주류 비문 해석 주장",
    mythological_tradition: "신화 전승",
    epic_tradition: "서사시 전승",
    traditional_chinese_chronology: "중국 전통 연대",
    later_genealogical_tradition: "후대 계보 전승",
    "Rapa Nui oral tradition": "라파누이 구전 전승"
  });

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));

  let items = [];
  let currentQuery = "";
  let loaded = false;

  function rawValue(value, fallback = "미상") {
    const text = value == null ? "" : String(value).trim();
    return text || fallback;
  }

  function numericYear(value) {
    if (value == null || String(value).trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function yearLabel(value) {
    const year = numericYear(value);
    if (year == null) return "미상";
    if (year < 0) return `기원전 ${Math.abs(year)}`;
    if (year > 0) return `서기 ${year}`;
    return "연도 0";
  }

  function yearSearchTokens(value) {
    const year = numericYear(value);
    if (year == null) return [];
    if (year < 0) {
      const absolute = Math.abs(year);
      return [String(year), `BC ${absolute}`, `BCE ${absolute}`, `기원전 ${absolute}`];
    }
    if (year > 0) return [String(year), `AD ${year}`, `CE ${year}`, `서기 ${year}`];
    return ["0", "year 0", "연도 0"];
  }

  function formatTraditionalDate(row) {
    const year = numericYear(row.traditional_year);
    const alt = numericYear(row.traditional_year_alternative);
    if (year == null) return "미상";
    const primary = yearLabel(year);
    if (alt != null && alt !== year) return `전승상 ${primary}/${yearLabel(alt)}`;
    return `전승상 ${primary}년경`;
  }

  function formatActivityRange(row) {
    const start = numericYear(row.activity_start);
    const end = numericYear(row.activity_end);
    if (start == null && end == null) return "시작·종료 모두 미상";
    return `${start != null ? yearLabel(start) : "시작 미상"} – ${end != null ? yearLabel(end) : "종료 미상"}`;
  }

  function historicityLabel(value) {
    const raw = rawValue(value);
    return historicityLabels[raw] || raw.replaceAll("_", " ");
  }

  function dateBasisLabel(value) {
    const raw = rawValue(value);
    return dateBasisLabels[raw] || raw.replaceAll("_", " ");
  }

  function timelineLabel(value) {
    const raw = rawValue(value);
    if (raw === "excluded") return "연표 제외";
    return raw.replaceAll("_", " ");
  }

  function normalizeSearchText(value) {
    return String(value ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[’‘`´]/g, "'")
      .replace(/[‐‑‒–—―]/g, "-")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .toLocaleLowerCase("ko-KR");
  }

  function searchableText(row) {
    const rawPolitic = rawValue(row.politic_name, "");
    const values = [
      row.display_name_ko,
      row.person_name,
      rawPolitic,
      koPolities[rawPolitic],
      row.historicity,
      historicityLabel(row.historicity),
      row.date_basis,
      dateBasisLabel(row.date_basis),
      row.role_ko,
      row.timeline_status,
      timelineLabel(row.timeline_status),
      row.reason,
      row.map_policy,
      formatTraditionalDate(row),
      formatActivityRange(row),
      ...yearSearchTokens(row.traditional_year),
      ...yearSearchTokens(row.traditional_year_alternative),
      ...yearSearchTokens(row.activity_start),
      ...yearSearchTokens(row.activity_end)
    ].filter((value) => value != null && String(value).trim());
    return normalizeSearchText(values.join("\n"));
  }

  function matchesQuery(row, query) {
    const needle = normalizeSearchText(query);
    if (!needle) return true;
    const haystack = searchableText(row);
    const tokens = needle.split(/\s+/).filter(Boolean);
    return haystack.includes(needle) || tokens.every((token) => haystack.includes(token));
  }

  function hideEmptyAuthoritativeOtherGroup() {
    const group = document.querySelector("#personMainGroups .person-group-other");
    if (!group) return;
    group.hidden = !group.querySelector(".person-card");
  }

  function createSection() {
    const personView = document.getElementById("personMainView");
    if (!personView || document.getElementById("nonTimelineSection")) return null;

    const section = document.createElement("section");
    section.id = "nonTimelineSection";
    section.className = "non-timeline-section card";
    section.innerHTML = `
      <div class="non-timeline-head">
        <div>
          <p class="eyebrow">LEGENDARY / MYTHICAL / NON-TIMELINE PERSONS</p>
          <h2>전설·신화·연대 미확정 인물</h2>
          <p>역사성 또는 개인 연대가 확정되지 않아 현재 연도 기반 지도에서 제외된 curated 기록입니다. 같은 인물 검색을 공유하며, 연대·Activity 의미 필터와 정렬은 authoritative Person 표에만 적용됩니다. 행을 선택하면 판정 근거와 지도 정책을 확인할 수 있습니다.</p>
        </div>
        <strong id="nonTimelineCount">0명</strong>
      </div>
      <div class="table-scroll non-timeline-scroll" tabindex="0" aria-label="전설·신화·연대 미확정 인물 표, 좌우로 스크롤할 수 있습니다">
        <table class="non-timeline-table">
          <thead><tr><th>인물</th><th>정치체</th><th>역사성</th><th>전승 연대</th><th>역할</th><th>연표·지도</th></tr></thead>
          <tbody id="nonTimelineBody"></tbody>
        </table>
      </div>
      <div id="nonTimelineEmpty" class="empty-state" hidden>등록된 전설·신화·연대 미확정 인물이 없습니다.</div>`;

    personView.insertAdjacentElement("afterend", section);
    return section;
  }

  function detailRowHtml(row, index) {
    const person = row.display_name_ko || row.person_name || "이름 미상";
    const rawPerson = rawValue(row.person_name);
    const rawPolitic = rawValue(row.politic_name);
    const rawHistoricity = rawValue(row.historicity);
    const rawDateBasis = rawValue(row.date_basis);
    const rawTimeline = rawValue(row.timeline_status);
    return `<tr id="nonTimelineDetail-${index}" class="non-timeline-detail-row" data-non-timeline-detail="${index}" hidden>
      <td colspan="6">
        <div class="non-timeline-detail" aria-label="${escapeHtml(person)} 상세 판정 정보">
          <dl class="non-timeline-detail-facts">
            <div><dt>원문 인물명</dt><dd>${escapeHtml(rawPerson)}</dd></div>
            <div><dt>원문 정치체</dt><dd>${escapeHtml(rawPolitic)}</dd></div>
            <div><dt>역사성 원분류</dt><dd><code>${escapeHtml(rawHistoricity)}</code></dd></div>
            <div><dt>연대 기준</dt><dd>${escapeHtml(dateBasisLabel(row.date_basis))}<small><code>${escapeHtml(rawDateBasis)}</code></small></dd></div>
            <div><dt>연표 상태</dt><dd>${escapeHtml(timelineLabel(row.timeline_status))}<small><code>${escapeHtml(rawTimeline)}</code></small></dd></div>
            <div><dt>활동연도 필드</dt><dd>${escapeHtml(formatActivityRange(row))}</dd></div>
          </dl>
          <div class="non-timeline-detail-text"><section><h3>판정 근거</h3><p>${escapeHtml(rawValue(row.reason, "등록된 판정 근거 없음"))}</p></section><section><h3>지도 처리 정책</h3><p>${escapeHtml(rawValue(row.map_policy, "등록된 지도 처리 정책 없음"))}</p></section></div>
        </div>
      </td>
    </tr>`;
  }

  function dataRowHtml(row, index) {
    const person = row.display_name_ko || row.person_name || "이름 미상";
    const politic = koPolities[row.politic_name] || row.politic_name || "정치체 미상";
    const rawPerson = rawValue(row.person_name, "");
    const rawPolitic = rawValue(row.politic_name, "");
    const role = row.role_ko || "역할 미확정";
    const personCanonical = rawPerson && rawPerson !== person ? `<small>${escapeHtml(rawPerson)}</small>` : "";
    const polityCanonical = rawPolitic && rawPolitic !== politic ? `<small>${escapeHtml(rawPolitic)}</small>` : "";
    return `<tr class="non-timeline-data-row" data-non-timeline-index="${index}" tabindex="0" aria-expanded="false" aria-controls="nonTimelineDetail-${index}">
      <td><strong>${escapeHtml(person)}</strong>${personCanonical}</td>
      <td>${escapeHtml(politic)}${polityCanonical}</td>
      <td><span class="non-timeline-historicity">${escapeHtml(historicityLabel(row.historicity))}</span></td>
      <td>${escapeHtml(formatTraditionalDate(row))}</td>
      <td>${escapeHtml(role)}</td>
      <td><span class="non-timeline-status">${escapeHtml(timelineLabel(row.timeline_status))}</span><small>상세 정책 보기</small></td>
    </tr>`;
  }

  function renderRows(body, rows) {
    body.innerHTML = rows.map((row, index) => `${dataRowHtml(row, index)}${detailRowHtml(row, index)}`).join("");
  }

  function dispatchRenderState(visibleCount) {
    window.dispatchEvent(new CustomEvent("atlas-non-timeline-rendered", {
      detail: { visibleCount, totalCount: items.length, query: currentQuery }
    }));
  }

  function applySearch(query = currentQuery) {
    currentQuery = String(query ?? "");
    if (!loaded) return 0;
    const body = document.getElementById("nonTimelineBody");
    const count = document.getElementById("nonTimelineCount");
    const empty = document.getElementById("nonTimelineEmpty");
    if (!body || !count || !empty) return 0;
    const visible = items.filter((row) => matchesQuery(row, currentQuery));
    renderRows(body, visible);
    count.textContent = currentQuery.trim() ? `${visible.length}/${items.length}명` : `${items.length}명`;
    empty.hidden = visible.length !== 0;
    empty.textContent = items.length === 0
      ? "등록된 전설·신화·연대 미확정 인물이 없습니다."
      : "현재 검색에 해당하는 전설·신화·연대 미확정 인물이 없습니다.";
    dispatchRenderState(visible.length);
    return visible.length;
  }

  function setExpanded(row, expanded) {
    const index = row?.dataset.nonTimelineIndex;
    if (index == null) return;
    const detail = document.getElementById(`nonTimelineDetail-${index}`);
    if (!detail) return;
    row.setAttribute("aria-expanded", String(expanded));
    row.classList.toggle("is-selected", expanded);
    detail.hidden = !expanded;
  }

  function toggleRow(row) {
    const body = document.getElementById("nonTimelineBody");
    if (!body || !row) return;
    const willExpand = row.getAttribute("aria-expanded") !== "true";
    for (const other of body.querySelectorAll(".non-timeline-data-row[aria-expanded=\"true\"]")) {
      if (other !== row) setExpanded(other, false);
    }
    setExpanded(row, willExpand);
  }

  function installInteractions(body) {
    body.addEventListener("click", (event) => {
      const row = event.target.closest(".non-timeline-data-row");
      if (row) toggleRow(row);
    });
    body.addEventListener("keydown", (event) => {
      const row = event.target.closest(".non-timeline-data-row");
      if (!row || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      toggleRow(row);
    });
  }

  async function load() {
    const section = createSection();
    if (!section) return;
    const body = document.getElementById("nonTimelineBody");
    const count = document.getElementById("nonTimelineCount");
    const empty = document.getElementById("nonTimelineEmpty");
    installInteractions(body);
    currentQuery = document.getElementById("personMainSearch")?.value || "";

    try {
      const response = await fetch(`./non-timeline-persons.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      items = Array.isArray(rows) ? rows : [];
      loaded = true;
      applySearch(currentQuery);
      hideEmptyAuthoritativeOtherGroup();
    } catch (error) {
      console.error("ATLAS non-timeline list failed", error);
      loaded = true;
      items = [];
      count.textContent = "확인 실패";
      body.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "전설·신화·연대 미확정 인물 데이터를 불러오지 못했습니다.";
      dispatchRenderState(0);
    }
  }

  window.addEventListener("atlas-person-main-rendered", (event) => {
    hideEmptyAuthoritativeOtherGroup();
    currentQuery = String(event?.detail?.query ?? document.getElementById("personMainSearch")?.value ?? "");
    if (loaded) applySearch(currentQuery);
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();

  window.ATLAS_NON_TIMELINE_LIST = Object.freeze({
    applySearch,
    matchesQuery,
    yearLabel,
    formatTraditionalDate,
    formatActivityRange
  });
})();
