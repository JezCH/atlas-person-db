(() => {
  "use strict";

  const input = document.getElementById("jsonInput");
  const result = document.getElementById("result");
  const validateButton = document.getElementById("validateButton");
  const saveButton = document.getElementById("saveButton");
  const sampleButton = document.getElementById("sampleButton");
  const queue = document.getElementById("candidateQueue");
  const summary = document.getElementById("candidateSummary");
  const statusBadge = document.getElementById("duplicateStatusBadge");
  const refreshCandidatesButton = document.getElementById("refreshCandidatesButton");
  const rebuildCandidatesButton = document.getElementById("rebuildCandidatesButton");
  const filterButtons = [...document.querySelectorAll("[data-filter]")];

  const allowedBasis = new Set([
    "reign", "term", "de_facto_rule", "military_activity",
    "religious_activity", "intellectual_activity", "artistic_activity",
    "general_activity"
  ]);

  const sample = [{
    person_name: "Mahatma Gandhi",
    politic_name: "British Raj",
    activity_start: 1915,
    activity_end: 1948,
    role: "Political leader and independence movement leader",
    period_basis: "general_activity",
    notes: "Returned to India in 1915 and remained politically active until his assassination in 1948."
  }];

  let candidateClient = null;
  let candidates = [];
  let activeFilter = "ALL";
  let mergeExecutionState = Object.freeze({
    allowed: false,
    reconciliation_semantic_version: null,
    required_reconciliation_semantic_version: "v2-relation-full-temporal",
    person_merge_lifecycle_version: "pre-p10-blocked",
    required_person_merge_lifecycle_version: "p10-v2-revalidated"
  });

  function setResult(message, type = "info") {
    result.textContent = message;
    result.dataset.type = type;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseAndValidate() {
    let rows;
    try { rows = JSON.parse(input.value); }
    catch (error) { throw new Error(`JSON 문법 오류: ${error.message}`); }
    if (!Array.isArray(rows) || rows.length === 0) throw new Error("최상위 값은 비어 있지 않은 JSON 배열이어야 합니다.");

    return rows.map((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`${index + 1}번째 항목이 객체가 아닙니다.`);
      const personName = String(row.person_name || "").trim();
      const politicName = String(row.politic_name || "").trim();
      const start = Number(row.activity_start);
      const end = Number(row.activity_end);
      const basis = String(row.period_basis || "").trim();
      if (!personName) throw new Error(`${index + 1}번째 항목에 person_name이 없습니다.`);
      if (!politicName) throw new Error(`${index + 1}번째 항목에 politic_name이 없습니다.`);
      if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`${index + 1}번째 연도는 정수여야 합니다.`);
      if (start === 0 || end === 0) throw new Error(`${index + 1}번째 연도에 역사 연도 0을 사용할 수 없습니다.`);
      if (end < start) throw new Error(`${index + 1}번째 종료연도가 시작연도보다 빠릅니다.`);
      if (!allowedBasis.has(basis)) throw new Error(`${index + 1}번째 period_basis 값이 허용 목록에 없습니다: ${basis}`);
      return {
        person_name: personName,
        politic_name: politicName,
        activity_start: start,
        activity_end: end,
        role: String(row.role || "").trim() || null,
        period_basis: basis,
        notes: String(row.notes || "").trim() || null
      };
    });
  }

  async function saveRows() {
    const adapterApi = window.ATLAS_SERVER_WRITE_ADAPTER;
    const serviceApi = window.ATLAS_ADMIN_WRITE_SERVICE;
    if (!adapterApi || !serviceApi) return setResult("ATLAS V2 읽기/쓰기 계층을 불러오지 못했습니다.", "error");
    let rows;
    try { rows = parseAndValidate(); }
    catch (error) { return setResult(error.message, "error"); }
    saveButton.disabled = true;
    setResult(`${rows.length}개 레코드를 처리하는 중...`);
    try {
      const service = serviceApi.createAdminWriteService({ adapterApi });
      const outcome = await service.saveRows(rows);
      const lines = [
        `완료: ${rows.length}개 처리`, `신규 추가: ${outcome.inserted}`,
        `기존 갱신: ${outcome.updated}`, `실패: ${outcome.failures.length}`, `쓰기 모드: ${outcome.mode}`
      ];
      if (outcome.failures.length) lines.push("", ...outcome.failures);
      setResult(lines.join("\n"), outcome.failures.length ? "error" : "success");
    } catch (error) { setResult(error.message, "error"); }
    finally { saveButton.disabled = false; }
  }

  function decisionLabel(value) {
    return value === "MERGE" ? "병합 승인" : value === "KEEP_SEPARATE" ? "별개 인물" : value === "REVIEW" ? "추가 검토" : "미판정";
  }

  function evidenceLabel(item) {
    if (item.kind === "EXACT_NAME") return `정규화 이름 일치 · ${item.key}`;
    if (item.kind === "FOLDED_NAME") return `구두점/발음기호 정리 후 일치 · ${item.key}`;
    if (item.kind === "TOKEN_SET_NAME") return `이름 토큰 구성 일치 · ${item.key}`;
    if (item.kind === "SAME_POLITY_OVERLAP") return "동일 정치체 활동기간 중첩";
    if (item.kind === "SAME_POLITY") return "동일 정치체 활동 기록";
    if (item.kind === "CHRONOLOGY_SEPARATION") return `활동시기 장기 분리 · ${item.years}년`;
    return item.kind || "근거";
  }

  function personBlock(person) {
    const names = person.names.map((row) => `<span class="name-chip">${escapeHtml(row.name)} <small>${escapeHtml(row.locale)}</small>${row.is_preferred ? " ★" : ""}</span>`).join("");
    const activities = person.activities.slice(0, 6).map((row) => `<li>${escapeHtml(row.polity_name)} · ${row.activity_start}–${row.activity_end}${row.role_name ? ` · ${escapeHtml(row.role_name)}` : ""}</li>`).join("");
    return `<div class="person-side"><h4>${escapeHtml(person.display_name)}</h4><code>${escapeHtml(person.id)}</code><div class="name-list">${names || "<span class='muted'>이름 없음</span>"}</div><ul>${activities || "<li class='muted'>활동행 없음</li>"}</ul></div>`;
  }

  function filteredCandidates() {
    if (activeFilter === "ALL") return candidates;
    if (activeFilter === "OPEN") return candidates.filter((item) => !item.current_decision);
    return candidates.filter((item) => item.current_decision === activeFilter);
  }

  function relationshipSide(candidate, row) {
    return row.person_id === candidate.low.id ? "왼쪽" : "오른쪽";
  }

  function relationshipRole(row) {
    return row.role_name || row.role_name_en || "역할 없음";
  }

  function relationshipLabel(candidate, row) {
    return `${relationshipSide(candidate, row)} · ${relationshipRole(row)} · ${row.id}`;
  }

  function provenanceLabel(row) {
    const locator = row.source_locator;
    if (!locator || typeof locator !== "object") return "원본 위치 정보 없음";
    const file = locator.file ? String(locator.file) : "원본 파일";
    const index = Number.isInteger(locator.index) ? ` #${locator.index}` : "";
    return `${file}${index}`;
  }

  function relationshipRowHtml(candidate, row) {
    return `<li class="relationship-row-detail">
      <b>${escapeHtml(relationshipLabel(candidate, row))}</b>
      ${row.notes ? `<span>${escapeHtml(row.notes)}</span>` : ""}
      <small>${escapeHtml(provenanceLabel(row))}</small>
    </li>`;
  }

  function relationshipConflictPreview(candidate) {
    const groups = candidate.relationship_reconciliation?.groups || [];
    if (!groups.length) return `<div class="relationship-ok"><strong>관계 충돌 없음</strong><p>동일 정치체·기간·기간기준의 관계 충돌이 없습니다.</p></div>`;
    return `<div class="relationship-conflicts">
      <strong>관계 정리 필요 · ${groups.length}그룹</strong>
      <p>인물 자체를 병합하더라도 아래 활동 관계는 별도로 어떤 형태를 유지할지 결정해야 합니다.</p>
      ${groups.map((group, index) => `<div class="relationship-conflict-group">
        <b>${index + 1}. ${escapeHtml(group.polity_name)} · ${group.activity_start}–${group.activity_end} · ${escapeHtml(group.period_basis)}</b>
        <ul>${group.relationships.map((row) => relationshipRowHtml(candidate, row)).join("")}</ul>
        <small>${group.has_exact_role_duplicates ? "동일 역할 중복 포함" : ""}${group.has_exact_role_duplicates && group.has_role_variants ? " · " : ""}${group.has_role_variants ? "역할 표현 차이 포함" : ""}</small>
      </div>`).join("")}
    </div>`;
  }

  function exactDuplicateRepresentativeControls(candidate, group) {
    const duplicateRoleGroups = group.exact_duplicate_role_groups || [];
    if (!duplicateRoleGroups.length) return "";
    return `<div class="exact-role-controls">
      <span>‘서로 다른 역할 유지’를 선택할 경우 아래 동일 역할 중복마다 대표 관계를 직접 선택하세요.</span>
      ${duplicateRoleGroups.map((roleGroup, index) => {
        const roleName = relationshipRole(roleGroup.relationships[0] || {});
        return `<label class="exact-role-row">
          <span>${index + 1}. ${escapeHtml(roleName)} 대표 관계</span>
          <select class="exact-role-representative" data-group-fingerprint="${escapeHtml(group.group_fingerprint)}" data-role-key="${escapeHtml(roleGroup.role_key)}">
            <option value="">대표 관계 선택</option>
            ${roleGroup.relationships.map((row) => `<option value="${escapeHtml(row.id)}">${escapeHtml(relationshipLabel(candidate, row))} · ${escapeHtml(provenanceLabel(row))}</option>`).join("")}
          </select>
        </label>`;
      }).join("")}
    </div>`;
  }

  function relationshipResolutionControls(candidate) {
    const groups = candidate.relationship_reconciliation?.groups || [];
    if (!groups.length) return "";
    return `<div class="relationship-resolution-controls">
      <strong>관계 정리 방식 선택</strong>
      <p>각 그룹마다 반드시 하나를 선택해야 실제 병합을 실행할 수 있습니다. 기본값은 없습니다.</p>
      ${groups.map((group, index) => `<div class="relationship-resolution-group">
        <label class="relationship-resolution-row">
          <span>${index + 1}. ${escapeHtml(group.polity_name)} · ${group.activity_start}–${group.activity_end}</span>
          <select class="relationship-resolution-select" data-group-fingerprint="${escapeHtml(group.group_fingerprint)}">
            <option value="">처리 방법 선택</option>
            <option value="KEEP_DISTINCT_ROLES">서로 다른 역할 유지</option>
            ${group.relationships.map((row) => `<option value="KEEP_ONE_RELATIONSHIP:${escapeHtml(row.id)}">이 관계 하나만 유지 · ${escapeHtml(relationshipLabel(candidate, row))}</option>`).join("")}
          </select>
        </label>
        ${exactDuplicateRepresentativeControls(candidate, group)}
      </div>`).join("")}
    </div>`;
  }

  function mergeExecutionBlock(candidate) {
    if (candidate.current_decision !== "MERGE") return "";
    if (!mergeExecutionState.allowed) {
      return `<div class="merge-execution is-blocked">
        <strong>실제 병합 실행 대기</strong>
        <p>병합 판정은 저장되어 있습니다. 실제 Person 삭제/이관은 semantic-key v2 reconciliation과 P10 후보 재검증이 모두 완료될 때까지 서버와 이 화면에서 차단됩니다.</p>
      </div>`;
    }
    return `<div class="merge-execution">
      <strong>승인된 실제 병합</strong>
      <p>유지할 인물을 직접 선택하세요. 선택하지 않은 인물 UUID는 모든 참조를 안전하게 이관한 뒤 삭제됩니다.</p>
      ${relationshipResolutionControls(candidate)}
      <div class="candidate-actions">
        <button class="button merge-execute" data-survivor-id="${escapeHtml(candidate.low.id)}" type="button">왼쪽 인물 유지</button>
        <button class="button merge-execute" data-survivor-id="${escapeHtml(candidate.high.id)}" type="button">오른쪽 인물 유지</button>
      </div>
    </div>`;
  }

  function renderQueue() {
    const visible = filteredCandidates();
    if (!visible.length) {
      queue.innerHTML = `<p class="empty-state">이 조건에 해당하는 활성 후보가 없습니다.</p>`;
      return;
    }
    queue.innerHTML = visible.map((candidate) => {
      const evidence = candidate.evidence.map((item) => `<li>${escapeHtml(evidenceLabel(item))}</li>`).join("");
      const decision = decisionLabel(candidate.current_decision);
      const mergeWarning = mergeExecutionState.allowed
        ? "병합 승인은 판정 기록입니다. 실제 병합은 승인 후 유지할 인물과 관계 정리 방식을 별도로 선택해야 실행됩니다."
        : "병합 승인은 판정 기록입니다. 실제 병합 실행은 semantic-key v2와 P10 후보 재검증 전까지 차단되어 있습니다.";
      return `<article class="candidate-card" data-candidate-id="${escapeHtml(candidate.id)}">
        <div class="candidate-top">
          <div><span class="confidence">${Math.round(candidate.confidence * 100)}%</span><span class="decision decision-${escapeHtml(candidate.current_decision || "OPEN")}">${escapeHtml(decision)}</span></div>
          <small>${escapeHtml(candidate.detector_version)} · 검토 ${candidate.review_count}회</small>
        </div>
        <div class="person-compare">${personBlock(candidate.low)}<div class="versus">VS</div>${personBlock(candidate.high)}</div>
        <div class="evidence-box"><strong>판정 근거</strong><ul>${evidence}</ul></div>
        ${relationshipConflictPreview(candidate)}
        <label class="rationale-label">검토 메모 <input class="rationale-input" type="text" maxlength="2000" placeholder="필요할 때만 근거/사유를 기록"></label>
        <div class="candidate-actions">
          <button class="button review-action merge" data-decision="MERGE" type="button">병합 승인</button>
          <button class="button review-action keep" data-decision="KEEP_SEPARATE" type="button">별개 인물</button>
          <button class="button review-action secondary" data-decision="REVIEW" type="button">추가 검토</button>
        </div>
        <p class="merge-warning">${escapeHtml(mergeWarning)}</p>
        ${mergeExecutionBlock(candidate)}
      </article>`;
    }).join("");
  }

  function renderSummary(values) {
    const cards = summary.querySelectorAll("div strong");
    const numbers = [values.total, values.open, values.merge, values.keep_separate, values.review];
    cards.forEach((node, index) => { node.textContent = String(numbers[index] ?? 0); });
  }

  async function loadCandidates() {
    if (!candidateClient) return;
    refreshCandidatesButton.disabled = true;
    try {
      const payload = await candidateClient.listCandidates();
      candidates = payload.candidates || [];
      mergeExecutionState = Object.freeze({ ...mergeExecutionState, ...(payload.merge_execution_state || {}) });
      renderSummary(payload.summary || {});
      renderQueue();
      statusBadge.textContent = "검토 가능";
      statusBadge.dataset.state = "ready";
    } catch (error) {
      candidates = [];
      mergeExecutionState = Object.freeze({ ...mergeExecutionState, allowed: false });
      renderSummary({ total: 0, open: 0, merge: 0, keep_separate: 0, review: 0 });
      if (error.code === "PHASE9A_SCHEMA_REQUIRED") {
        queue.innerHTML = `<p class="empty-state">Phase 9A DB schema 적용 대기 중입니다.</p>`;
        statusBadge.textContent = "Schema 대기";
      } else if (error.status === 401) {
        queue.innerHTML = `<p class="empty-state">관리자 인증 세션이 필요합니다.</p>`;
        statusBadge.textContent = "인증 필요";
      } else {
        queue.innerHTML = `<p class="empty-state">후보 조회 실패: ${escapeHtml(error.message)}</p>`;
        statusBadge.textContent = "조회 실패";
      }
      statusBadge.dataset.state = "error";
    } finally {
      refreshCandidatesButton.disabled = false;
    }
  }

  async function rebuildCandidates() {
    if (!candidateClient) return;
    rebuildCandidatesButton.disabled = true;
    statusBadge.textContent = "계산 중";
    try {
      await candidateClient.rebuildCandidates();
      await loadCandidates();
    } catch (error) {
      statusBadge.textContent = error.code === "PHASE9A_SCHEMA_REQUIRED" ? "Schema 대기" : "계산 실패";
      queue.innerHTML = `<p class="empty-state">후보 계산 실패: ${escapeHtml(error.message)}</p>`;
    } finally {
      rebuildCandidatesButton.disabled = false;
    }
  }

  async function handleReview(button) {
    const card = button.closest(".candidate-card");
    const candidateId = card?.dataset.candidateId;
    const rationale = card?.querySelector(".rationale-input")?.value || "";
    const decision = button.dataset.decision;
    if (!candidateId || !decision) return;
    [...card.querySelectorAll("button")].forEach((node) => { node.disabled = true; });
    try {
      await candidateClient.reviewCandidate({ candidateId, decision, rationale });
      await loadCandidates();
    } catch (error) {
      alert(`검토 저장 실패: ${error.message}`);
      [...card.querySelectorAll("button")].forEach((node) => { node.disabled = false; });
    }
  }

  function collectRelationshipResolutions(card, candidate) {
    const groups = candidate.relationship_reconciliation?.groups || [];
    return groups.map((group, index) => {
      const select = card.querySelector(`.relationship-resolution-select[data-group-fingerprint="${group.group_fingerprint}"]`);
      const value = String(select?.value || "");
      if (!value) throw new Error(`${index + 1}번째 관계 충돌 그룹의 처리 방법을 선택해야 합니다.`);
      if (value === "KEEP_DISTINCT_ROLES") {
        const keepRelationshipIds = (group.exact_duplicate_role_groups || []).map((roleGroup, roleIndex) => {
          const representative = card.querySelector(`.exact-role-representative[data-group-fingerprint="${group.group_fingerprint}"][data-role-key="${roleGroup.role_key}"]`);
          const representativeId = String(representative?.value || "");
          if (!representativeId) throw new Error(`${index + 1}번째 관계 그룹의 ${roleIndex + 1}번째 동일 역할 중복에서 대표 관계를 선택해야 합니다.`);
          return representativeId;
        });
        return {
          group_fingerprint: group.group_fingerprint,
          action: "KEEP_DISTINCT_ROLES",
          keep_relationship_ids: keepRelationshipIds
        };
      }
      if (value.startsWith("KEEP_ONE_RELATIONSHIP:")) {
        return {
          group_fingerprint: group.group_fingerprint,
          action: "KEEP_ONE_RELATIONSHIP",
          keep_relationship_id: value.slice("KEEP_ONE_RELATIONSHIP:".length)
        };
      }
      throw new Error("알 수 없는 관계 정리 방식입니다.");
    });
  }

  async function handleApprovedMerge(button) {
    if (!mergeExecutionState.allowed) {
      alert("실제 Person 병합은 semantic-key v2 reconciliation과 P10 후보 재검증이 완료될 때까지 차단됩니다. 병합 판정 자체는 저장할 수 있습니다.");
      return;
    }
    const card = button.closest(".candidate-card");
    const candidateId = card?.dataset.candidateId;
    const survivorId = button.dataset.survivorId;
    const candidate = candidates.find((item) => item.id === candidateId);
    if (!candidate || !survivorId) return;
    let relationshipResolutions;
    try { relationshipResolutions = collectRelationshipResolutions(card, candidate); }
    catch (error) { alert(error.message); return; }

    const survivor = candidate.low.id === survivorId ? candidate.low : candidate.high;
    const source = candidate.low.id === survivorId ? candidate.high : candidate.low;
    const relationSummary = relationshipResolutions.length
      ? `\n관계 정리: ${relationshipResolutions.length}그룹에 대해 선택한 방식으로 처리`
      : "\n관계 정리: 충돌 없음";
    const confirmed = globalThis.confirm(
      `실제 인물 병합을 실행합니다.\n\n유지: ${survivor.display_name} (${survivor.id})\n삭제: ${source.display_name} (${source.id})${relationSummary}\n\n서버는 현재 이름·활동 상태를 승인 당시 근거와 다시 대조하고, 관계 출처·연대 주장·설명을 먼저 보존한 뒤 하나의 SERIALIZABLE transaction으로 처리합니다. 계속할까요?`
    );
    if (!confirmed) return;
    [...card.querySelectorAll("button")].forEach((node) => { node.disabled = true; });
    statusBadge.textContent = "병합 중";
    try {
      const outcome = await candidateClient.executeApprovedMerge({
        candidateId,
        survivorPersonId: survivorId,
        relationshipResolutions
      });
      setResult(`병합 완료\n유지 UUID: ${outcome.survivor_person_id}\n삭제 UUID: ${outcome.source_person_id}\n감사 ID: ${outcome.merge_audit_id}`, "success");
      await candidateClient.rebuildCandidates();
      await loadCandidates();
    } catch (error) {
      alert(`실제 병합 실패: ${error.message}`);
      statusBadge.textContent = error.code === "PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION"
        ? "P10 대기"
        : error.code === "PHASE9B_SCHEMA_REQUIRED" ? "Merge Schema 대기" : "병합 실패";
      [...card.querySelectorAll("button")].forEach((node) => { node.disabled = false; });
    }
  }

  sampleButton.addEventListener("click", () => { input.value = JSON.stringify(sample, null, 2); setResult("예시를 불러왔습니다."); });
  validateButton.addEventListener("click", () => { try { setResult(`형식 정상: ${parseAndValidate().length}개 레코드`, "success"); } catch (error) { setResult(error.message, "error"); } });
  saveButton.addEventListener("click", saveRows);
  refreshCandidatesButton.addEventListener("click", loadCandidates);
  rebuildCandidatesButton.addEventListener("click", rebuildCandidates);
  queue.addEventListener("click", (event) => {
    const reviewButton = event.target.closest(".review-action");
    if (reviewButton) { handleReview(reviewButton); return; }
    const mergeButton = event.target.closest(".merge-execute");
    if (mergeButton) handleApprovedMerge(mergeButton);
  });
  filterButtons.forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((node) => node.classList.toggle("is-active", node === button));
    renderQueue();
  }));

  const duplicateApi = window.ATLAS_ADMIN_DUPLICATE_REVIEW;
  if (duplicateApi?.createDuplicateReviewClient) {
    candidateClient = duplicateApi.createDuplicateReviewClient();
    loadCandidates();
  } else {
    queue.innerHTML = `<p class="empty-state">중복 검토 클라이언트를 불러오지 못했습니다.</p>`;
    statusBadge.textContent = "로드 실패";
  }
})();
