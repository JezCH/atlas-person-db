(() => {
  "use strict";
  function defaultOutcomeError(outcome, fallback) {
    if (Array.isArray(outcome?.errors) && outcome.errors.length) return outcome.errors.join("; ");
    return outcome?.transaction_failure || fallback;
  }
  function createController({ writer = null, getSelectedPersonId, outcomeError = defaultOutcomeError } = {}) {
    if (typeof getSelectedPersonId !== "function") throw new Error("portrait controller selected-person getter is required");
    if (typeof outcomeError !== "function") throw new Error("portrait controller outcomeError is required");
    function requireSelectedPerson(personId) {
      const id = String(personId || "").trim();
      if (!id || id !== String(getSelectedPersonId() || "").trim()) throw new Error("현재 선택한 인물과 초상화 편집 대상이 다릅니다.");
      return id;
    }
    function requireCommitted(outcome, fallback) {
      if (outcome?.committed !== true) throw new Error(outcomeError(outcome, fallback));
      return outcome;
    }
    async function setPortrait({ personId, imageBase64 } = {}) {
      const id = requireSelectedPerson(personId);
      if (!writer?.setPersonPortrait) throw new Error("초상화 저장 서비스를 사용할 수 없습니다.");
      return requireCommitted(await writer.setPersonPortrait({
        person_id:id,
        image_base64:String(imageBase64 || "").trim()
      }), "초상화 저장에 실패했습니다.");
    }
    async function deletePortrait(personId) {
      const id = requireSelectedPerson(personId);
      if (!writer?.deletePersonPortrait) throw new Error("초상화 삭제 서비스를 사용할 수 없습니다.");
      return requireCommitted(await writer.deletePersonPortrait(id), "초상화 삭제에 실패했습니다.");
    }
    return Object.freeze({ setPortrait, deletePortrait });
  }
  window.ATLAS_PERSON_PORTRAIT_CONTROLLER = Object.freeze({ createController });
})();
