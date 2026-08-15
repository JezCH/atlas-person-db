(() => {
  "use strict";

  const STATUS_ENDPOINT = "/api/atlas-admin-system-status";
  const INSPECTOR_ENDPOINT = "/api/atlas-admin-inspector";

  const statusBadge = document.getElementById("systemStatusBadge");
  const statusBody = document.getElementById("systemStatusBody");
  const refreshStatusButton = document.getElementById("refreshSystemStatusButton");
  const inspectorBadge = document.getElementById("inspectorStatusBadge");
  const inspectorKind = document.getElementById("inspectorKind");
  const inspectorId = document.getElementById("inspectorId");
  const inspectorForm = document.getElementById("adminInspectorForm");
  const inspectorResult = document.getElementById("inspectorResult");
  const inspectorClearButton = document.getElementById("clearInspectorButton");

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function scalar(value) {
    if (value === null || value === undefined || value === "") return '<span class="obs-null">unknown / not supplied</span>';
    if (typeof value === "boolean") return `<span class="obs-boolean" data-value="${value}">${value ? "true" : "false"}</span>`;
    return `<code class="obs-value">${escapeHtml(value)}</code>`;
  }

  function renderTree(value) {
    if (Array.isArray(value)) {
      if (!value.length) return '<span class="obs-null">[]</span>';
      return `<ol class="obs-list">${value.map((item) => `<li>${renderTree(item)}</li>`).join("")}</ol>`;
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value);
      if (!entries.length) return '<span class="obs-null">{}</span>';
      return `<dl class="obs-tree">${entries.map(([key, item]) => `<div><dt>${escapeHtml(key)}</dt><dd>${renderTree(item)}</dd></div>`).join("")}</dl>`;
    }
    return scalar(value);
  }

  async function getJson(url) {
    const response = await fetch(url, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    let payload = null;
    try { payload = await response.json(); } catch { payload = null; }
    if (!response.ok || payload?.ok !== true) {
      const error = new Error(payload?.code || `ADMIN_READ_FAILED_${response.status}`);
      error.status = response.status;
      error.code = payload?.code || null;
      throw error;
    }
    return payload;
  }

  function statusSection(title, value, { open = false } = {}) {
    return `<details class="obs-section"${open ? " open" : ""}>
      <summary>${escapeHtml(title)}</summary>
      <div class="obs-section-body">${renderTree(value)}</div>
    </details>`;
  }

  function renderTableCounts(counts) {
    const entries = Object.entries(counts || {}).sort(([a], [b]) => a.localeCompare(b));
    if (!entries.length) return '<p class="empty-state">atlas_v2 table count 정보가 없습니다.</p>';
    return `<div class="obs-table-wrap"><table class="obs-table"><thead><tr><th>Table</th><th>Rows</th></tr></thead><tbody>${entries.map(([name, count]) => `<tr><td><code>${escapeHtml(name)}</code></td><td>${escapeHtml(count)}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderSystemStatus(payload) {
    if (!statusBody) return;
    const tableCount = payload.counts?.atlas_v2_table_count ?? null;
    statusBody.innerHTML = `
      <div class="obs-summary-grid">
        <div><span>Runtime</span><strong>${escapeHtml(payload.runtime?.environment ?? "unknown")}</strong><small>${escapeHtml(payload.runtime?.git_commit_ref ?? payload.runtime?.provider ?? "unknown")}</small></div>
        <div><span>Database</span><strong>${payload.database?.reachable === true ? "reachable" : "unknown"}</strong><small>atlas_v2: ${payload.database?.atlas_v2_schema_present === true ? "present" : "not confirmed"}</small></div>
        <div><span>atlas_v2 tables</span><strong>${tableCount === null ? "—" : escapeHtml(tableCount)}</strong><small>catalog-discovered</small></div>
        <div><span>Actions verification</span><strong>${payload.verification?.github_actions_status_embedded === true ? "embedded" : "external"}</strong><small>${escapeHtml(payload.verification?.reason ?? "unknown")}</small></div>
      </div>
      <div class="obs-sections">
        ${statusSection("Runtime identity", payload.runtime, { open: true })}
        ${statusSection("Configuration presence — values are never exposed", payload.configuration, { open: true })}
        ${statusSection("Database identity", payload.database)}
        ${statusSection("Migration identity", payload.migration)}
        ${statusSection("Semantic / detector / merge versions", payload.semantics, { open: true })}
        ${statusSection("Authoring & P10 readiness", payload.readiness, { open: true })}
        ${statusSection("Duplicate lifecycle", payload.duplicate_lifecycle, { open: true })}
        <details class="obs-section"><summary>atlas_v2 exact row counts</summary><div class="obs-section-body">${renderTableCounts(payload.counts?.tables)}</div></details>
        ${statusSection("Runtime verification boundary", payload.verification)}
      </div>`;
  }

  function setBadge(node, text, state = "") {
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
  }

  async function loadSystemStatus() {
    if (!statusBody || !refreshStatusButton) return;
    refreshStatusButton.disabled = true;
    setBadge(statusBadge, "조회 중", "");
    try {
      const payload = await getJson(STATUS_ENDPOINT);
      renderSystemStatus(payload);
      setBadge(statusBadge, "읽기 정상", "ready");
    } catch (error) {
      statusBody.innerHTML = `<p class="empty-state">System Status 조회 실패: ${escapeHtml(error.code || error.message)}</p>`;
      setBadge(statusBadge, error.status === 401 ? "세션 필요" : "조회 실패", "error");
    } finally {
      refreshStatusButton.disabled = false;
    }
  }

  async function loadInspectorCapabilities() {
    if (!inspectorKind) return;
    setBadge(inspectorBadge, "기능 확인 중", "");
    try {
      const payload = await getJson(INSPECTOR_ENDPOINT);
      const kinds = Array.isArray(payload.supported_kinds) ? payload.supported_kinds : [];
      inspectorKind.innerHTML = '<option value="">Object kind 선택</option>' + kinds.map((kind) => `<option value="${escapeHtml(kind)}">${escapeHtml(kind)}</option>`).join("");
      setBadge(inspectorBadge, kinds.length ? `${kinds.length} kinds` : "kind 없음", kinds.length ? "ready" : "error");
    } catch (error) {
      inspectorKind.innerHTML = '<option value="">Capabilities 조회 실패</option>';
      setBadge(inspectorBadge, error.status === 401 ? "세션 필요" : "조회 실패", "error");
    }
  }

  async function inspectObject(event) {
    event?.preventDefault();
    const kind = String(inspectorKind?.value || "").trim();
    const id = String(inspectorId?.value || "").trim();
    if (!kind || !id) {
      if (inspectorResult) inspectorResult.textContent = "Object kind와 UUID를 모두 입력하세요.";
      return;
    }
    const submit = inspectorForm?.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;
    setBadge(inspectorBadge, "조회 중", "");
    try {
      const payload = await getJson(`${INSPECTOR_ENDPOINT}?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`);
      if (inspectorResult) {
        inspectorResult.textContent = JSON.stringify({ kind: payload.kind, object: payload.object }, null, 2);
        inspectorResult.dataset.type = "success";
      }
      setBadge(inspectorBadge, "Object 확인", "ready");
    } catch (error) {
      if (inspectorResult) {
        inspectorResult.textContent = `Inspector 조회 실패: ${error.code || error.message}`;
        inspectorResult.dataset.type = "error";
      }
      setBadge(inspectorBadge, error.status === 404 ? "없음" : error.status === 401 ? "세션 필요" : "조회 실패", "error");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function clearAdminReadState() {
    if (statusBody) statusBody.innerHTML = '<p class="empty-state">관리자 인증 후 System Status를 불러옵니다.</p>';
    if (inspectorResult) {
      inspectorResult.textContent = "관리자 인증 후 UUID 기반 Object Inspector를 사용할 수 있습니다.";
      delete inspectorResult.dataset.type;
    }
    if (inspectorKind) inspectorKind.innerHTML = '<option value="">관리자 인증 필요</option>';
    if (inspectorId) inspectorId.value = "";
    setBadge(statusBadge, "인증 대기", "");
    setBadge(inspectorBadge, "인증 대기", "");
  }

  refreshStatusButton?.addEventListener("click", loadSystemStatus);
  inspectorForm?.addEventListener("submit", inspectObject);
  inspectorClearButton?.addEventListener("click", () => {
    if (inspectorId) inspectorId.value = "";
    if (inspectorResult) {
      inspectorResult.textContent = "Object를 선택하고 UUID를 입력하세요.";
      delete inspectorResult.dataset.type;
    }
  });
  window.addEventListener("atlas-admin-logged-out", clearAdminReadState);
  window.addEventListener("atlas-admin-auth-expired", clearAdminReadState);

  Promise.allSettled([loadSystemStatus(), loadInspectorCapabilities()]);

  window.ATLAS_ADMIN_OBSERVABILITY = Object.freeze({
    loadSystemStatus,
    loadInspectorCapabilities
  });
})();
