(() => {
  "use strict";

  const READER = window.ATLAS_POLITY_BROWSER_READER;
  if (!READER?.listPolities) {
    console.warn("ATLAS canonical Polity reader is unavailable.");
    return;
  }

  const PAGE_SIZE = 120;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("und").replace(/\s+/gu, " ");
  }

  function formatYear(value) {
    if (!Number.isInteger(value)) return "미상";
    if (value < 0) return "기원전 " + Math.abs(value);
    if (value > 0) return String(value);
    return "0";
  }

  function observedSpan(polity) {
    if (!polity || polity.activity_count === 0) return "연결 Activity 없음";
    const start = Number.isInteger(polity.first_activity_year) ? formatYear(polity.first_activity_year) : "시작 미상";
    const end = polity.has_ongoing_activity
      ? "현재"
      : Number.isInteger(polity.last_activity_year) ? formatYear(polity.last_activity_year) : "종료 미상";
    return start + "–" + end;
  }

  function activitySpan(activity) {
    const start = Number.isInteger(activity?.activity_start) ? formatYear(activity.activity_start) : "시작 미상";
    const end = activity?.chronology_status === "ongoing"
      ? "현재"
      : Number.isInteger(activity?.activity_end) ? formatYear(activity.activity_end) : "종료 미상";
    return start + "–" + end;
  }

  function activityHtml(activity) {
    const designation = activity.polity_designation_name_ko || activity.polity_designation_name_en || "";
    const semantics = [
      designation,
      activity.relation_code,
      activity.role_name || activity.role_code,
      activity.period_basis
    ].filter(Boolean).join(" · ");
    return '<li><strong>' + escapeHtml(activity.person_display_name || activity.person_name_ko || activity.person_name_en || activity.person_id) +
      '</strong><span>' + escapeHtml(activitySpan(activity)) + (semantics ? " · " + escapeHtml(semantics) : "") + '</span></li>';
  }

  function aliasesHtml(polity) {
    const seen = new Set();
    const names = [];
    for (const row of polity.names || []) {
      const label = String(row?.name || "").trim();
      if (!label) continue;
      const key = normalizeText(label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      names.push(label);
    }
    if (!names.length) return "";
    return '<div class="polity-browser-aliases"><small>등록 명칭</small><span>' +
      names.map((name) => escapeHtml(name)).join(" · ") + '</span></div>';
  }

  function politySearchText(polity) {
    return normalizeText([
      polity.display_name,
      polity.canonical_name_en,
      polity.preferred_name_ko,
      polity.canonical_key,
      polity.polity_type,
      polity.historicity,
      ...(polity.names || []).map((row) => row?.name),
      ...(polity.activities || []).flatMap((activity) => [
        activity.person_display_name,
        activity.person_name_en,
        activity.person_name_ko,
        activity.polity_designation_name_en,
        activity.polity_designation_name_ko,
        activity.relation_code,
        activity.role_name,
        activity.role_code,
        activity.period_basis
      ])
    ].filter(Boolean).join(" "));
  }

  function polityCardHtml(polity) {
    const ko = polity.preferred_name_ko || polity.display_name || polity.canonical_name_en || polity.id;
    const en = polity.canonical_name_en || "";
    const activityCount = Number(polity.activity_count || 0);
    const personCount = Number(polity.person_count || 0);
    const unresolved = Number(polity.unresolved_activity_count || 0);
    const activities = (polity.activities || []).map(activityHtml).join("");

    return '<details class="polity-browser-card card" data-polity-id="' + escapeHtml(polity.id) + '">' +
      '<summary>' +
        '<div class="polity-browser-title"><strong>' + escapeHtml(ko) + '</strong>' +
          (en && normalizeText(en) !== normalizeText(ko) ? '<span>' + escapeHtml(en) + '</span>' : "") +
          '<code>' + escapeHtml(polity.id) + '</code></div>' +
        '<div class="polity-browser-card-stats">' +
          '<span><b>' + activityCount + '</b> Activity</span>' +
          '<span><b>' + personCount + '</b> Person</span>' +
          '<span><b>' + escapeHtml(observedSpan(polity)) + '</b></span>' +
          (polity.has_ongoing_activity ? '<span>현재 활동 포함</span>' : "") +
          (unresolved ? '<span><b>' + unresolved + '</b> 연대 미해결</span>' : "") +
        '</div>' +
      '</summary>' +
      '<div class="polity-browser-detail">' +
        '<div class="polity-browser-meta">' +
          '<span><small>canonical key</small><code>' + escapeHtml(polity.canonical_key || "—") + '</code></span>' +
          '<span><small>type</small><b>' + escapeHtml(polity.polity_type || "—") + '</b></span>' +
          '<span><small>historicity</small><b>' + escapeHtml(polity.historicity || "—") + '</b></span>' +
        '</div>' +
        aliasesHtml(polity) +
        '<div class="polity-browser-activities"><small>연결 Person · Activity</small>' +
          (activities ? '<ul>' + activities + '</ul>' : '<p>현재 연결된 Person Activity가 없습니다.</p>') +
        '</div>' +
      '</div>' +
    '</details>';
  }

  function summaryHtml(summary) {
    const value = (key) => summary && Number.isFinite(Number(summary[key])) ? Number(summary[key]).toLocaleString("ko-KR") : "—";
    return '<div class="polity-browser-kpis">' +
      '<div><small>현재 정치체</small><strong>' + value("total_polities") + '</strong></div>' +
      '<div><small>인물 연결</small><strong>' + value("linked_polities") + '</strong></div>' +
      '<div><small>연결 없음</small><strong>' + value("orphan_polities") + '</strong></div>' +
      '<div><small>Person↔Polity Activity</small><strong>' + value("activity_count") + '</strong></div>' +
      '<div><small>고유 연결 인물</small><strong>' + value("unique_linked_persons") + '</strong></div>' +
      '<div><small>현재 활동 정치체</small><strong>' + value("ongoing_polities") + '</strong></div>' +
    '</div>';
  }

  function filterRows(polities, filter, needle) {
    return (polities || []).filter((polity) => {
      if (filter === "linked" && Number(polity.activity_count || 0) === 0) return false;
      if (filter === "orphan" && Number(polity.activity_count || 0) !== 0) return false;
      if (filter === "ongoing" && polity.has_ongoing_activity !== true) return false;
      return !needle || politySearchText(polity).includes(needle);
    });
  }

  function mount(root) {
    if (!root) return;

    let live = { status: "loading", source: null, summary: null, polities: [], error: null };
    let filter = "all";
    let visibleLimit = PAGE_SIZE;

    root.innerHTML = '<section class="polity-browser-shell">' +
      '<header class="polity-browser-summary card">' +
        '<div><p class="eyebrow">CANONICAL POLITY BROWSER</p><h2>정치체</h2>' +
        '<p>이 화면의 정치체 목록·이름·UUID·연결 Activity는 별도 정적 목록이 아니라 현재 canonical Polity read에서 직접 가져옵니다. Identity 검토 문서는 감사자료일 뿐 이 화면의 데이터 원천이 아닙니다.</p></div>' +
        '<button type="button" class="btn" data-polity-refresh>현재 데이터 새로고침</button>' +
      '</header>' +
      '<section class="polity-browser-dataset card" aria-live="polite">' +
        '<div class="polity-browser-dataset-head"><div><small>LIVE CANONICAL DATASET</small><strong data-polity-source>불러오는 중</strong></div><span data-polity-status>조회 중</span></div>' +
        '<div data-polity-kpis>' + summaryHtml(null) + '</div>' +
      '</section>' +
      '<section class="polity-browser-controls card">' +
        '<input type="search" data-polity-search placeholder="정치체명·별칭·인물·역할 검색" />' +
        '<div class="polity-browser-filters">' +
          '<button type="button" class="is-active" data-polity-filter="all">전체</button>' +
          '<button type="button" data-polity-filter="linked">인물 연결</button>' +
          '<button type="button" data-polity-filter="orphan">연결 없음</button>' +
          '<button type="button" data-polity-filter="ongoing">현재 활동 포함</button>' +
        '</div>' +
        '<span data-polity-count></span>' +
      '</section>' +
      '<div class="polity-browser-list" data-current-polity-list></div>' +
      '<button type="button" class="btn polity-browser-more" data-polity-load-more hidden>더 보기</button>' +
    '</section>';

    const list = root.querySelector("[data-current-polity-list]");
    const search = root.querySelector("[data-polity-search]");
    const count = root.querySelector("[data-polity-count]");
    const status = root.querySelector("[data-polity-status]");
    const source = root.querySelector("[data-polity-source]");
    const kpis = root.querySelector("[data-polity-kpis]");
    const more = root.querySelector("[data-polity-load-more]");

    function render() {
      const needle = normalizeText(search?.value || "");
      const matched = filterRows(live.polities, filter, needle);
      const shown = matched.slice(0, visibleLimit);

      if (live.status === "loading") {
        list.innerHTML = '<section class="card polity-browser-state"><strong>현재 정치체 데이터를 불러오는 중입니다.</strong></section>';
      } else if (live.status === "error") {
        list.innerHTML = '<section class="card polity-browser-state is-error"><strong>정치체 데이터를 읽지 못했습니다.</strong><p>' + escapeHtml(live.error?.message || live.error || "unknown error") + '</p></section>';
      } else if (!matched.length) {
        list.innerHTML = '<section class="card polity-browser-state"><strong>조건에 맞는 현재 정치체가 없습니다.</strong></section>';
      } else {
        list.innerHTML = shown.map(polityCardHtml).join("");
      }

      if (kpis) kpis.innerHTML = summaryHtml(live.summary);
      if (count) count.textContent = live.status === "ready" ? "표시 " + shown.length.toLocaleString("ko-KR") + " / 검색 결과 " + matched.length.toLocaleString("ko-KR") : "";
      if (status) {
        status.textContent = live.status === "ready" ? "현재 DB 기준" : live.status === "error" ? "조회 실패" : "조회 중";
        status.classList.toggle("is-error", live.status === "error");
      }
      if (source) source.textContent = live.status === "ready" ? (live.source || "canonical Polity read") : "불러오는 중";
      if (more) {
        more.hidden = live.status !== "ready" || shown.length >= matched.length;
        more.textContent = more.hidden ? "더 보기" : "더 보기 (" + (matched.length - shown.length).toLocaleString("ko-KR") + "개 남음)";
      }
    }

    async function refresh() {
      live = { status: "loading", source: null, summary: null, polities: [], error: null };
      visibleLimit = PAGE_SIZE;
      render();
      try {
        const payload = await READER.listPolities();
        live = {
          status: "ready",
          source: payload.source || null,
          summary: payload.summary || null,
          polities: Array.isArray(payload.polities) ? payload.polities.slice() : [],
          error: null
        };
      } catch (error) {
        live = { status: "error", source: null, summary: null, polities: [], error };
      }
      render();
    }

    root.addEventListener("input", (event) => {
      if (!event.target.matches("[data-polity-search]")) return;
      visibleLimit = PAGE_SIZE;
      render();
    });

    root.addEventListener("click", (event) => {
      const refreshButton = event.target.closest("[data-polity-refresh]");
      if (refreshButton) {
        refresh();
        return;
      }

      const filterButton = event.target.closest("[data-polity-filter]");
      if (filterButton) {
        filter = filterButton.dataset.polityFilter || "all";
        visibleLimit = PAGE_SIZE;
        root.querySelectorAll("[data-polity-filter]").forEach((button) => button.classList.toggle("is-active", button === filterButton));
        render();
        return;
      }

      if (event.target.closest("[data-polity-load-more]")) {
        visibleLimit += PAGE_SIZE;
        render();
      }
    });

    render();
    refresh();
  }

  window.ATLAS_POLITY_BROWSER_VIEW = Object.freeze({ mount });
})();