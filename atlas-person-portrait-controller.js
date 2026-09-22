(() => {
  "use strict";

  function defaultOutcomeError(outcome, fallback) {
    if (Array.isArray(outcome?.errors) && outcome.errors.length) return outcome.errors.join("; ");
    if (Array.isArray(outcome?.validation_failures) && outcome.validation_failures.length) {
      return outcome.validation_failures.map((row) => row?.code || row?.field || "validation failed").join("; ");
    }
    return outcome?.transaction_failure || fallback;
  }

  function normalizePortraitSources(portrait) {
    if (!Array.isArray(portrait?.sources)) return [];
    return portrait.sources
      .map((row) => ({
        source_id:String(row?.source_id || "").trim(),
        evidence_role:String(row?.evidence_role || "").trim()
      }))
      .filter((row) => row.source_id && row.evidence_role);
  }

  function createController({
    writer = null,
    getSelectedPersonId,
    getSelectedPortrait,
    outcomeError = defaultOutcomeError
  } = {}) {
    if (typeof getSelectedPersonId !== "function") throw new Error("portrait controller selected-person getter is required");
    if (typeof getSelectedPortrait !== "function") throw new Error("portrait controller selected-portrait getter is required");
    if (typeof outcomeError !== "function") throw new Error("portrait controller outcomeError is required");

    function selectedPersonId() {
      return String(getSelectedPersonId() || "").trim();
    }

    function selectedPortrait() {
      return getSelectedPortrait() || null;
    }

    function requireSelectedPerson(personId, { requirePortrait = false } = {}) {
      const id = String(personId || "").trim();
      if (!id || id !== selectedPersonId()) {
        throw new Error("현재 선택한 인물과 초상화 편집 대상이 다릅니다.");
      }
      const portrait = selectedPortrait();
      if (requirePortrait && !portrait) {
        throw new Error("현재 초상화 상태를 다시 불러온 뒤 시도하세요.");
      }
      return { id, portrait };
    }

    function preservedPortraitSources() {
      return normalizePortraitSources(selectedPortrait());
    }

    function requireCommitted(outcome, fallback) {
      if (outcome?.committed !== true) throw new Error(outcomeError(outcome, fallback));
      return outcome;
    }

    async function loadSourceCandidates(personId) {
      const { id } = requireSelectedPerson(personId, { requirePortrait:true });
      if (!writer?.readPersonPortraitSourceCandidates) {
        throw new Error("초상 근거 후보 조회 서비스를 사용할 수 없습니다.");
      }
      const outcome = await writer.readPersonPortraitSourceCandidates(id);
      if (outcome?.committed !== true || !Array.isArray(outcome?.candidates)) {
        throw new Error(outcomeError(outcome, "Person 출처 조회에 실패했습니다."));
      }
      return Object.freeze({
        outcome,
        candidates:outcome.candidates.slice()
      });
    }

    async function patchMetadata(personId, {
      portraitKind,
      evidenceLevel,
      sources
    } = {}) {
      const { id, portrait } = requireSelectedPerson(personId, { requirePortrait:true });
      if (!writer?.updatePersonPortraitMetadata) {
        throw new Error("초상 근거 편집 서비스를 사용할 수 없습니다.");
      }
      const outcome = await writer.updatePersonPortraitMetadata({
        person_id:id,
        portrait_kind:String(portraitKind ?? portrait?.portrait_kind ?? "").trim(),
        evidence_level:String(evidenceLevel ?? portrait?.evidence_level ?? "").trim(),
        sources:Array.isArray(sources) ? sources : preservedPortraitSources()
      });
      return requireCommitted(outcome, "초상 근거 저장에 실패했습니다.");
    }

    async function addSource(personId, sourceId, evidenceRole) {
      const sid = String(sourceId || "").trim();
      const role = String(evidenceRole || "").trim();
      if (!sid || !role) throw new Error("연결할 출처와 근거 역할을 선택하세요.");
      const links = preservedPortraitSources();
      links.push({ source_id:sid, evidence_role:role });
      return patchMetadata(personId, { sources:links });
    }

    async function editSource(personId, sourceId, originalRole, evidenceRole) {
      const sid = String(sourceId || "").trim();
      const before = String(originalRole || "").trim();
      const role = String(evidenceRole || "").trim();
      if (!sid || !before || !role) throw new Error("초상 근거 연결 정보가 올바르지 않습니다.");
      const nextLinks = preservedPortraitSources().map((row) =>
        row.source_id === sid && row.evidence_role === before
          ? { source_id:sid, evidence_role:role }
          : row
      );
      return patchMetadata(personId, { sources:nextLinks });
    }

    async function removeSource(personId, sourceId, evidenceRole) {
      const sid = String(sourceId || "").trim();
      const role = String(evidenceRole || "").trim();
      if (!sid || !role) throw new Error("초상 근거 연결 정보가 올바르지 않습니다.");
      const nextLinks = preservedPortraitSources().filter((row) =>
        !(row.source_id === sid && row.evidence_role === role)
      );
      return patchMetadata(personId, { sources:nextLinks });
    }

    async function setPortrait({
      personId,
      imageBase64,
      portraitKind,
      evidenceLevel
    } = {}) {
      const { id } = requireSelectedPerson(personId);
      if (!writer?.setPersonPortrait) throw new Error("초상화 저장 서비스를 사용할 수 없습니다.");
      const outcome = await writer.setPersonPortrait({
        person_id:id,
        image_base64:String(imageBase64 || "").trim(),
        portrait_kind:String(portraitKind || "").trim(),
        evidence_level:String(evidenceLevel || "").trim(),
        sources:preservedPortraitSources()
      });
      return requireCommitted(outcome, "초상화 저장에 실패했습니다.");
    }

    async function deletePortrait(personId) {
      const { id } = requireSelectedPerson(personId);
      if (!writer?.deletePersonPortrait) throw new Error("초상화 삭제 서비스를 사용할 수 없습니다.");
      const outcome = await writer.deletePersonPortrait(id);
      return requireCommitted(outcome, "초상화 삭제에 실패했습니다.");
    }

    return Object.freeze({
      preservedPortraitSources,
      loadSourceCandidates,
      patchMetadata,
      addSource,
      editSource,
      removeSource,
      setPortrait,
      deletePortrait
    });
  }

  window.ATLAS_PERSON_PORTRAIT_CONTROLLER = Object.freeze({
    normalizePortraitSources,
    createController
  });
})();
