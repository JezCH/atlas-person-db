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

  function rawValue(value, fallback = "미상") {
    const text = value == null ? "" : String(value).trim();
    return text || fallback;
  }

  function yearLabel(value) {
    if (!Number.isFinite(value)) return "미상";
    if (value < 0) return `기원전 ${Math.abs(value)}`;
    if (value > 0) return `서기 ${value}`;
    return "연도 0";
  }

  function formatTraditionalDate(row) {
    const year = Number(row.traditional_year);
    const alt = Number(row.traditional_year_alternative);
    if (!Number.isFinite(year)) return "미상";
    const primary = yearLabel(year);
    if (Number.isFinite(alt) && alt !== year) return `전승상 ${primary}/${yearLabel(alt)}`;
    return `전승상 ${primary}년경`;
  }

  function formatActivityRange(row) {
    const start = Number(row.activity_start);
    const end = Number(row.activity_end);
    const hasStart = Number.isFinite(start);
    const hasEnd = Number.isFinite(end);
    if (!hasStart && !hasEnd) return "시작·종료 모두 미상";
    return `${hasStart ? yearLabel(start) : "시작 미상"} – ${hasEnd ? yearLabel(end) : "종료 미상"}`;
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
          <p>역사성 또는 개인 연대가 확정되지 않아 현재 연도 기반 지도에서 제외된 curated 기록입니다. 행을 선택하면 판정 근거와 지도 정책을 확인할 수 있습니다.</p>
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

  function renderRows(body, items) {
    body.innerHTML = items.map((row, index) => `${dataRowHtml(row, index)}${detailRowHtml(row, index)}`).join("");
  }

  function setExpanded(row, expanded) {
    const index = row?.dataset.nonTimelineIndex;
    if (index == null) return;
    const detail = document.querySelector(`[data-non-timeline-detail="${CSS.escape(index)}"]`);
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

    try {
      const response = await fetch(`./non-timeline-persons.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      const items = Array.isArray(rows) ? rows : [];

      renderRows(body, items);
      count.textContent = `${items.length}명`;
      empty.hidden = items.length !== 0;
      hideEmptyAuthoritativeOtherGroup();
    } catch (error) {
      console.error("ATLAS non-timeline list failed", error);
      count.textContent = "확인 실패";
      body.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "전설·신화·연대 미확정 인물 데이터를 불러오지 못했습니다.";
    }
  }

  window.addEventListener("atlas-person-main-rendered", hideEmptyAuthoritativeOtherGroup);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();
})();
