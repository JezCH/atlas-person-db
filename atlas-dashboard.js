(() => {
  "use strict";

  const store = window.ATLAS_CLIENT_DATA_STORE;
  const model = window.ATLAS_DASHBOARD_MODEL;
  if (!store || !model) {
    console.error("ATLAS dashboard requires shared data store and dashboard model");
    return;
  }

  const domainRegistry = window.ATLAS_PERSON_DOMAIN_REGISTRY;
  if (!domainRegistry) {
    console.error("ATLAS dashboard requires Person domain registry");
    return;
  }

  let mountedRoot = null;
  let requestSerial = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function value(value) { return value == null ? "—" : Number(value).toLocaleString("ko-KR"); }
  function pct(value) { return value == null ? "—" : `${Number(value).toFixed(Number(value) % 1 ? 1 : 0)}%`; }

  function progressRow(label, row, detail) {
    const known = row?.done != null && row?.total != null && row?.percentage != null;
    return `<article class="dashboard-progress-row">
      <div class="dashboard-progress-copy"><div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail || "")}</span></div>
        <b>${known ? `${value(row.done)} / ${value(row.total)}` : "원본 확인 실패"}</b></div>
      <div class="dashboard-progress-track" aria-label="${escapeHtml(label)} 진행률" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${known ? row.percentage : 0}">
        <span style="width:${known ? row.percentage : 0}%"></span>
      </div>
      <div class="dashboard-progress-meta"><span>${known ? pct(row.percentage) : "—"}</span><span>잔여 ${known ? value(row.remaining) : "—"}</span></div>
    </article>`;
  }

  function sourceCard(source) {
    const ready = source.status === "ready";
    const loading = source.status === "loading";
    const state = ready ? "정상" : loading ? "확인 중" : source.status === "error" ? "오류" : "대기";
    return `<article class="dashboard-source-card" data-source-state="${escapeHtml(source.status)}">
      <span class="dashboard-source-dot" aria-hidden="true"></span>
      <div><strong>${escapeHtml(source.label)}</strong><small>${escapeHtml(source.url || "")}</small></div>
      <b>${escapeHtml(state)}</b>
      ${source.error ? `<p>${escapeHtml(source.error)}</p>` : ""}
    </article>`;
  }

  function renderLoading(root) {
    root.innerHTML = `<section class="dashboard-control-center">
      <div class="dashboard-hero card"><div><p class="eyebrow">ATLAS CONTROL CENTER</p><h2>프로젝트 현황을 불러오는 중</h2><p>Person·Domain·Spatial·Non-timeline 기준 원본을 하나의 shared store에서 읽고 있습니다.</p></div></div>
      <div class="dashboard-loading-grid"><span></span><span></span><span></span><span></span></div>
    </section>`;
  }

  function renderSnapshot(root, snapshot) {
    const k = snapshot.kpis;
    const w = snapshot.work;
    const q = snapshot.quality;
    const domainRows = model.DOMAIN_CODES.map((code) => `<div class="dashboard-domain-row" data-domain="${escapeHtml(code)}">
      <span class="dashboard-domain-swatch" aria-hidden="true"></span><span>${escapeHtml(domainRegistry.LABELS[code] || code)}</span><b>${value(snapshot.domain_breakdown[code])}</b>
    </div>`).join("");

    root.innerHTML = `<section class="dashboard-control-center">
      <header class="dashboard-hero card">
        <div><p class="eyebrow">ATLAS CONTROL CENTER</p><h2>데이터·작업·시스템 현황</h2><p>대시보드 전용 숫자를 저장하지 않습니다. 모든 값은 현재 기준 원본에서 즉시 파생됩니다.</p></div>
        <button id="atlasDashboardRefresh" type="button" class="btn">↻ 원본 다시 읽기</button>
      </header>

      <section class="dashboard-kpi-grid" aria-label="핵심 통계">
        <article class="dashboard-kpi card"><small>PERSONS</small><strong>${value(k.persons)}</strong><span>historical ${value(k.historical)} · 기타 ${value(k.other_historicity)}</span></article>
        <article class="dashboard-kpi card"><small>RUNTIME ACTIVITIES</small><strong>${value(k.activities)}</strong><span>Person Runtime projection</span></article>
        <article class="dashboard-kpi card"><small>USED POLITIES</small><strong>${value(k.polities)}</strong><span>현재 Person Activity에서 참조</span></article>
        <article class="dashboard-kpi card"><small>DOMAIN COVERAGE</small><strong>${pct(w.domain.percentage)}</strong><span>잔여 ${value(w.domain.remaining)}</span></article>
        <article class="dashboard-kpi card"><small>NAMUWIKI REVIEW</small><strong>${pct(w.namuwiki.percentage)}</strong><span>연결 ${value(w.namuwiki.linked)} · 없음확인 ${value(w.namuwiki.not_found)}</span></article>
        <article class="dashboard-kpi card"><small>SPATIAL READY</small><strong>${pct(w.spatial.percentage)}</strong><span>잔여 ${value(w.spatial.remaining)}</span></article>
      </section>

      <section class="dashboard-main-grid">
        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">WORK FRONTIER</p><h3>작업 진행</h3></div><span>실데이터 기준</span></div>
          <div class="dashboard-progress-list">
            ${progressRow("대표 분야 분류", w.domain, "persons.representative_domain")}
            ${progressRow("나무위키 검토", w.namuwiki, "linked + not_found")}
            ${progressRow("Spatial 준비", w.spatial, "leaf / reviewed place-function")}
            ${progressRow("Runtime Activity 연결", w.runtime_activity, "Runtime Activity가 1건 이상인 Person")}
          </div>
        </article>

        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">DATA QUALITY</p><h3>잔여·보류</h3></div><span>숨기지 않음</span></div>
          <div class="dashboard-issue-grid">
            <button type="button" data-dashboard-route="persons"><span>분야 미분류</span><strong>${value(q.domain_unclassified)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>나무위키 미검토</span><strong>${value(q.namuwiki_missing)}</strong></button>
            <button type="button" data-dashboard-route="spacetime"><span>Spatial 미해결</span><strong>${value(q.spatial_unresolved)}</strong></button>
            <button type="button" data-dashboard-route="spacetime"><span>Spatial review queue</span><strong>${value(q.spatial_review)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>Runtime Activity 없음</span><strong>${value(q.no_runtime_activity)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>Non-timeline registry</span><strong>${value(q.non_timeline_registry)}</strong></button>
          </div>
        </article>
      </section>

      <section class="dashboard-lower-grid">
        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">PERSON DOMAINS</p><h3>대표 분야 분포</h3></div><span>공식 8색 token 재사용</span></div>
          <div class="dashboard-domain-list">${domainRows}</div>
        </article>

        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">SOURCE HEALTH</p><h3>기준 원본 상태</h3></div><span>대시보드용 복제 DB 없음</span></div>
          <div class="dashboard-source-list">${snapshot.sources.map(sourceCard).join("")}</div>
        </article>
      </section>

      <section class="dashboard-tools card">
        <div><p class="eyebrow">WORKSPACE</p><h3>작업 화면</h3><p>바로가기는 관제 정보 아래의 보조 기능으로만 둡니다.</p></div>
        <div class="dashboard-tool-actions">
          <button type="button" class="btn" data-dashboard-route="persons">인물</button>
          <button type="button" class="btn" data-dashboard-route="spacetime">시공간 인물도</button>
          <a class="btn" href="./admin.html">데이터 관리자</a>
        </div>
      </section>
    </section>`;

    root.querySelector("#atlasDashboardRefresh")?.addEventListener("click", () => refresh({ force:true }));
    root.querySelectorAll("[data-dashboard-route]").forEach((button) => button.addEventListener("click", () => {
      window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain?.(button.dataset.dashboardRoute);
    }));
  }

  function settledValue(result) { return result?.status === "fulfilled" ? result.value : null; }

  async function refresh({ force = false } = {}) {
    const root = mountedRoot;
    if (!root?.isConnected) return;
    const serial = ++requestSerial;
    renderLoading(root);

    const [persons, domains, spatial, nonTimeline] = await Promise.allSettled([
      store.loadPersons({ force }),
      store.loadPersonDomains({ force }),
      store.loadSpatialIndex({ force }),
      store.loadNonTimelinePersons({ force })
    ]);
    if (serial !== requestSerial || root !== mountedRoot || !root.isConnected) return;

    const personResult = settledValue(persons);
    if (!personResult) {
      root.innerHTML = `<section class="dashboard-control-center"><article class="dashboard-error card"><h2>Person 기준 원본을 읽지 못했습니다.</h2><p>${escapeHtml(persons.reason?.message || persons.reason || "unknown")}</p><button id="atlasDashboardRetry" class="btn" type="button">다시 시도</button></article></section>`;
      root.querySelector("#atlasDashboardRetry")?.addEventListener("click", () => refresh({ force:true }));
      return;
    }

    const snapshot = model.buildDashboardSnapshot({
      personResult,
      domainResult:settledValue(domains),
      spatialIndex:settledValue(spatial),
      nonTimelineRows:settledValue(nonTimeline),
      sourceStates:store.sourceStates()
    });
    renderSnapshot(root, snapshot);
  }

  function mount(root) {
    if (!root) return;
    mountedRoot = root;
    refresh();
  }

  window.addEventListener("atlas-client-data-source-updated", () => {
    if (window.ATLAS_MAIN_AUTHORITY_NAV?.getDomain?.() === "dashboard" && mountedRoot?.isConnected) {
      // 다른 화면의 authoritative write가 shared store를 갱신하면 다음 dashboard 진입/새로고침에서 동일 값을 사용한다.
    }
  });

  window.ATLAS_DASHBOARD = Object.freeze({ mount, refresh });
})();