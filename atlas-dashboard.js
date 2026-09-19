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

  function kpiCard({ code, label, primary, detail, drilldown }) {
    const actionable = drilldown?.available === true
      && drilldown?.route === "persons"
      && (drilldown.mode === "all_persons" || Array.isArray(drilldown.person_ids));
    const disabled = actionable && drilldown.mode === "person_ids" && drilldown.person_ids.length === 0;
    const inner = `<small>${escapeHtml(label)}</small><strong>${escapeHtml(primary)}</strong><span>${escapeHtml(detail)}</span>`;
    if (!actionable) return `<article class="dashboard-kpi card" title="${escapeHtml(drilldown?.unavailable_reason || "")}">${inner}</article>`;
    return `<button type="button" class="dashboard-kpi dashboard-kpi-action card" data-dashboard-kpi="${escapeHtml(code)}" ${disabled ? "disabled" : ""}>${inner}</button>`;
  }

  function attentionButton(item) {
    const unavailable = item?.available !== true;
    const disabled = unavailable || Number(item?.count || 0) <= 0;
    const state = unavailable ? "Source unavailable" : `${value(item.count)}명`;
    const title = unavailable ? item?.unavailable_reason || "SOURCE_UNAVAILABLE" : `${item.label} 대상 ${value(item.count)}명`;
    return `<button type="button" data-dashboard-attention="${escapeHtml(item?.code || "")}" ${disabled ? "disabled" : ""} title="${escapeHtml(title)}">
      <span>${escapeHtml(item?.label || item?.code || "Attention")}</span><strong>${unavailable ? "—" : value(item.count)}</strong>
      <small>${escapeHtml(state)}</small>
    </button>`;
  }

  function breakdownCard(label, item) {
    const total = item?.total == null ? "—" : value(item.total);
    const unit = item?.unit === "polity" ? "polities" : item?.unit === "activity" ? "activities" : "persons";
    const rows = (item?.rows || []).map((row) => `<div class="dashboard-domain-row">
      <span title="${escapeHtml(row.label || row.code || "")}">${escapeHtml(row.label || row.code || "unknown")}</span><b>${value(row.count)}</b>
    </div>`).join("");
    const unattributed = Number(item?.unattributed_count || 0) > 0
      ? `<div class="dashboard-domain-row"><span>Reason unavailable</span><b>${value(item.unattributed_count)}</b></div>`
      : "";
    return `<article class="dashboard-panel card">
      <div class="dashboard-panel-head"><div><p class="eyebrow">INCOMPLETE REASONS</p><h3>${escapeHtml(label)}</h3></div><span>${total} ${unit}</span></div>
      <div class="dashboard-domain-list">${rows || unattributed ? rows + unattributed : `<div class="dashboard-domain-row"><span>${escapeHtml(item?.unavailable_reason || "Reason source unavailable")}</span><b>—</b></div>`}</div>
    </article>`;
  }

  function shouldRenderBreakdown(item) {
    if (item?.total == null) return item?.available !== true;
    return Number(item.total) > 0;
  }

  function recentTimelineEntry(entry) {
    const person = entry?.display_name || (entry?.person_id ? entry.person_id : "Project-wide");
    const timestamp = entry?.occurred_at
      ? new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeStyle:"short"}).format(new Date(entry.occurred_at))
      : "—";
    const count = Number(entry?.change_count || 0);
    return `<article class="dashboard-timeline-entry" data-timeline-kind="${escapeHtml(entry?.kind || "unknown")}">
      <span class="dashboard-timeline-node" aria-hidden="true"></span>
      <div class="dashboard-timeline-copy">
        <div><strong>${escapeHtml(entry?.label || entry?.operation || entry?.kind || "Change")}</strong><span class="dashboard-unit-badge">${escapeHtml(entry?.kind || "unknown")}</span></div>
        <small>${escapeHtml(person)}</small>
      </div>
      <div class="dashboard-timeline-meta"><b>${escapeHtml(timestamp)}</b><small>${count > 0 ? `${value(count)} changes` : "change count unavailable"}</small></div>
    </article>`;
  }

  function recentTimelineSummary(timeline) {
    return (timeline?.kind_summary || []).map((item) => `<span><b>${escapeHtml(item.kind)}</b> ${value(item.event_count)} events · ${value(item.change_count)} changes</span>`).join("");
  }

  function systemCard(label, primary, detail, state = "ready") {
    return `<article class="dashboard-source-card" data-source-state="${escapeHtml(state)}">
      <span class="dashboard-source-dot" aria-hidden="true"></span>
      <div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(detail || "")}</small></div>
      <b>${escapeHtml(primary == null || primary === "" ? "—" : primary)}</b>
    </article>`;
  }

  function heatmapLevel(count,maxCount) {
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(maxCount) || maxCount <= 0) return 0;
    return Math.max(1,Math.min(4,Math.ceil((count / maxCount) * 4)));
  }

  function heatmapTable(heatmap) {
    if (!heatmap?.available) return `<div class="dashboard-heatmap-unavailable">${escapeHtml(heatmap?.unavailable_reason || "Heatmap unavailable")}</div>`;
    const head=heatmap.regions.map((region)=>`<th scope="col" title="${escapeHtml(region.label)}">${escapeHtml(region.label)}</th>`).join("");
    const body=heatmap.rows.map((row)=>`<tr>
      <th scope="row"><strong>${escapeHtml(row.era.label)}</strong><small>${escapeHtml(row.era.range)}</small></th>
      ${row.cells.map((cell)=>`<td data-heatmap-level="${heatmapLevel(cell.count,heatmap.max_count)}" title="${escapeHtml(`${row.era.label} × ${heatmap.regions.find((region)=>region.code===cell.region_code)?.label || cell.region_code}: ${cell.count} activities`)}"><span>${value(cell.count)}</span></td>`).join("")}
    </tr>`).join("");
    return `<div class="dashboard-heatmap-wrap"><table class="dashboard-heatmap"><thead><tr><th scope="col">ERA \ REGION</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function completenessTable(matrix) {
    const rows=(matrix?.rows || []).map((row)=>{
      const known=row?.available === true;
      const incomplete=known ? value(row.incomplete) : "—";
      const actionable=known && row.unit === "person" && Array.isArray(row.person_ids) && row.person_ids.length > 0;
      const incompleteCell=actionable
        ? `<button type="button" data-dashboard-completeness="${escapeHtml(row.code)}" title="${escapeHtml(`${row.label} 미완료 ${row.incomplete}명 보기`)}">${incomplete}</button>`
        : `<span>${incomplete}</span>`;
      return `<tr data-completeness-unit="${escapeHtml(row.unit)}">
        <th scope="row"><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.source)}</small></th>
        <td><span class="dashboard-unit-badge">${escapeHtml(row.unit)}</span></td>
        <td>${known ? value(row.complete) : "—"}</td>
        <td>${incompleteCell}</td>
        <td>${known ? pct(row.percentage) : "—"}</td>
        <td>${known ? value(row.total) : `<span title="${escapeHtml(row.unavailable_reason || "SOURCE_UNAVAILABLE")}">—</span>`}</td>
      </tr>`;
    }).join("");
    return `<div class="dashboard-completeness-wrap"><table class="dashboard-completeness">
      <thead><tr><th scope="col">CHECK</th><th scope="col">UNIT</th><th scope="col">COMPLETE</th><th scope="col">INCOMPLETE</th><th scope="col">COVERAGE</th><th scope="col">TOTAL</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
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
    const a = snapshot.attention_queue;
    const b = snapshot.incomplete_breakdown;
    const kd = snapshot.kpi_drilldown;
    const rd = snapshot.recent_delta;
    const timeline = snapshot.recent_activity_timeline;
    const sys = snapshot.system_strip;
    const heatmap = snapshot.coverage_heatmap;
    const completeness = snapshot.completeness_matrix;
    const sourceIssues = (snapshot.sources || []).filter((source) => source?.status !== "ready");
    const incompleteCards = [
      ["Representative Domain",b.domain],
      ["NamuWiki",b.namuwiki],
      ["Spatial",b.spatial],
      ["Runtime Exclusion",b.runtime]
    ].filter(([,item]) => shouldRenderBreakdown(item));
    const domainRows = model.DOMAIN_CODES.map((code) => `<div class="dashboard-domain-row" data-domain="${escapeHtml(code)}">
      <span class="dashboard-domain-swatch" aria-hidden="true"></span><span>${escapeHtml(domainRegistry.LABELS[code] || code)}</span><b>${value(snapshot.domain_breakdown[code])}</b>
    </div>`).join("");

    root.innerHTML = `<section class="dashboard-control-center">
      <header class="dashboard-hero card">
        <div><p class="eyebrow">ATLAS CONTROL CENTER</p><h2>데이터·작업·시스템 현황</h2><p>대시보드 전용 숫자를 저장하지 않습니다. 모든 값은 현재 기준 원본에서 즉시 파생됩니다.</p></div>
        <button id="atlasDashboardRefresh" type="button" class="btn">↻ 원본 다시 읽기</button>
      </header>

      <section class="dashboard-kpi-grid" aria-label="핵심 통계">
        ${kpiCard({code:"persons",label:"PERSONS",primary:value(k.persons),detail:`historical ${value(k.historical)} · 기타 ${value(k.other_historicity)}`,drilldown:kd.persons})}
        ${kpiCard({code:"domain",label:"DOMAIN COVERAGE",primary:pct(w.domain.percentage),detail:`${value(w.domain.done)} / ${value(w.domain.total)} · 잔여 ${value(w.domain.remaining)}`,drilldown:kd.domain})}
        ${kpiCard({code:"namuwiki",label:"NAMUWIKI REVIEW",primary:pct(w.namuwiki.percentage),detail:`${value(w.namuwiki.done)} / ${value(w.namuwiki.total)} · 잔여 ${value(w.namuwiki.remaining)}`,drilldown:kd.namuwiki})}
        ${kpiCard({code:"spatial",label:"SPATIAL READY",primary:pct(w.spatial.percentage),detail:`${value(w.spatial.done)} / ${value(w.spatial.total)} · 잔여 ${value(w.spatial.remaining)}`,drilldown:kd.spatial})}
        ${kpiCard({code:"activities",label:"RUNTIME ACTIVITIES",primary:value(k.activities),detail:"Person Runtime projection",drilldown:kd.activities})}
        ${kpiCard({code:"polities",label:"USED POLITIES",primary:value(k.polities),detail:"현재 Person Activity에서 참조",drilldown:kd.polities})}
      </section>

      <section class="dashboard-panel card" aria-label="시스템 및 Production 상태">
        <div class="dashboard-panel-head"><div><p class="eyebrow">SYSTEM / PRODUCTION</p><h3>현재 실행 환경</h3></div><span>${sys.available ? "runtime identity" : "identity unavailable"}</span></div>
        <div class="dashboard-source-list">
          ${systemCard("ENVIRONMENT",sys.environment,sys.production_main === true ? "Production · main" : sys.production_main === false ? "Production/main 조합 아님" : "환경 판정 불가",sys.available ? "ready" : "error")}
          ${systemCard("DEPLOYED GIT",sys.git_commit_short,sys.git_commit_ref ? `ref ${sys.git_commit_ref}` : "commit/ref unavailable",sys.git_commit_sha && sys.git_commit_ref ? "ready" : "idle")}
          ${systemCard("RUNTIME",sys.provider,sys.region ? `region ${sys.region}` : "region unavailable",sys.available ? "ready" : "error")}
          ${systemCard("SHARED SOURCES",sys.source_health.ready == null ? null : `${sys.source_health.ready}/${sys.source_health.total}`,sys.source_health.available ? `errors ${sys.source_health.errors} · loading ${sys.source_health.loading}` : "source states unavailable",sys.source_health.errors > 0 ? "error" : sys.source_health.available ? "ready" : "idle")}
        </div>
        <div class="dashboard-progress-meta">
          <span>${sys.identity_complete ? "Runtime identity complete" : "Runtime identity partial"}</span>
          <span>GitHub Actions 상태는 runtime identity와 별도</span>
        </div>
        ${sourceIssues.length ? `<div class="dashboard-source-issues" aria-label="비정상 source 상세">
          <p class="eyebrow">SOURCE ISSUES</p>
          <div class="dashboard-source-list">${sourceIssues.map(sourceCard).join("")}</div>
        </div>` : ""}
      </section>

      <section class="dashboard-panel card">
        <div class="dashboard-panel-head"><div><p class="eyebrow">NEEDS ATTENTION</p><h3>지금 처리할 대상</h3></div><span>canonical snapshots only</span></div>
        <div class="dashboard-issue-grid">
          ${a.items.map(attentionButton).join("")}
        </div>
        <div class="dashboard-progress-meta">
          <span>Known outstanding checks <b>${value(a.known_outstanding_checks)}</b></span>
          <span>Known affected persons <b>${value(a.known_affected_persons)}</b></span>
          <span>${a.complete ? "전체 범주 확인됨" : `부분 집계 · ${value(a.available_categories)}/${value(a.total_categories)} 범주만 대상 집합 확인`}</span>
        </div>
      </section>

      <section class="dashboard-main-grid">
        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">WORK FRONTIER</p><h3>작업 진행</h3></div><span>실데이터 기준</span></div>
          <div class="dashboard-progress-list">
            ${progressRow("대표 분야 분류", w.domain, "persons.representative_domain")}
            ${progressRow("나무위키 검토", w.namuwiki, "linked + not_found")}
            ${progressRow("Spatial 준비", w.spatial, "Runtime Activity placement")}
            ${progressRow("Runtime Activity 연결", w.runtime_activity, "Runtime Activity가 1건 이상인 Person")}
          </div>
        </article>

        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">DATA QUALITY</p><h3>구조·예외 상태</h3></div><span>중복 지표 제외</span></div>
          <div class="dashboard-issue-grid">
            <button type="button" data-dashboard-route="spacetime"><span>Spatial 미해결</span><strong>${value(q.spatial_unresolved)}</strong></button>
            <button type="button" data-dashboard-route="spacetime"><span>Spatial review queue</span><strong>${value(q.spatial_review)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>Runtime Activity 없음</span><strong>${value(q.no_runtime_activity)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>Non-timeline registry</span><strong>${value(q.non_timeline_registry)}</strong></button>
          </div>
        </article>
      </section>

      <section class="dashboard-panel card" aria-label="데이터 완성도 행렬">
        <div class="dashboard-panel-head"><div><p class="eyebrow">COMPLETENESS MATRIX</p><h3>축별 완성도</h3></div><span>Person 3 checks · Activity 2 checks</span></div>
        ${completenessTable(completeness)}
        <div class="dashboard-progress-meta">
          <span>Person과 Activity 단위를 합산하지 않음</span>
          <span>— = canonical source unavailable</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="시대별 권역별 Activity coverage">
        <div class="dashboard-panel-head"><div><p class="eyebrow">ERA × REGION COVERAGE</p><h3>시공간 Activity 분포</h3></div><span>${heatmap.available ? `placed ${value(heatmap.placed_activity_count)} · unresolved ${value(heatmap.unresolved_activity_count)}` : "source unavailable"}</span></div>
        ${heatmapTable(heatmap)}
        <div class="dashboard-progress-meta">
          <span>canonical 10 Era bands × Spatial macroregions</span>
          <span>한 Activity는 같은 시대·권역에서 segment가 여러 개여도 1회 집계</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="최근 프로젝트 변경 타임라인">
        <div class="dashboard-panel-head"><div><p class="eyebrow">RECENT DELTA · RECENT ACTIVITY TIMELINE</p><h3>최근 추적 변경 타임라인</h3></div><span>${timeline.available ? `${value(timeline.event_count)} events · ${value(timeline.total_change_count)} changes` : "source unavailable"}</span></div>
        ${timeline.available
          ? (timeline.entries.length
            ? `<div class="dashboard-timeline">${timeline.entries.map(recentTimelineEntry).join("")}</div>`
            : '<div class="dashboard-heatmap-unavailable">현재 canonical mutation ledger에 표시할 변경이 없습니다.</div>')
          : '<div class="dashboard-heatmap-unavailable">Recent Delta canonical source unavailable</div>'}
        <div class="dashboard-timeline-summary">${timeline.available ? recentTimelineSummary(timeline) : ""}</div>
        <div class="dashboard-progress-meta">
          <span>Person-scoped ${timeline.available ? value(timeline.person_scoped_count) : "—"} · Project-wide ${timeline.available ? value(timeline.project_wide_count) : "—"}</span>
          <span>Tracked ${escapeHtml((rd.tracked_sources || []).join(" · ") || "—")}</span>
          <span>${rd.gaps?.length ? `Coverage gap · ${escapeHtml(rd.gaps.join(", "))}` : "Tracked mutation coverage complete"}</span>
        </div>
      </section>



      <section class="dashboard-lower-grid" aria-label="미완료 사유">
        ${incompleteCards.length
          ? incompleteCards.map(([label,item]) => breakdownCard(label,item)).join("")
          : '<article class="dashboard-panel card"><div class="dashboard-panel-head"><div><p class="eyebrow">INCOMPLETE REASONS</p><h3>미완료 원인 없음</h3></div><span>0</span></div></article>'}
      </section>

      <section class="dashboard-lower-grid">
        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">PERSON DOMAINS</p><h3>대표 분야 분포</h3></div><span>공식 8색 token 재사용</span></div>
          <div class="dashboard-domain-list">${domainRows}</div>
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
    root.querySelectorAll("[data-dashboard-kpi]").forEach((button) => button.addEventListener("click", () => {
      const item = kd?.[button.dataset.dashboardKpi];
      if (!item?.available || item.route !== "persons") return;
      window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain?.("persons");
      if (item.mode === "all_persons") {
        window.ATLAS_PERSON_MAIN?.clearDashboardFilter?.();
        return;
      }
      if (!Array.isArray(item.person_ids) || !item.person_ids.length) return;
      window.ATLAS_PERSON_MAIN?.setDashboardFilter?.({
        code:`kpi_${item.code}`,
        label:item.label,
        personIds:item.person_ids
      });
    }));
    root.querySelectorAll("[data-dashboard-completeness]").forEach((button) => button.addEventListener("click", () => {
      const item=completeness?.rows?.find((row)=>row.code === button.dataset.dashboardCompleteness);
      if (!item?.drilldown_available || item.unit !== "person" || !Array.isArray(item.person_ids) || !item.person_ids.length) return;
      window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain?.("persons");
      window.ATLAS_PERSON_MAIN?.setDashboardFilter?.({
        code:`completeness_${item.code}`,
        label:`${item.label} 미완료`,
        personIds:item.person_ids
      });
    }));
    root.querySelectorAll("[data-dashboard-attention]").forEach((button) => button.addEventListener("click", () => {
      const item = a.items.find((row) => row.code === button.dataset.dashboardAttention);
      if (!item?.available || !Array.isArray(item.person_ids) || !item.person_ids.length) return;
      window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain?.("persons");
      window.ATLAS_PERSON_MAIN?.setDashboardFilter?.({
        code:item.code,
        label:item.label,
        personIds:item.person_ids
      });
    }));
    root.querySelectorAll("[data-dashboard-route]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.dashboardRoute === "persons") window.ATLAS_PERSON_MAIN?.clearDashboardFilter?.();
      window.ATLAS_MAIN_AUTHORITY_NAV?.showDomain?.(button.dataset.dashboardRoute);
    }));
  }

  function settledValue(result) { return result?.status === "fulfilled" ? result.value : null; }

  async function refresh({ force = false } = {}) {
    const root = mountedRoot;
    if (!root?.isConnected) return;
    const serial = ++requestSerial;
    renderLoading(root);

    const [persons, domains, spatial, nonTimeline, recentDelta, systemIdentity] = await Promise.allSettled([
      store.loadPersons({ force }),
      store.loadPersonDomains({ force }),
      store.loadSpatialIndex({ force }),
      store.loadNonTimelinePersons({ force }),
      store.loadRecentDelta({ force }),
      store.loadSystemIdentity({ force })
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
      recentDeltaResult:settledValue(recentDelta),
      systemIdentityResult:settledValue(systemIdentity),
      sourceStates:store.sourceStates()
    });
    renderSnapshot(root, snapshot);
  }

  function mount(root) {
    if (!root) return;
    mountedRoot = root;
    refresh();
  }

  window.ATLAS_DASHBOARD = Object.freeze({ mount, refresh });
})();