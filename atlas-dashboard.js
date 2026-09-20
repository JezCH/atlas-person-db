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
    const diagnosticHref = unavailable ? String(item?.action_href || "").trim() : "";
    const reason = unavailable ? reasonLabel(item?.unavailable_reason) || "원본 확인 불가" : "";
    const itemUnit = unitLabel(item?.unit || "person");
    const state = unavailable
      ? `${reason}${item?.action_label ? ` · ${item.action_label}` : ""}`
      : `${value(item.count)} ${itemUnit}`;
    const title = unavailable ? state : `${item.label} 대상 ${value(item.count)} ${itemUnit}`;
    const inner = `<span>${escapeHtml(item?.label || item?.code || "확인 필요")}</span><strong>${unavailable ? "—" : value(item.count)}</strong>
      <small>${escapeHtml(state)}</small>`;
    if (diagnosticHref) {
      return `<a class="dashboard-attention-link" data-dashboard-attention-diagnostic="${escapeHtml(item?.code || "")}" href="${escapeHtml(diagnosticHref)}" title="${escapeHtml(title)}">${inner}</a>`;
    }
    return `<button type="button" data-dashboard-attention="${escapeHtml(item?.code || "")}" ${disabled ? "disabled" : ""} title="${escapeHtml(title)}">${inner}</button>`;
  }

  function unitLabel(unit) {
    if (unit === "polity") return "정치체";
    if (unit === "activity") return "활동";
    if (unit === "person") return "인물";
    return unit || "—";
  }

  function sourceStatusLabel(status) {
    if (status === "ready") return "정상";
    if (status === "loading") return "확인 중";
    if (status === "error") return "오류";
    return "대기";
  }

  function timestampBasisLabel(basis) {
    if (basis === "generated_at") return "생성 시각";
    if (basis === "latest_tracked_mutation") return "최근 추적 변경";
    if (basis === "compiled_at") return "Compile 원장 시각";
    return "미제공";
  }

  function mutationKindLabel(kind) {
    if (kind === "authoring") return "작성";
    if (kind === "profile") return "프로필";
    if (kind === "correction") return "보정";
    if (kind === "merge") return "병합";
    if (kind === "delete_person") return "인물 삭제";
    return kind ? "기타 변경" : "미분류";
  }

  function sourceDisplayLabel(label) {
    if (label === "Person Runtime") return "인물 기준";
    if (label === "Person Domain") return "인물 분야";
    if (label === "Person Runtime Activity") return "인물 활동";
    if (label === "Person Activity Sources") return "활동 출처";
    if (label === "Spatial Index") return "공간 인덱스";
    if (label === "Spatial resolver") return "공간 배치 판정";
    if (label === "Non-timeline Registry") return "비연대표 목록";
    if (label === "Recent Delta") return "최근 변경";
    if (label === "Runtime Identity") return "배포 식별";
    if (label === "Runtime Publication") return "게시 파이프라인";
    if (label === "Runtime Exclusions") return "Runtime 제외 대상";
    return label || "원본";
  }

  function completenessLabel(row) {
    if (row?.code === "domain") return "대표 분야";
    if (row?.code === "namuwiki") return "나무위키 검토";
    if (row?.code === "runtime_activity") return "활동 연결";
    if (row?.code === "chronology") return "활동 연대";
    if (row?.code === "provenance") return "출처 연결";
    if (row?.code === "spatial") return "공간 배치";
    return row?.label || row?.code || "확인 항목";
  }

  function reasonLabel(reason) {
    if (!reason) return "";
    if (reason === "PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED") return "인물 삭제 이력 미노출";
    if (reason === "RECENT_DELTA_SOURCE_UNAVAILABLE") return "최근 변경 원본 확인 불가";
    if (reason === "RECENT_DELTA_HAS_NO_TRACKED_MUTATION") return "추적된 변경 없음";
    if (reason === "PERSON_DOMAIN_SOURCE_UNAVAILABLE") return "대표 분야 원본 확인 불가";
    if (reason === "SPATIAL_SOURCE_UNAVAILABLE") return "공간 원본 확인 불가";
    if (reason === "SPATIAL_INDEX_GENERATED_AT_NOT_EXPOSED") return "공간 원본 생성 시각 미제공";
    if (reason === "PERSON_RUNTIME_DATA_TIMESTAMP_NOT_EXPOSED") return "인물 원본 갱신 시각 미제공";
    if (reason === "PERSON_DOMAIN_DATA_TIMESTAMP_NOT_EXPOSED") return "분야 원본 갱신 시각 미제공";
    if (reason === "NON_TIMELINE_DATA_TIMESTAMP_NOT_EXPOSED") return "비연대표 원본 갱신 시각 미제공";
    if (reason === "RUNTIME_IDENTITY_DATA_TIMESTAMP_NOT_EXPOSED") return "배포 식별 갱신 시각 미제공";
    if (reason === "SOURCE_DATA_TIMESTAMP_NOT_EXPOSED") return "원본 갱신 시각 미제공";
    if (reason === "SOURCE_UNAVAILABLE") return "원본 확인 불가";
    if (reason === "RUNTIME_EXCLUSION_TARGET_SOURCE_NOT_EXPOSED") return "Runtime 제외 대상 원본 확인 불가";
    if (reason === "RUNTIME_EXCLUSION_TARGET_LEDGER_NOT_APPLIED") return "Runtime 제외 대상 원장 migration 미적용";
    if (reason === "RUNTIME_EXCLUSION_TARGET_SNAPSHOT_INCOMPLETE") return "Runtime 제외 대상 snapshot 불완전";
    if (reason === "RUNTIME_PROJECTION_EMPTY") return "Runtime projection 비어 있음";
    if (reason === "DUPLICATE_REVIEW_TARGET_SOURCE_REQUIRES_ADMIN_CONTRACT") return "중복 후보 대상은 관리자 인증 영역에서 확인";
    if (reason === "RUNTIME_PUBLICATION_SOURCE_UNAVAILABLE") return "게시 파이프라인 원본 확인 불가";
    if (reason === "RUNTIME_PUBLICATION_NO_COMPILE_RUN") return "Runtime Compile 기록 없음";
    if (reason === "RUNTIME_ACTIVATION_HISTORY_NOT_EXPOSED") return "Runtime 활성화 이력 미노출";
    if (reason === "RUNTIME_ACTIVATION_LEDGER_NOT_APPLIED") return "Runtime 활성화 원장 migration 미적용";
    if (reason === "RUNTIME_ACTIVATION_HISTORY_EMPTY") return "Runtime 활성화 이력 없음";
    if (reason === "RUNTIME_ACTIVATION_HISTORY_UNAVAILABLE") return "Runtime 활성화 이력 확인 불가";
    return "세부 사유 미분류";
  }

  function runtimeExclusionLabel(code) {
    if (code === "RELATION_TYPE_UNRESOLVED") return "관계 유형 미해결";
    if (code === "START_BOUNDARY_UNRESOLVED") return "시작 경계 미해결";
    if (code === "END_BOUNDARY_UNRESOLVED") return "종료 경계 미해결";
    if (code === "ONGOING_VERIFICATION_UNRESOLVED") return "진행 중 검증 미해결";
    if (code === "PROVENANCE_UNRESOLVED") return "출처·근거 미해결";
    return code || "기타 제외";
  }

  function publicationStage(label, count, detail) {
    return `<article class="dashboard-publication-stage">
      <small>${escapeHtml(label)}</small><strong>${value(count)}</strong><span>${escapeHtml(detail || "")}</span>
    </article>`;
  }

  function publicationFunnelMarkup(funnel) {
    if (!funnel?.available) {
      return `<div class="dashboard-heatmap-unavailable">${escapeHtml(reasonLabel(funnel?.unavailable_reason) || "게시 파이프라인 확인 불가")}</div>`;
    }
    if (!funnel?.sealed) {
      return `<div class="dashboard-publication-flow">
        ${publicationStage("현재 Authoring",funnel.current_authoring,"authoritative Activity")}
        ${publicationStage("현재 Runtime",funnel.current_runtime,"sealed projection")}
      </div>
      <div class="dashboard-heatmap-unavailable">${escapeHtml(reasonLabel(funnel.unavailable_reason) || "Runtime Compile 기록 없음")}</div>`;
    }
    const delta=Number(funnel.authoring_delta_since_compile || 0);
    const deltaLabel=delta === 0 ? "Compile 이후 Authoring 증감 0" : `Compile 이후 Authoring 증감 ${delta > 0 ? "+" : ""}${value(delta)}`;
    const exclusionRows=(funnel.exclusion_rows || []).map((row)=>`<span><b>${escapeHtml(runtimeExclusionLabel(row.code))}</b> ${value(row.count)}</span>`).join("");
    return `<div class="dashboard-publication-flow">
      ${publicationStage("현재 Authoring",funnel.current_authoring,"현재 canonical Activity")}
      ${publicationStage("현재 Runtime Compile 입력",funnel.compile_input,"sealed compile snapshot")}
      ${publicationStage("Runtime 포함",funnel.runtime_included,`현재 Runtime ${value(funnel.current_runtime)}`)}
      ${publicationStage("Runtime 제외",funnel.runtime_excluded,"Activity 단위")}
    </div>
    <div class="dashboard-publication-meta">
      <span>${escapeHtml(deltaLabel)}</span>
      <span>${funnel.projection_matches_active_compile ? "Runtime projection = 현재 Runtime Compile 출력" : "Runtime projection과 현재 Runtime Compile 출력 불일치"}</span>
      <span>${escapeHtml(funnel.compiler_version || "compiler 미확인")} · ${escapeHtml(formatTimestamp(funnel.compiled_at))}</span>
    </div>
    <div class="dashboard-timeline-summary dashboard-publication-exclusions">${exclusionRows || "<span>제외 사유 0건</span>"}</div>`;
  }

  function runtimeExclusionTargetsMarkup(runtimeExclusions) {
    if (!runtimeExclusions?.available || !Array.isArray(runtimeExclusions.targets)) {
      return `<div class="dashboard-heatmap-unavailable">${escapeHtml(reasonLabel(runtimeExclusions?.reason) || "Runtime 제외 대상 확인 불가")}</div>`;
    }
    const rows=runtimeExclusions.targets.map((row)=>`<tr>
      <td><span class="dashboard-unit-badge">${escapeHtml(runtimeExclusionLabel(row.reason_code))}</span></td>
      <td><strong>${escapeHtml(row.person_display_name || row.person_id)}</strong><small>${escapeHtml(row.person_id)}</small></td>
      <td><strong>${escapeHtml(row.polity_display_name || row.polity_id)}</strong><small>${escapeHtml(row.polity_id)}</small></td>
      <td><code title="${escapeHtml(row.activity_id)}">${escapeHtml(row.activity_id)}</code></td>
    </tr>`).join("");
    return `<div class="dashboard-runtime-exclusion-wrap"><table class="dashboard-runtime-exclusion-table">
      <thead><tr><th scope="col">제외 사유</th><th scope="col">인물</th><th scope="col">정치체</th><th scope="col">Activity UUID</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4">현재 Runtime 제외 Activity가 없습니다.</td></tr>'}</tbody>
    </table></div>`;
  }

  function signedValue(number) {
    if (number == null || !Number.isFinite(Number(number))) return "—";
    const numeric=Number(number);
    return numeric > 0 ? `+${value(numeric)}` : value(numeric);
  }

  function activationKindLabel(kind) {
    if (kind === "compile_commit") return "Compile 반영";
    if (kind === "baseline_observed") return "원장 도입 시점 관측";
    return "활성화 유형 미확인";
  }

  function shortSha(sha) {
    const raw=String(sha || "").trim();
    return raw ? raw.slice(0,12) : "—";
  }

  function runtimeDeltaDriftMarkup(delta) {
    if (!delta?.available) {
      return `<div class="dashboard-heatmap-unavailable">${escapeHtml(reasonLabel(delta?.unavailable_reason) || "Runtime 활성화 이력을 확인할 수 없습니다.")}</div>`;
    }
    const latest=delta.latest;
    const previous=delta.previous;
    const reasonRows=(delta.exclusion_delta_rows || []).map((row)=>`<span><b>${escapeHtml(runtimeExclusionLabel(row.code))}</b> ${escapeHtml(signedValue(row.delta))}</span>`).join("");
    const comparisonLabel=delta.comparison_available
      ? (delta.compile_key_changed ? "직전과 다른 Compile 활성화" : "같은 Compile 재활성화")
      : "직전 activation 기록 없음";
    const projectionLabel=delta.latest_matches_projection
      ? "최신 activation = 현재 Runtime projection"
      : "최신 activation과 현재 Runtime projection 불일치";
    const shaLabel=latest?.activation_kind === "compile_commit"
      ? `Runtime ${shortSha(latest.runtime_sha)} · Authoring ${shortSha(latest.authoring_sha)}`
      : "원장 도입 시점 관측 · 배포 SHA 없음";
    return `<div class="dashboard-drift-grid">
      <article class="dashboard-drift-card" data-drift-state="${delta.drift ? "drift" : "ready"}">
        <small>최신 Runtime</small><strong>${value(latest?.row_count)}</strong><span>${escapeHtml(activationKindLabel(latest?.activation_kind))} · ${escapeHtml(formatTimestamp(latest?.activated_at))}</span>
      </article>
      <article class="dashboard-drift-card">
        <small>직전 Runtime</small><strong>${previous ? value(previous.row_count) : "—"}</strong><span>${previous ? `${escapeHtml(activationKindLabel(previous.activation_kind))} · ${escapeHtml(formatTimestamp(previous.activated_at))}` : "비교 이력 없음"}</span>
      </article>
      <article class="dashboard-drift-card">
        <small>Runtime Activity 증감</small><strong>${escapeHtml(signedValue(delta.runtime_activity_delta))}</strong><span>직전 activation 대비</span>
      </article>
      <article class="dashboard-drift-card">
        <small>Runtime 제외 증감</small><strong>${escapeHtml(signedValue(delta.excluded_activity_delta))}</strong><span>현재 제외 ${value(latest?.excluded_activity_count)} Activity</span>
      </article>
    </div>
    <div class="dashboard-publication-meta dashboard-drift-meta">
      <span>${escapeHtml(comparisonLabel)}</span>
      <span data-runtime-drift="${delta.drift ? "true" : "false"}">${escapeHtml(projectionLabel)}</span>
      <span>${escapeHtml(shaLabel)}</span>
    </div>
    <div class="dashboard-timeline-summary dashboard-drift-reasons">
      ${delta.comparison_available ? (reasonRows || "<span>제외 사유별 증감 0건</span>") : "<span>직전 activation이 없어 사유별 증감 비교 불가</span>"}
    </div>`;
  }

  function environmentLabel(value) {
    if (value === "production") return "운영";
    if (value === "preview") return "미리보기";
    if (value === "development") return "개발";
    return value || "—";
  }

  function breakdownCard(label, item) {
    const total = item?.total == null ? "—" : value(item.total);
    const unit = unitLabel(item?.unit || "person");
    const rows = (item?.rows || []).map((row) => `<div class="dashboard-domain-row">
      <span title="${escapeHtml(row.label || row.code || "")}">${escapeHtml(row.label || row.code || "unknown")}</span><b>${value(row.count)}</b>
    </div>`).join("");
    const unattributed = Number(item?.unattributed_count || 0) > 0
      ? `<div class="dashboard-domain-row"><span>사유 미확인</span><b>${value(item.unattributed_count)}</b></div>`
      : "";
    return `<article class="dashboard-panel card">
      <div class="dashboard-panel-head"><div><p class="eyebrow">INCOMPLETE REASONS</p><h3>${escapeHtml(label)}</h3></div><span>${total} ${unit}</span></div>
      <div class="dashboard-domain-list">${rows || unattributed ? rows + unattributed : `<div class="dashboard-domain-row"><span>${escapeHtml(reasonLabel(item?.unavailable_reason) || "사유 원본 확인 불가")}</span><b>—</b></div>`}</div>
    </article>`;
  }

  function shouldRenderBreakdown(item) {
    if (item?.total == null) return item?.available !== true;
    return Number(item.total) > 0;
  }

  function recentTimelineEntry(entry) {
    const person = entry?.display_name || (entry?.person_id ? entry.person_id : "프로젝트 전체");
    const timestamp = entry?.occurred_at
      ? new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeStyle:"short"}).format(new Date(entry.occurred_at))
      : "—";
    const count = Number(entry?.change_count || 0);
    return `<article class="dashboard-timeline-entry" data-timeline-kind="${escapeHtml(entry?.kind || "unknown")}">
      <span class="dashboard-timeline-node" aria-hidden="true"></span>
      <div class="dashboard-timeline-copy">
        <div><strong>${escapeHtml(entry?.label || entry?.operation || entry?.kind || "변경")}</strong><span class="dashboard-unit-badge">${escapeHtml(mutationKindLabel(entry?.kind))}</span></div>
        <small>${escapeHtml(person)}</small>
      </div>
      <div class="dashboard-timeline-meta"><b>${escapeHtml(timestamp)}</b><small>${count > 0 ? `${value(count)}건 변경` : "변경 수 미확인"}</small></div>
    </article>`;
  }

  function recentTimelineSummary(timeline) {
    return (timeline?.kind_summary || []).map((item) => `<span><b>${escapeHtml(mutationKindLabel(item.kind))}</b> ${value(item.event_count)}건 · ${value(item.change_count)}건 변경</span>`).join("");
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
    if (!heatmap?.available) return `<div class="dashboard-heatmap-unavailable">${escapeHtml(heatmap?.unavailable_reason || "분포표 확인 불가")}</div>`;
    const head=heatmap.regions.map((region)=>`<th scope="col" title="${escapeHtml(region.label)}">${escapeHtml(region.label)}</th>`).join("");
    const body=heatmap.rows.map((row)=>`<tr>
      <th scope="row"><strong>${escapeHtml(row.era.label)}</strong><small>${escapeHtml(row.era.range)}</small></th>
      ${row.cells.map((cell)=>`<td data-heatmap-level="${heatmapLevel(cell.count,heatmap.max_count)}" title="${escapeHtml(`${row.era.label} × ${heatmap.regions.find((region)=>region.code===cell.region_code)?.label || cell.region_code}: 활동 ${cell.count}건`)}"><span>${value(cell.count)}</span></td>`).join("")}
    </tr>`).join("");
    return `<div class="dashboard-heatmap-wrap"><table class="dashboard-heatmap"><thead><tr><th scope="col">시대 \ 권역</th>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function completenessTable(matrix) {
    const rows=(matrix?.rows || []).map((row)=>{
      const known=row?.available === true;
      const incomplete=known ? value(row.incomplete) : "—";
      const actionable=known && row.unit === "person" && Array.isArray(row.person_ids) && row.person_ids.length > 0;
      const incompleteCell=actionable
        ? `<button type="button" data-dashboard-completeness="${escapeHtml(row.code)}" title="${escapeHtml(`${completenessLabel(row)} 미완료 ${row.incomplete}명 보기`)}">${incomplete}</button>`
        : `<span>${incomplete}</span>`;
      return `<tr data-completeness-unit="${escapeHtml(row.unit)}">
        <th scope="row"><strong>${escapeHtml(completenessLabel(row))}</strong><small>${escapeHtml(sourceDisplayLabel(row.source))}</small></th>
        <td><span class="dashboard-unit-badge">${escapeHtml(unitLabel(row.unit))}</span></td>
        <td>${known ? value(row.complete) : "—"}</td>
        <td>${incompleteCell}</td>
        <td>${known ? pct(row.percentage) : "—"}</td>
        <td>${known ? value(row.total) : `<span title="${escapeHtml(reasonLabel(row.unavailable_reason || "SOURCE_UNAVAILABLE"))}">—</span>`}</td>
      </tr>`;
    }).join("");
    return `<div class="dashboard-completeness-wrap"><table class="dashboard-completeness">
      <thead><tr><th scope="col">항목</th><th scope="col">단위</th><th scope="col">완료</th><th scope="col">미완료</th><th scope="col">완성도</th><th scope="col">전체</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    const date=new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ko-KR",{dateStyle:"short",timeStyle:"short"}).format(date);
  }

  function sourceFreshnessTable(freshness) {
    const rows=(freshness?.rows || []).map((row)=>`<tr>
      <th scope="row"><strong>${escapeHtml(sourceDisplayLabel(row.label))}</strong></th>
      <td><span class="dashboard-unit-badge">${escapeHtml(sourceStatusLabel(row.status))}</span></td>
      <td title="${escapeHtml(reasonLabel(row.data_timestamp_unavailable_reason) || timestampBasisLabel(row.data_basis) || "")}">${escapeHtml(formatTimestamp(row.data_at))}</td>
      <td>${escapeHtml(timestampBasisLabel(row.data_basis))}</td>
      <td>${escapeHtml(formatTimestamp(row.read_at))}</td>
    </tr>`).join("");
    return `<div class="dashboard-completeness-wrap"><table class="dashboard-completeness dashboard-source-freshness">
      <thead><tr><th scope="col">원본</th><th scope="col">상태</th><th scope="col">원본 시각</th><th scope="col">기준</th><th scope="col">마지막 읽기</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  }

  function sourceCard(source) {
    const ready = source.status === "ready";
    const loading = source.status === "loading";
    const state = ready ? "정상" : loading ? "확인 중" : source.status === "error" ? "오류" : "대기";
    return `<article class="dashboard-source-card" data-source-state="${escapeHtml(source.status)}">
      <span class="dashboard-source-dot" aria-hidden="true"></span>
      <div><strong>${escapeHtml(sourceDisplayLabel(source.label))}</strong><small>${escapeHtml(source.url || "")}</small></div>
      <b>${escapeHtml(state)}</b>
      ${source.error ? `<p>${escapeHtml(source.error)}</p>` : ""}
    </article>`;
  }

  function renderLoading(root) {
    root.innerHTML = `<section class="dashboard-control-center">
      <div class="dashboard-hero card"><div><p class="eyebrow">ATLAS CONTROL CENTER</p><h2>프로젝트 현황을 불러오는 중</h2><p>인물·분야·공간·비연대표 기준 원본을 하나의 공통 데이터 경로에서 읽고 있습니다.</p></div></div>
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
    const publication = snapshot.publication_funnel;
    const runtimeDelta = snapshot.runtime_delta_drift;
    const runtimeExclusions = snapshot.runtime_exclusions;
    const heatmap = snapshot.coverage_heatmap;
    const completeness = snapshot.completeness_matrix;
    const freshness = snapshot.source_freshness;
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

      <section class="dashboard-panel card">
        <div class="dashboard-panel-head"><div><p class="eyebrow">NEEDS ATTENTION</p><h3>지금 처리할 대상</h3></div><span>기준 원본에서 파생</span></div>
        <div class="dashboard-issue-grid">
          ${a.items.map(attentionButton).join("")}
        </div>
        <div class="dashboard-progress-meta">
          <span>확인된 미완료 건 <b>${value(a.known_outstanding_checks)}</b></span>
          <span>영향 인물 <b>${value(a.known_affected_persons)}</b></span>
          <span>${a.complete ? "전체 범주 확인됨" : `부분 집계 · ${value(a.available_categories)}/${value(a.total_categories)} 범주만 대상 집합 확인`}</span>
        </div>
      </section>

      <section id="dashboardRuntimeExclusionTargets" class="dashboard-panel card dashboard-runtime-exclusion-targets" aria-label="Runtime 제외 Activity 대상" hidden>
        <div class="dashboard-panel-head"><div><p class="eyebrow">RUNTIME EXCLUSION TARGETS</p><h3>Runtime 제외 Activity</h3></div><span>${runtimeExclusions?.available ? `${value(runtimeExclusions.total_count)} 활동` : "원본 확인 불가"}</span></div>
        ${runtimeExclusionTargetsMarkup(runtimeExclusions)}
        <div class="dashboard-progress-meta">
          <span>현재 활성 Compile의 immutable exclusion snapshot</span>
          <span>${runtimeExclusions?.compiled_at ? escapeHtml(formatTimestamp(runtimeExclusions.compiled_at)) : "Compile 시각 —"}</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="시스템 및 Production 상태">
        <div class="dashboard-panel-head"><div><p class="eyebrow">SYSTEM / PRODUCTION</p><h3>현재 실행 환경</h3></div><span>${sys.available ? "배포 식별 정보" : "식별 정보 없음"}</span></div>
        <div class="dashboard-source-list">
          ${systemCard("배포 환경",environmentLabel(sys.environment),sys.production_main === true ? "운영 · main" : sys.production_main === false ? "운영/main 조합 아님" : "환경 판정 불가",sys.available ? "ready" : "error")}
          ${systemCard("배포 커밋",sys.git_commit_short,sys.git_commit_ref ? `브랜치 ${sys.git_commit_ref}` : "커밋/브랜치 미확인",sys.git_commit_sha && sys.git_commit_ref ? "ready" : "idle")}
          ${systemCard("실행 인프라",sys.provider,sys.region ? `리전 ${sys.region}` : "리전 미확인",sys.available ? "ready" : "error")}
          ${systemCard("공통 원본",sys.source_health.ready == null ? null : `${sys.source_health.ready}/${sys.source_health.total}`,sys.source_health.available ? `오류 ${sys.source_health.errors} · 확인 중 ${sys.source_health.loading}` : "원본 상태 미확인",sys.source_health.errors > 0 ? "error" : sys.source_health.available ? "ready" : "idle")}
        </div>
        <div class="dashboard-progress-meta">
          <span>${sys.identity_complete ? "배포 식별 완료" : "배포 식별 일부 미확인"}</span>
          <span>배포 식별 정보와 CI 상태는 별도</span>
        </div>
        ${sourceIssues.length ? `<div class="dashboard-source-issues" aria-label="비정상 source 상세">
          <p class="eyebrow">SOURCE ISSUES</p>
          <div class="dashboard-source-list">${sourceIssues.map(sourceCard).join("")}</div>
        </div>` : ""}
      </section>

      <section class="dashboard-panel card" aria-label="Authoring에서 Runtime까지 게시 파이프라인">
        <div class="dashboard-panel-head"><div><p class="eyebrow">AUTHORING → COMPILE → RUNTIME</p><h3>게시 파이프라인</h3></div><span>${publication?.sealed ? `Compile 원장 ${escapeHtml(formatTimestamp(publication.compiled_at))}` : "Compile 상태 확인"}</span></div>
        ${publicationFunnelMarkup(publication)}
        <div class="dashboard-progress-meta">
          <span>현재 Authoring과 현재 Runtime Compile snapshot을 구분해 표시</span>
          <span>Runtime 제외는 인물이 아닌 Activity 단위</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="Runtime 직전 활성화 대비 변화와 projection drift">
        <div class="dashboard-panel-head"><div><p class="eyebrow">RUNTIME DELTA / DRIFT</p><h3>직전 활성화 대비 변화</h3></div><span>${runtimeDelta?.available ? (runtimeDelta.drift ? "DRIFT 감지" : runtimeDelta.comparison_available ? "활성화 비교" : "최신 activation 확인") : "활성화 이력 확인"}</span></div>
        ${runtimeDeltaDriftMarkup(runtimeDelta)}
        <div class="dashboard-progress-meta">
          <span>직전 Production은 Compile 시각이 아닌 Runtime activation 원장 순서로 판정</span>
          <span>증감 단위는 Activity · 재활성화도 별도 activation으로 보존</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="기준 원본 갱신 시각과 읽기 시각">
        <div class="dashboard-panel-head"><div><p class="eyebrow">SOURCE FRESHNESS</p><h3>원본 시각 추적</h3></div><span>원본 시각 ${value(freshness.data_timestamp_known)}/${value(freshness.total_sources)} 확인</span></div>
        ${sourceFreshnessTable(freshness)}
        <div class="dashboard-progress-meta">
          <span>원본 갱신 시각과 브라우저 마지막 읽기 시각을 구분</span>
          <span>갱신 시각 미제공 원본은 — · 최신/지연 상태를 임의 판정하지 않음</span>
        </div>
      </section>

      <section class="dashboard-main-grid">
        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">WORK FRONTIER</p><h3>작업 진행</h3></div><span>실데이터 기준</span></div>
          <div class="dashboard-progress-list">
            ${progressRow("대표 분야 분류", w.domain, "대표 분야 배정")}
            ${progressRow("나무위키 검토", w.namuwiki, "연결 + 없음 확인")}
            ${progressRow("Spatial 준비", w.spatial, "활동 위치 배치")}
            ${progressRow("활동 연결", w.runtime_activity, "활동이 1건 이상 연결된 인물")}
          </div>
        </article>

        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">DATA QUALITY</p><h3>구조·예외 상태</h3></div><span>중복 지표 제외</span></div>
          <div class="dashboard-issue-grid">
            <button type="button" data-dashboard-route="spacetime"><span>Spatial 미해결</span><strong>${value(q.spatial_unresolved)}</strong></button>
            <button type="button" data-dashboard-route="spacetime"><span>Spatial 검토 대기</span><strong>${value(q.spatial_review)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>활동 연결 없음</span><strong>${value(q.no_runtime_activity)}</strong></button>
            <button type="button" data-dashboard-route="persons"><span>비연대표 등록</span><strong>${value(q.non_timeline_registry)}</strong></button>
          </div>
        </article>
      </section>

      <section class="dashboard-panel card" aria-label="데이터 완성도 행렬">
        <div class="dashboard-panel-head"><div><p class="eyebrow">COMPLETENESS MATRIX</p><h3>축별 완성도</h3></div><span>인물 3항목 · 활동 3항목</span></div>
        ${completenessTable(completeness)}
        <div class="dashboard-progress-meta">
          <span>인물과 활동 단위는 합산하지 않음</span>
          <span>— = 기준 원본 확인 불가</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="시대별·권역별 활동 분포">
        <div class="dashboard-panel-head"><div><p class="eyebrow">ERA × REGION COVERAGE</p><h3>시공간 활동 분포</h3></div><span>${heatmap.available ? `배치 ${value(heatmap.placed_activity_count)} · 미해결 ${value(heatmap.unresolved_activity_count)}` : "원본 확인 불가"}</span></div>
        ${heatmapTable(heatmap)}
        <div class="dashboard-progress-meta">
          <span>10개 시대 구간 × Spatial 대권역</span>
          <span>한 활동은 같은 시대·권역에서 구간이 여러 개여도 1회 집계</span>
        </div>
      </section>

      <section class="dashboard-panel card" aria-label="최근 프로젝트 변경 타임라인">
        <div class="dashboard-panel-head"><div><p class="eyebrow">RECENT DELTA · RECENT ACTIVITY TIMELINE</p><h3>최근 추적 변경 타임라인</h3></div><span>${timeline.available ? `${value(timeline.event_count)}건 기록 · ${value(timeline.total_change_count)}건 변경` : "원본 확인 불가"}</span></div>
        ${timeline.available
          ? (timeline.entries.length
            ? `<div class="dashboard-timeline">${timeline.entries.map(recentTimelineEntry).join("")}</div>`
            : '<div class="dashboard-heatmap-unavailable">현재 추적 원장에 표시할 변경이 없습니다.</div>')
          : '<div class="dashboard-heatmap-unavailable">최근 변경 기준 원본을 확인할 수 없습니다.</div>'}
        <div class="dashboard-timeline-summary">${timeline.available ? recentTimelineSummary(timeline) : ""}</div>
        <div class="dashboard-progress-meta">
          <span>인물 단위 ${timeline.available ? value(timeline.person_scoped_count) : "—"} · 프로젝트 전체 ${timeline.available ? value(timeline.project_wide_count) : "—"}</span>
          <span>추적 원본 ${escapeHtml((rd.tracked_sources || []).map(mutationKindLabel).join(" · ") || "—")}</span>
          <span>${rd.gaps?.length ? `추적 누락 · ${escapeHtml(rd.gaps.map(reasonLabel).join(", "))}` : "추적 범위 확인 완료"}</span>
        </div>
      </section>



      <section class="dashboard-lower-grid" aria-label="미완료 사유">
        ${incompleteCards.length
          ? incompleteCards.map(([label,item]) => breakdownCard(label,item)).join("")
          : '<article class="dashboard-panel card"><div class="dashboard-panel-head"><div><p class="eyebrow">INCOMPLETE REASONS</p><h3>미완료 원인 없음</h3></div><span>0</span></div></article>'}
      </section>

      <section class="dashboard-lower-grid">
        <article class="dashboard-panel card">
          <div class="dashboard-panel-head"><div><p class="eyebrow">PERSON DOMAINS</p><h3>대표 분야 분포</h3></div><span>분야 8색 체계 적용</span></div>
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
      if (!item?.available) return;
      if (item.code === "runtime_exclusion" && Array.isArray(item.activity_targets)) {
        const panel=root.querySelector("#dashboardRuntimeExclusionTargets");
        if (!panel) return;
        panel.hidden=false;
        button.setAttribute("aria-expanded","true");
        panel.scrollIntoView?.({ block:"nearest", behavior:"smooth" });
        return;
      }
      if (!Array.isArray(item.person_ids) || !item.person_ids.length) return;
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

    const [persons, domains, spatial, nonTimeline, recentDelta, systemIdentity, runtimePublication, runtimeExclusions] = await Promise.allSettled([
      store.loadPersons({ force }),
      store.loadPersonDomains({ force }),
      store.loadSpatialIndex({ force }),
      store.loadNonTimelinePersons({ force }),
      store.loadRecentDelta({ force }),
      store.loadSystemIdentity({ force }),
      store.loadRuntimePublication({ force }),
      store.loadRuntimeExclusions({ force })
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
      runtimePublicationResult:settledValue(runtimePublication),
      runtimeExclusionsResult:settledValue(runtimeExclusions),
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