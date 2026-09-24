(() => {
  "use strict";
  function createRenderer({ escapeHtml } = {}) {
    if (typeof escapeHtml !== "function") throw new Error("portrait view escapeHtml is required");
    function portraitEditorHtml(person, portraitResult = null) {
      const personId = escapeHtml(person?.id || "");
      if (!personId) return "";
      if (portraitResult?.error) return '<div class="person-portrait-editor is-error"><p class="person-profile-help">초상화 조회에 실패해 업로드·삭제를 비활성화했습니다. 새로고침 후 다시 시도하세요.</p></div>';
      const portrait = portraitResult?.portrait || null;
      return `<div class="person-portrait-editor">
        <form class="person-profile-form person-portrait-form" data-person-portrait-operation="upload" data-person-id="${personId}">
          <label class="person-portrait-file"><span>초상 이미지</span><input type="file" name="portrait_file" accept="image/jpeg,image/png,image/webp,image/avif" required></label>
          <div class="person-portrait-upload-preview" data-person-portrait-preview hidden><img alt="업로드 초상 미리보기"><span>4:5 자동 중앙 크롭 미리보기</span></div>
          <div class="person-portrait-actions"><button class="mini-btn edit" type="submit">${portrait ? "초상 교체" : "초상 업로드"}</button>${portrait ? `<button class="mini-btn danger delete" type="button" data-person-portrait-delete data-person-id="${personId}">초상 삭제</button>` : ""}</div>
        </form>
        <p class="person-profile-help">JPG/PNG/WebP/AVIF 이미지는 4:5로 중앙 크롭하고 최대 1024×1280 WebP로 변환합니다. 원본은 저장하지 않습니다.</p>
      </div>`;
    }
    return Object.freeze({ portraitEditorHtml });
  }
  window.ATLAS_PERSON_PORTRAIT_VIEW = Object.freeze({ createRenderer });
})();
