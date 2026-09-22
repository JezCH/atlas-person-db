(() => {
  "use strict";

  function createEditor({
    escapeHtml,
    writer = null,
    outcomeError
  } = {}) {
    if (typeof escapeHtml !== "function") throw new Error("profile editor escapeHtml is required");
    if (typeof outcomeError !== "function") throw new Error("profile editor outcomeError is required");

    function profileEditorHtml(person, { portraitHtml = "" } = {}) {
      const personId = escapeHtml(person?.id || "");
      const koreanName = escapeHtml(person?.preferred_name_ko || "");
      const namuwiki = person?.external_references?.namuwiki;
      const namuwikiValue = namuwiki?.status === "linked" ? escapeHtml(namuwiki.url || "") : "";
      const namuwikiState = namuwiki?.status === "linked"
        ? `현재 연결: ${escapeHtml(namuwiki.document_title || namuwiki.url || "나무위키")}`
        : namuwiki?.status === "not_found" ? "현재 연결된 나무위키 문서 없음" : "미등록";

      return `<section class="person-detail-section person-profile-editor"><div class="person-detail-section-head"><h3>표시 정보 수정</h3><span>Person 전체 화면에 공통 반영</span></div>
        <form class="person-profile-form" data-person-profile-operation="set_person_korean_name" data-person-id="${personId}">
          <label><span>한국어 이름</span><input type="text" name="korean_name" value="${koreanName}" maxlength="160" autocomplete="off" placeholder="한국어 표시 이름" required></label>
          <button class="mini-btn edit" type="submit">이름 저장</button>
        </form>
        <form class="person-profile-form" data-person-profile-operation="set_person_external_reference" data-person-id="${personId}">
          <label><span>나무위키 문서</span><input type="text" name="namuwiki_reference" value="${namuwikiValue}" autocomplete="off" inputmode="url" placeholder="https://namu.wiki/w/... 또는 문서명" required></label>
          <button class="mini-btn edit" type="submit">등록</button>
        </form>
        <p class="person-profile-help">${namuwikiState} · 저장 시 관리자 인증 후 authoritative Person 데이터에 기록됩니다.</p>
        ${String(portraitHtml || "")}
      </section>`;
    }

    async function dispatchWrite({
      operation,
      personId,
      koreanName = "",
      namuwikiReference = ""
    } = {}) {
      if (!writer) throw new Error("Person 편집 서비스가 초기화되지 않았습니다.");
      const id = String(personId || "").trim();
      if (!id) throw new Error("Person 편집 대상이 올바르지 않습니다.");

      let outcome;
      if (operation === "set_person_korean_name") {
        if (typeof writer.setPersonKoreanName !== "function") {
          throw new Error("Person 한국어 이름 편집 서비스를 사용할 수 없습니다.");
        }
        outcome = await writer.setPersonKoreanName(id, String(koreanName || ""));
      } else if (operation === "set_person_external_reference") {
        if (typeof writer.setPersonExternalReference !== "function") {
          throw new Error("Person 외부 참조 편집 서비스를 사용할 수 없습니다.");
        }
        outcome = await writer.setPersonExternalReference(id, "namuwiki", String(namuwikiReference || ""));
      } else {
        throw new Error("지원하지 않는 Person 편집 작업입니다.");
      }

      if (outcome?.committed !== true) {
        throw new Error(outcomeError(outcome, "Person 정보 저장에 실패했습니다."));
      }

      return Object.freeze({
        operation,
        outcome,
        reloadExternalReferences:operation === "set_person_external_reference",
        successMessage:operation === "set_person_korean_name"
          ? "한국어 이름을 전체 화면에 반영했습니다."
          : "나무위키 문서를 연결했습니다."
      });
    }

    return Object.freeze({
      profileEditorHtml,
      dispatchWrite
    });
  }

  window.ATLAS_PERSON_PROFILE_EDITOR = Object.freeze({
    createEditor
  });
})();
