(() => {
  "use strict";

  const i18n = window.ATLAS_UI_I18N;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c]));

  function formatTraditionalDate(row) {
    if (row.traditional_year === null || row.traditional_year === undefined || row.traditional_year === "") return "미상";
    const year = Number(row.traditional_year);
    if (!Number.isFinite(year)) return "미상";
    const primary = year < 0 ? `기원전 ${Math.abs(year)}` : String(year);
    const hasAlternative = row.traditional_year_alternative !== null && row.traditional_year_alternative !== undefined && row.traditional_year_alternative !== "";
    const alt = hasAlternative ? Number(row.traditional_year_alternative) : NaN;
    if (Number.isFinite(alt) && alt !== year) {
      const alternative = alt < 0 ? `기원전 ${Math.abs(alt)}` : String(alt);
      return `전승상 ${primary}/${alternative}`;
    }
    return `전승상 ${primary}년경`;
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
          <p class="eyebrow">전설·신화 인물</p>
          <h2>전설·신화 인물</h2>
          <p>연대가 확정되지 않아 연도 기반 지도와 일반 활동 DB에서는 제외된 인물입니다.</p>
        </div>
        <strong id="nonTimelineCount">0명</strong>
      </div>
      <div class="table-scroll non-timeline-scroll">
        <table class="non-timeline-table">
          <thead><tr><th>인물</th><th>정치체</th><th>전승 연대</th><th>종료</th><th>역할·분류</th><th>지도 처리</th></tr></thead>
          <tbody id="nonTimelineBody"></tbody>
        </table>
      </div>
      <div id="nonTimelineEmpty" class="empty-state" hidden>등록된 전설·신화 인물이 없습니다.</div>`;

    personView.insertAdjacentElement("afterend", section);
    return section;
  }

  async function load() {
    const section = createSection();
    if (!section) return;
    const body = document.getElementById("nonTimelineBody");
    const count = document.getElementById("nonTimelineCount");
    const empty = document.getElementById("nonTimelineEmpty");

    try {
      const response = await fetch(`./non-timeline-persons.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      const items = Array.isArray(rows) ? rows : [];

      body.innerHTML = items.map((row) => {
        const person = row.display_name_ko || row.person_name;
        const polity = row.politic_display_name_ko || row.politic_name;
        const type = row.historicity_display_ko
          || i18n?.enumLabel?.("historicity", row.historicity, { fallback: "역사성 미확정" })
          || "역사성 미확정";
        const role = row.role_ko || `건국자·여왕 (${type})`;
        return `<tr>
          <td>${escapeHtml(person)}</td>
          <td>${escapeHtml(polity)}</td>
          <td>${escapeHtml(formatTraditionalDate(row))}</td>
          <td>미상</td>
          <td>${escapeHtml(role)}</td>
          <td>연표 제외</td>
        </tr>`;
      }).join("");

      count.textContent = `${items.length}명`;
      empty.hidden = items.length !== 0;
      hideEmptyAuthoritativeOtherGroup();
    } catch (error) {
      console.error("ATLAS non-timeline list failed", error);
      count.textContent = "확인 실패";
      body.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "전설·신화 인물 데이터를 불러오지 못했습니다.";
    }
  }

  const style = document.createElement("style");
  style.textContent = `
    .non-timeline-section{margin-top:16px;overflow:hidden}
    .non-timeline-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:18px 20px;border-bottom:1px solid #e1e5ec}
    .non-timeline-head h2{font-size:22px}
    .non-timeline-head p:last-child{margin:7px 0 0;color:#6f7888;font-size:13px}
    .non-timeline-head>strong{border-radius:999px;padding:7px 11px;background:#f2ecff;color:#6842a8;font-size:12px;white-space:nowrap}
    .non-timeline-scroll{max-height:360px}
    .non-timeline-table th:nth-child(1){width:180px}
    .non-timeline-table th:nth-child(2){width:205px}
    .non-timeline-table th:nth-child(3){width:160px}
    .non-timeline-table th:nth-child(4){width:90px}
    .non-timeline-table th:nth-child(5){width:220px}
    .non-timeline-table th:nth-child(6){width:120px}
    .non-timeline-table tbody tr{cursor:default}
    @media(max-width:760px){
      .non-timeline-section{margin-top:12px;background:transparent;border:0;box-shadow:none;overflow:visible}
      .non-timeline-head{background:#fff;border:1px solid var(--border);border-radius:12px;margin-bottom:8px;padding:14px}
      .non-timeline-head h2{font-size:19px}
      .non-timeline-head p:last-child{line-height:1.45}
      .non-timeline-scroll{overflow:visible;max-height:none}
      .non-timeline-table,.non-timeline-table tbody,.non-timeline-table tr,.non-timeline-table td{display:block;width:100%}
      .non-timeline-table thead{display:none}
      .non-timeline-table tbody{display:grid;gap:9px}
      .non-timeline-table tr{position:relative;background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px;box-shadow:0 3px 12px #18243a0b}
      .non-timeline-table td{border:0;padding:5px 0 5px 94px;min-height:27px;white-space:normal;font-size:13px}
      .non-timeline-table td::before{position:absolute;left:12px;width:76px;color:#7b8494;font-size:11px;font-weight:800}
      .non-timeline-table td:nth-child(1){padding:0 0 10px;font-size:17px;font-weight:800;border-bottom:1px solid #edf0f4;margin-bottom:5px}
      .non-timeline-table td:nth-child(1)::before{content:none}
      .non-timeline-table td:nth-child(2)::before{content:"정치체"}
      .non-timeline-table td:nth-child(3)::before{content:"전승 연대"}
      .non-timeline-table td:nth-child(4)::before{content:"종료"}
      .non-timeline-table td:nth-child(5)::before{content:"역할·분류"}
      .non-timeline-table td:nth-child(6)::before{content:"지도 처리"}
    }
  `;
  document.head.appendChild(style);

  window.addEventListener("atlas-person-main-rendered", hideEmptyAuthoritativeOtherGroup);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load, { once: true });
  else load();
})();
