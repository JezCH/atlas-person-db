(() => {
  "use strict";

  const PORTRAIT_EVIDENCE_ROLE_LABELS = Object.freeze({
    facial_reference:"얼굴 근거",
    clothing_reference:"복식 근거",
    iconography_reference:"도상 근거",
    textual_description:"문헌 묘사",
    context_reference:"맥락 참고"
  });

  function createRenderer({ escapeHtml } = {}) {
    if (typeof escapeHtml !== "function") throw new Error("portrait view escapeHtml is required");

    function portraitKindOptions(selected = "") {
      return [
        ["archival","사진·동시대 기록"],
        ["artwork","미술·초상 작품"],
        ["reconstruction","역사적 복원·재구성"],
        ["symbolic","상징 이미지"]
      ].map(([value,label]) =>
        `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`
      ).join("");
    }

    function portraitEvidenceOptions(selected = "") {
      return [
        ["direct","직접 근거"],
        ["strong","강한 근거"],
        ["contextual","맥락 근거"],
        ["symbolic","상징적 근거"]
      ].map(([value,label]) =>
        `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`
      ).join("");
    }

    function portraitEvidenceRoleOptions(selected = "") {
      return Object.entries(PORTRAIT_EVIDENCE_ROLE_LABELS)
        .map(([value,label]) =>
          `<option value="${value}"${selected === value ? " selected" : ""}>${label}</option>`
        )
        .join("");
    }

    function portraitSourceDisplay(source) {
      const row = source?.source && typeof source.source === "object" ? source.source : source;
      return row?.citation_text || row?.title || row?.canonical_url || source?.source_id || "출처";
    }

    function portraitSourceCandidates(portrait, sourceCandidates) {
      const byId = new Map();
      for (const source of sourceCandidates || []) {
        const id = String(source?.source_id || "").trim();
        if (id) byId.set(id, source);
      }
      for (const link of portrait?.sources || []) {
        const id = String(link?.source_id || "").trim();
        if (id && !byId.has(id)) byId.set(id, { source_id:id, ...(link?.source || {}) });
      }
      return [...byId.values()].sort((a,b) =>
        portraitSourceDisplay(a).localeCompare(portraitSourceDisplay(b), "ko")
      );
    }

    function portraitProvenanceHtml(person, portrait, { sourceCandidates = null } = {}) {
      if (!portrait) return "";
      const personId = escapeHtml(person?.id || "");
      const links = Array.isArray(portrait.sources) ? portrait.sources : [];
      const candidates = portraitSourceCandidates(portrait, sourceCandidates);
      const linked = links.length
        ? `<div class="person-portrait-source-list">${links.map((link) => {
            const sourceId = escapeHtml(link?.source_id || "");
            const role = String(link?.evidence_role || "");
            return `<form class="person-portrait-source-row" data-person-portrait-operation="source-edit" data-person-id="${personId}" data-source-id="${sourceId}" data-original-role="${escapeHtml(role)}">
              <span class="person-portrait-source-label">${escapeHtml(portraitSourceDisplay(link))}</span>
              <select name="evidence_role" aria-label="초상 근거 역할">${portraitEvidenceRoleOptions(role)}</select>
              <button class="mini-btn edit" type="submit">역할 저장</button>
              <button class="mini-btn danger delete" type="button" data-person-portrait-source-remove data-person-id="${personId}" data-source-id="${sourceId}" data-evidence-role="${escapeHtml(role)}">연결 해제</button>
            </form>`;
          }).join("")}</div>`
        : '<p class="person-profile-help">연결된 초상 근거 출처가 없습니다.</p>';
      const candidateOptions = candidates.map((source) =>
        `<option value="${escapeHtml(source.source_id || "")}">${escapeHtml(portraitSourceDisplay(source))}</option>`
      ).join("");
      const add = sourceCandidates === null
        ? `<button class="mini-btn" type="button" data-person-portrait-load-sources data-person-id="${personId}">Person 출처 불러오기</button>`
        : candidateOptions
          ? `<form class="person-profile-form person-portrait-source-add" data-person-portrait-operation="source-add" data-person-id="${personId}">
              <label><span>Person 출처에서 근거 추가</span><select name="source_id" required><option value="" selected disabled>출처 선택</option>${candidateOptions}</select></label>
              <label><span>근거 역할</span><select name="evidence_role" required>${portraitEvidenceRoleOptions("context_reference")}</select></label>
              <button class="mini-btn edit" type="submit">근거 연결</button>
            </form>`
          : '<p class="person-profile-help">이 Person에 연결된 canonical Source가 없습니다. Source 생성·Person 연결은 별도 Source authoring 책임으로 유지합니다.</p>';
      return `<div class="person-portrait-provenance">
        <div class="person-detail-section-head"><h4>초상 근거</h4><span>${links.length}건</span></div>
        ${linked}
        ${add}
      </div>`;
    }

    function portraitEditorHtml(person, portraitResult = null, { sourceCandidates = null } = {}) {
      const personId = escapeHtml(person?.id || "");
      if (!personId) return "";
      if (portraitResult?.error) {
        return '<div class="person-portrait-editor is-error"><p class="person-profile-help">초상화 조회에 실패해 업로드·삭제를 비활성화했습니다. 새로고침 후 다시 시도하세요.</p></div>';
      }
      const portrait = portraitResult?.portrait || null;
      const currentKind = String(portrait?.portrait_kind || "");
      const currentEvidence = String(portrait?.evidence_level || "");
      const currentState = portrait
        ? `현재 초상: ${escapeHtml(currentKind || "유형 미상")} · ${escapeHtml(currentEvidence || "근거 미상")} · 출처 ${Array.isArray(portrait.sources) ? portrait.sources.length : 0}건`
        : "현재 등록된 초상 없음";
      return `<div class="person-portrait-editor">
        <form class="person-profile-form person-portrait-form" data-person-portrait-operation="upload" data-person-id="${personId}">
          <label class="person-portrait-file"><span>초상 이미지</span><input type="file" name="portrait_file" accept="image/jpeg,image/png,image/webp,image/avif" required></label><div class="person-portrait-upload-preview" data-person-portrait-preview hidden><img alt="업로드 초상 미리보기"><span>4:5 자동 중앙 크롭 미리보기</span></div>
          <label><span>초상 유형</span><select name="portrait_kind" required><option value=""${currentKind ? "" : " selected"} disabled>유형 선택</option>${portraitKindOptions(currentKind)}</select></label>
          <label><span>근거 수준</span><select name="evidence_level" required><option value=""${currentEvidence ? "" : " selected"} disabled>근거 선택</option>${portraitEvidenceOptions(currentEvidence)}</select></label>
          <div class="person-portrait-actions"><button class="mini-btn edit" type="submit">${portrait ? "초상 교체" : "초상 업로드"}</button>${portrait ? `<button class="mini-btn danger delete" type="button" data-person-portrait-delete data-person-id="${personId}">초상 삭제</button>` : ""}</div>
        </form>
        <p class="person-profile-help">${currentState} · JPG/PNG/WebP/AVIF 이미지는 4:5로 중앙 크롭하고 최대 1024×1280 WebP로 변환합니다. 원본은 저장하지 않습니다.</p>
        ${portrait ? `<form class="person-profile-form person-portrait-metadata-form" data-person-portrait-operation="metadata" data-person-id="${personId}">
          <label><span>초상 유형</span><select name="portrait_kind" required>${portraitKindOptions(currentKind)}</select></label>
          <label><span>근거 수준</span><select name="evidence_level" required>${portraitEvidenceOptions(currentEvidence)}</select></label>
          <button class="mini-btn edit" type="submit">메타데이터 저장</button>
        </form>${portraitProvenanceHtml(person, portrait, { sourceCandidates })}` : ""}
      </div>`;
    }

    return Object.freeze({
      portraitKindOptions,
      portraitEvidenceOptions,
      portraitEvidenceRoleOptions,
      portraitSourceDisplay,
      portraitSourceCandidates,
      portraitProvenanceHtml,
      portraitEditorHtml
    });
  }

  window.ATLAS_PERSON_PORTRAIT_VIEW = Object.freeze({
    PORTRAIT_EVIDENCE_ROLE_LABELS,
    createRenderer
  });
})();
