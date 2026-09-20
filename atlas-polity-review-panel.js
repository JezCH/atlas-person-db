(() => {
  "use strict";

  const DATA = window.ATLAS_POLITY_REVIEW_CANDIDATES;
  if (!DATA) {
    console.warn("ATLAS polity review candidates are unavailable.");
    return;
  }

  const STORAGE_KEY = "atlas.polity.review.decisions.v1";
  const KIND_META = Object.freeze({
    confirmed_merge: Object.freeze({ label: "병합 확정", tone: "confirmed" }),
    merge_review: Object.freeze({ label: "통합 검토", tone: "review" }),
    split_review: Object.freeze({ label: "분리 검토", tone: "split" })
  });
  const STATUS_LABEL = Object.freeze({
    PRODUCTION_APPLIED_RETIRED: "Production 반영 완료",
    REVIEWED_MERGE_BLOCKED_SPATIAL: "병합 판정 · 공간 보존 선행",
    REVIEWED_MERGE_READY: "병합 판정 완료",
    REVIEWED_SPLIT_REQUIRED: "분리 판정 완료",
    NEEDS_SPLIT_REVIEW: "분리 추가 검토",
    PRODUCTION_APPLIED_SPLIT: "Production 분리 반영 완료",
    SUPERSEDED_NO_WRITE: "후속 검토로 폐기 · 별도 유지"
  });
  let liveDataPromise = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function allCases() {
    return [...DATA.confirmed_merges, ...DATA.review_candidates, ...DATA.split_candidates];
  }

  function readDecisions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeDecisions(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function decisionLabel(code) {
    return DATA.decision_options.find((item) => item.code === code)?.label || "미검토";
  }

  function defaultDecision(row) {
    return row.reviewed_decision || (row.kind === "confirmed_merge" ? "merge" : "");
  }

  function statusLabel(code) {
    return STATUS_LABEL[code] || String(code || "");
  }

  function normalizeName(value) {
    return String(value || "").normalize("NFKC").trim().toLocaleLowerCase("und").replace(/\s+/gu, " ");
  }

  function formatYear(value) {
    if (!Number.isInteger(value)) return "미상";
    if (value < 0) return `기원전 ${Math.abs(value)}`;
    if (value > 0) return `${value}`;
    return "0";
  }

  function formatActivitySpan(activity) {
    const start = Number.isInteger(activity?.activity_start) ? formatYear(activity.activity_start) : "시작 미상";
    const end = activity?.chronology_status === "ongoing"
      ? "현재"
      : Number.isInteger(activity?.activity_end) ? formatYear(activity.activity_end) : "종료 미상";
    return `${start}–${end}`;
  }

  function observedSpan(polity) {
    if (!polity || polity.activity_count === 0) return "연결 Activity 없음";
    const start = Number.isInteger(polity.first_activity_year) ? formatYear(polity.first_activity_year) : "시작 미상";
    const end = polity.has_ongoing_activity
      ? "현재"
      : Number.isInteger(polity.last_activity_year) ? formatYear(polity.last_activity_year) : "종료 미상";
    return `${start}–${end}`;
  }

  function buildLiveState(payload) {
    const polities = Array.isArray(payload?.polities) ? payload.polities : [];
    const byId = new Map();
    const byName = new Map();
    for (const polity of polities) {
      if (polity?.id) byId.set(String(polity.id), polity);
      const candidates = [
        polity?.canonical_name_en,
        polity?.preferred_name_ko,
        polity?.display_name,
        ...(Array.isArray(polity?.names) ? polity.names.map((row) => row?.name) : [])
      ];
      for (const name of candidates) {
        const key = normalizeName(name);
        if (!key) continue;
        const bucket = byName.get(key) || [];
        if (!bucket.some((item) => item.id === polity.id)) bucket.push(polity);
        byName.set(key, bucket);
      }
    }
    return Object.freeze({
      status: "ready",
      summary: payload?.summary || null,
      polities: Object.freeze(polities.slice()),
      byId,
      byName
    });
  }

  function emptyLiveState(status = "loading", error = null) {
    return {
      status,
      error,
      summary: null,
      polities: [],
      byId: new Map(),
      byName: new Map()
    };
  }

  function loadLiveData() {
    if (liveDataPromise) return liveDataPromise;
    const reader = window.ATLAS_POLITY_BROWSER_READER;
    if (!reader?.listPolities) return Promise.reject(new Error("정치체 read model을 불러오지 못했습니다."));
    liveDataPromise = reader.listPolities().then(buildLiveState).catch((error) => {
      liveDataPromise = null;
      throw error;
    });
    return liveDataPromise;
  }

  function resolveEntity(live, entity) {
    if (!entity) return null;
    if (entity.polity_id && live.byId.has(String(entity.polity_id))) return live.byId.get(String(entity.polity_id));
    for (const name of [entity.name, entity.ko]) {
      const matches = live.byName.get(normalizeName(name)) || [];
      if (matches.length === 1) return matches[0];
    }
    return null;
  }

  function groupActivitiesByPerson(polity) {
    const groups = new Map();
    for (const activity of polity?.activities || []) {
      const personId = String(activity.person_id || "");
      if (!personId) continue;
      if (!groups.has(personId)) {
        groups.set(personId, {
          person_id: personId,
          display_name: activity.person_display_name || activity.person_name_ko || activity.person_name_en || personId,
          activities: []
        });
      }
      groups.get(personId).activities.push(activity);
    }
    return [...groups.values()].sort((left, right) => {
      const firstYear = (group) => {
        const years = group.activities.map((row) => row.activity_start).filter(Number.isInteger);
        return years.length ? Math.min(...years) : Number.POSITIVE_INFINITY;
      };
      return firstYear(left) - firstYear(right)
        || String(left.display_name).localeCompare(String(right.display_name), "ko");
    });
  }

  function activityLine(activity) {
    const designation = activity.polity_designation_name_ko || activity.polity_designation_name_en || "";
    const semantics = [
      designation,
      activity.relation_code,
      activity.role_name || activity.role_code,
      activity.period_basis
    ].filter(Boolean).join(" · ");
    return `<span><b>${escapeHtml(formatActivitySpan(activity))}</b>${semantics ? ` · ${escapeHtml(semantics)}` : ""}</span>`;
  }

  function linkedPeopleHtml(polity, counterpart) {
    if (!polity) return '<p class="polity-review-live-missing">현재 live 정치체를 정확히 해석하지 못했습니다.</p>';
    const groups = groupActivitiesByPerson(polity);
    if (!groups.length) return '<p class="polity-review-live-missing">현재 연결된 인물 Activity가 없습니다.</p>';
    const counterpartIds = new Set(groupActivitiesByPerson(counterpart).map((group) => group.person_id));
    return `<div class="polity-review-person-links">
      <strong>연결 인물 ${groups.length}명</strong>
      <ul class="polity-review-person-list">${groups.map((group) => {
        const bridge = counterpartIds.has(group.person_id);
        return `<li class="${bridge ? "is-bridge-person" : ""}">
          <div class="polity-review-person-name">
            <strong>${escapeHtml(group.display_name)}</strong>
            ${bridge ? '<span>양쪽 연결</span>' : ""}
          </div>
          <div class="polity-review-person-activities">${group.activities.map(activityLine).join("")}</div>
        </li>`;
      }).join("")}</ul>
    </div>`;
  }

  function entityHtml(live, entity, counterpartEntity, label) {
    const polity = resolveEntity(live, entity);
    const counterpart = resolveEntity(live, counterpartEntity);
    const displayKo = polity?.preferred_name_ko || entity?.ko || entity?.name || "—";
    const displayEn = polity?.canonical_name_en || entity?.name || "";
    const polityId = polity?.id || entity?.polity_id || null;
    const stats = polity
      ? `<div class="polity-review-entity-stats">
          <span><b>${polity.activity_count}</b> Activity</span>
          <span><b>${polity.person_count}</b> Person</span>
          <span><b>${escapeHtml(observedSpan(polity))}</b> 관측 범위</span>
          ${polity.unresolved_activity_count ? `<span><b>${polity.unresolved_activity_count}</b> 연대 미해결</span>` : ""}
        </div>`
      : '<div class="polity-review-entity-stats is-missing"><span>live 통계 미해결</span></div>';

    return `<div class="polity-review-entity">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(displayKo)}</strong>
      <span>${escapeHtml(displayEn)}</span>
      ${polityId ? `<code>${escapeHtml(polityId)}</code>` : ""}
      ${stats}
      ${linkedPeopleHtml(polity, counterpart)}
    </div>`;
  }

  function caseSearchText(live, row) {
    const livePolities = [resolveEntity(live, row.left), resolveEntity(live, row.right)].filter(Boolean);
    const liveText = livePolities.flatMap((polity) => [
      polity.display_name,
      polity.canonical_name_en,
      polity.preferred_name_ko,
      observedSpan(polity),
      ...(polity.activities || []).flatMap((activity) => [
        activity.person_display_name,
        activity.person_name_en,
        activity.person_name_ko,
        activity.relation_code,
        activity.role_name,
        activity.role_code,
        formatActivitySpan(activity)
      ])
    ]);
    return [
      row.title,
      row.left?.name,
      row.left?.ko,
      row.right?.name,
      row.right?.ko,
      row.rationale,
      row.presentation_note,
      ...(row.evidence || []),
      ...liveText
    ].filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase("und");
  }

  function caseHtml(live, row, decision) {
    const meta = KIND_META[row.kind] || KIND_META.merge_review;
    const reviewed = row.reviewed_decision || "";
    const selected = decision?.decision || defaultDecision(row);
    const note = decision?.note || "";
    const locked = Boolean(row.locked);
    const evidence = (row.evidence || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const options = ['<option value="">미검토</option>', ...DATA.decision_options.map((item) =>
      `<option value="${escapeHtml(item.code)}"${selected === item.code ? " selected" : ""}>${escapeHtml(item.label)}</option>`
    )].join("");
    return `<article class="polity-review-card card" data-case-id="${escapeHtml(row.id)}" data-kind="${escapeHtml(row.kind)}">
      <div class="polity-review-card-head">
        <div>
          <span class="polity-review-kind is-${escapeHtml(meta.tone)}">${escapeHtml(meta.label)}</span>
          <h3>${escapeHtml(row.title)}</h3>
        </div>
        <span class="polity-review-state">${escapeHtml(statusLabel(row.status))}</span>
      </div>
      <div class="polity-review-pair">
        ${entityHtml(live, row.left || {}, row.right || {}, "왼쪽")}
        <div class="polity-review-arrow" aria-hidden="true">⇄</div>
        ${entityHtml(live, row.right || {}, row.left || {}, "오른쪽")}
      </div>
      <p class="polity-review-rationale">${escapeHtml(row.rationale)}</p>
      ${row.presentation_note ? `<div class="polity-review-presentation-note"><strong>시대별 표현 보존</strong><p>${escapeHtml(row.presentation_note)}</p></div>` : ""}
      <div class="polity-review-evidence"><strong>기존 감사 근거</strong><ul>${evidence}</ul></div>
      <div class="polity-review-suggestion"><span>${reviewed ? "검토 판정" : "검토 제안"}</span><strong>${escapeHtml(decisionLabel(reviewed || row.suggested_action))}</strong></div>
      <div class="polity-review-controls">
        <label>${locked ? "반영 상태" : "내 결정"}
          <select data-review-decision${locked ? " disabled" : ""}>${options}</select>
        </label>
        <label class="polity-review-note">메모
          <textarea rows="2" data-review-note placeholder="판단 근거 또는 후속 지시"${locked ? " disabled" : ""}>${escapeHtml(note)}</textarea>
        </label>
      </div>
    </article>`;
  }

  function datasetKpis(live) {
    const summary = live.summary;
    const value = (key) => summary && Number.isFinite(Number(summary[key])) ? Number(summary[key]).toLocaleString("ko-KR") : "—";
    return `<div class="polity-review-dataset-kpis">
      <div><small>전체 정치체</small><strong>${value("total_polities")}</strong></div>
      <div><small>인물 연결 정치체</small><strong>${value("linked_polities")}</strong></div>
      <div><small>연결 없음</small><strong>${value("orphan_polities")}</strong></div>
      <div><small>Person↔Polity Activity</small><strong>${value("activity_count")}</strong></div>
      <div><small>고유 연결 인물</small><strong>${value("unique_linked_persons")}</strong></div>
      <div><small>Person↔Polity 연결</small><strong>${value("person_polity_links")}</strong></div>
    </div>`;
  }

  function snapshot(decisions) {
    const cases = allCases();
    return {
      schema: "atlas-polity-review-decisions/v1",
      reviewed_at: new Date().toISOString(),
      candidate_source_generated_at: DATA.generated_at,
      decisions: cases
        .map((row) => {
          const saved = decisions[row.id] || null;
          const decision = saved?.decision || defaultDecision(row) || null;
          const note = saved?.note || null;
          return {
            case_id: row.id,
            kind: row.kind,
            title: row.title,
            decision,
            reviewed_decision: row.reviewed_decision || null,
            user_decision: saved?.decision || null,
            note,
            status: row.status || null,
            left_polity_id: row.left?.polity_id || null,
            right_polity_id: row.right?.polity_id || null
          };
        })
        .filter((row) => row.decision || row.note)
    };
  }

  function mount(root) {
    if (!root) return;
    let decisions = readDecisions();
    let filter = "all";
    let live = emptyLiveState();

    root.innerHTML = `<section class="polity-review-shell">
      <div class="polity-review-summary card">
        <div>
          <p class="eyebrow">POLITY IDENTITY REVIEW</p>
          <h2>충돌·Identity 검토</h2>
          <p>정치체 전체 통계와 실제 Person·Activity 연대를 함께 보면서 병합·유지·폐기·분리를 판단합니다. 이 화면의 선택은 검토 기록이며 Production을 직접 변경하지 않습니다.</p>
        </div>
        <div class="polity-review-summary-actions">
          <button type="button" class="btn" data-export-decisions>결정 JSON 내보내기</button>
          <button type="button" class="btn" data-copy-decisions>결정 JSON 복사</button>
        </div>
      </div>
      <section class="polity-review-dataset card" aria-live="polite">
        <div class="polity-review-dataset-head">
          <div><small>LIVE POLITY DATASET</small><strong>정치체 기본 통계</strong></div>
          <span data-live-status>불러오는 중</span>
        </div>
        <div data-dataset-kpis>${datasetKpis(live)}</div>
      </section>
      <div class="polity-review-model-note card">
        <strong>Identity 통합 ≠ 시대별 표현 통합</strong>
        <p>같은 장기 정치체 identity로 정리하더라도 국호·국가형태·공간·상징이 시대에 따라 달랐다면 그 차이는 temporal metadata로 보존해야 합니다. 검토 카드는 현재 연결 인물과 관측 연대를 보여주어 이 경계를 판단할 수 있게 합니다.</p>
      </div>
      <div class="polity-review-kpis">
        <button class="card polity-review-filter is-active" type="button" data-kind-filter="all"><small>전체 검토</small><strong>${allCases().length}</strong></button>
        <button class="card polity-review-filter" type="button" data-kind-filter="confirmed_merge"><small>병합 확정</small><strong>${DATA.confirmed_merges.length}</strong></button>
        <button class="card polity-review-filter" type="button" data-kind-filter="merge_review"><small>통합 검토</small><strong>${DATA.review_candidates.length}</strong></button>
        <button class="card polity-review-filter" type="button" data-kind-filter="split_review"><small>분리 검토</small><strong>${DATA.split_candidates.length}</strong></button>
      </div>
      <div class="polity-review-toolbar card">
        <input type="search" data-review-search placeholder="정치체명·인물명·연대·근거 검색" />
        <span data-review-progress></span>
      </div>
      <div class="polity-review-list" data-review-list></div>
    </section>`;

    const list = root.querySelector("[data-review-list]");
    const search = root.querySelector("[data-review-search]");
    const progress = root.querySelector("[data-review-progress]");
    const liveStatus = root.querySelector("[data-live-status]");
    const kpis = root.querySelector("[data-dataset-kpis]");

    function render() {
      const needle = String(search?.value || "").normalize("NFKC").trim().toLocaleLowerCase("und");
      const rows = allCases().filter((row) => {
        if (filter !== "all" && row.kind !== filter) return false;
        if (!needle) return true;
        return caseSearchText(live, row).includes(needle);
      });
      list.innerHTML = rows.map((row) => caseHtml(live, row, decisions[row.id])).join("");
      const reviewed = allCases().filter((row) => Boolean(row.reviewed_decision)).length;
      const explicit = allCases().filter((row) => Boolean(decisions[row.id]?.decision || decisions[row.id]?.note)).length;
      progress.textContent = `검토 판정 ${reviewed}/${allCases().length} · 내 입력 ${explicit}`;
      if (kpis) kpis.innerHTML = datasetKpis(live);
      if (liveStatus) {
        liveStatus.textContent = live.status === "ready"
          ? "Production Authoring 기준"
          : live.status === "error" ? "live 데이터 읽기 실패" : "불러오는 중";
        liveStatus.classList.toggle("is-error", live.status === "error");
      }
    }

    root.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-kind-filter]");
      if (filterButton) {
        filter = filterButton.dataset.kindFilter || "all";
        root.querySelectorAll("[data-kind-filter]").forEach((button) => button.classList.toggle("is-active", button === filterButton));
        render();
        return;
      }
      if (event.target.closest("[data-export-decisions]")) {
        const blob = new Blob([JSON.stringify(snapshot(decisions), null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `atlas-polity-review-${new Date().toISOString().slice(0,10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (event.target.closest("[data-copy-decisions]")) {
        const payload = JSON.stringify(snapshot(decisions), null, 2);
        navigator.clipboard?.writeText(payload).then(() => {
          event.target.closest("[data-copy-decisions]").textContent = "복사됨";
          setTimeout(() => {
            const button = root.querySelector("[data-copy-decisions]");
            if (button) button.textContent = "결정 JSON 복사";
          }, 1200);
        }).catch(() => {});
      }
    });

    root.addEventListener("change", (event) => {
      const card = event.target.closest("[data-case-id]");
      if (!card) return;
      const id = card.dataset.caseId;
      const decision = card.querySelector("[data-review-decision]")?.value || "";
      const note = card.querySelector("[data-review-note]")?.value || "";
      decisions = { ...decisions, [id]: { decision, note, updated_at: new Date().toISOString() } };
      writeDecisions(decisions);
      render();
    });

    root.addEventListener("input", (event) => {
      if (event.target.matches("[data-review-search]")) return render();
      if (!event.target.matches("[data-review-note]")) return;
      const card = event.target.closest("[data-case-id]");
      if (!card) return;
      const id = card.dataset.caseId;
      const decision = card.querySelector("[data-review-decision]")?.value || "";
      const note = event.target.value || "";
      decisions = { ...decisions, [id]: { decision, note, updated_at: new Date().toISOString() } };
      writeDecisions(decisions);
    });

    render();
    loadLiveData().then((nextLive) => {
      live = nextLive;
      render();
    }).catch((error) => {
      console.error("ATLAS Polity live context failed", error);
      live = emptyLiveState("error", error);
      render();
    });
  }

  window.ATLAS_POLITY_REVIEW_PANEL = Object.freeze({ mount, snapshot });
})();
