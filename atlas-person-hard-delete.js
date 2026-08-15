(() => {
  "use strict";

  const api = window.ATLAS_SERVER_WRITE_ADAPTER;
  if (!api || typeof api.createAdapter !== "function") {
    console.error("ATLAS Person hard-delete UI requires the server write adapter");
    return;
  }

  const writeAdapter = api.createAdapter();
  const STYLE_ID = "atlasPersonHardDeleteStyles";
  const STYLE_HREF = "./atlas-person-hard-delete.css?v=20260816-person-hard-delete-v1";
  const ZERO_WIDTH_RE = /[\u200B-\u200D\u2060\uFEFF]/g;
  let lastSelected = null;
  let scheduled = false;

  function normalizeConfirmationName(value) {
    return String(value ?? "")
      .normalize("NFC")
      .replace(ZERO_WIDTH_RE, "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = STYLE_HREF;
    document.head.append(link);
  }

  function selectedFromDom() {
    const groups = document.getElementById("personMainGroups");
    const row = groups?.querySelector("[data-person-id].is-selected") || null;
    if (!row) return lastSelected;
    const id = String(row.dataset.personId || "").trim();
    const name = normalizeConfirmationName(row.querySelector(".person-table-identity strong, strong")?.textContent || "");
    return id && name ? { id, name } : lastSelected;
  }

  function errorText(outcome) {
    if (Array.isArray(outcome?.errors) && outcome.errors.length) return outcome.errors.join("; ");
    if (Array.isArray(outcome?.validation_failures) && outcome.validation_failures.length) {
      return outcome.validation_failures.map((item) => item.code || item.field || JSON.stringify(item)).join("; ");
    }
    return outcome?.transaction_failure || "인물 완전 삭제가 완료되지 않았습니다.";
  }

  function dangerZoneHtml(person) {
    return `<section class="person-hard-delete-zone" data-person-id="${escapeAttribute(person.id)}" data-person-name="${escapeAttribute(person.name)}">
      <div class="person-hard-delete-copy">
        <strong>인물 데이터 완전 삭제</strong>
        <p>이 Person과 현재 연결된 Activity·출처 연결·설명·소속·이벤트 참여를 실제 데이터베이스에서 삭제합니다. 화면에서만 숨기는 기능이 아닙니다. 과거 중복 검토·병합 감사 기록은 감사 이력으로 보존됩니다.</p>
      </div>
      <button class="btn person-hard-delete-button" type="button">인물 완전 삭제</button>
    </section>`;
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function ensureDangerZone() {
    scheduled = false;
    const person = selectedFromDom();
    const detail = document.getElementById("personMainDetail");
    if (!person || !detail || !detail.querySelector(".person-detail-head")) return;

    const existing = detail.querySelector(":scope > .person-hard-delete-zone");
    if (existing) {
      if (existing.dataset.personId === person.id && normalizeConfirmationName(existing.dataset.personName) === person.name) return;
      existing.remove();
    }
    detail.insertAdjacentHTML("beforeend", dangerZoneHtml(person));
  }

  function scheduleDangerZone() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(ensureDangerZone);
  }

  async function deleteSelectedPerson(button) {
    const zone = button.closest(".person-hard-delete-zone");
    const personId = String(zone?.dataset.personId || "").trim();
    const personName = normalizeConfirmationName(zone?.dataset.personName || "");
    if (!personId || !personName) {
      window.alert("삭제할 Person UUID 또는 인물명을 확인할 수 없습니다.");
      return;
    }

    const firstConfirmed = window.confirm(
      `「${personName}」 Person을 데이터베이스에서 완전히 삭제합니다.\n\n` +
      "현재 연결된 모든 Activity와 Person 종속 데이터도 함께 삭제되며 되돌릴 수 없습니다. 계속할까요?"
    );
    if (!firstConfirmed) return;

    const typed = window.prompt(
      `최종 확인입니다. 삭제하려면 아래 인물명을 정확히 입력하세요.\n\n${personName}`,
      ""
    );
    if (typed == null) return;
    const normalizedTyped = normalizeConfirmationName(typed);
    if (normalizedTyped !== personName) {
      window.alert("인물명이 정확히 일치하지 않아 삭제하지 않았습니다.");
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "삭제 중…";
    try {
      const outcome = await writeAdapter.deletePerson(personId, normalizedTyped);
      const committed = outcome?.committed === true
        && outcome?.v2?.committed === true
        && String(outcome?.v2?.deleted_person_id || "") === personId
        && outcome?.verification?.checked === true
        && outcome?.verification?.match === true;
      if (!committed) {
        window.alert(`삭제 실패: ${errorText(outcome)}`);
        return;
      }

      const counts = outcome.v2.deleted_counts || {};
      const activities = Number(counts.activities || 0);
      window.alert(`「${personName}」을 완전히 삭제했습니다.\nActivity ${activities}건과 연결된 현재 Person 데이터가 함께 삭제되었고, DB 재검증도 통과했습니다.`);
      window.location.reload();
    } catch (error) {
      console.error("ATLAS Person hard-delete failed", error);
      window.alert(`삭제 실패: ${error?.message || String(error)}`);
    } finally {
      if (document.contains(button)) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  document.addEventListener("click", (event) => {
    const deleteButton = event.target.closest(".person-hard-delete-button");
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      void deleteSelectedPerson(deleteButton);
      return;
    }

    const row = event.target.closest("[data-person-id]");
    const groups = document.getElementById("personMainGroups");
    if (!row || !groups?.contains(row)) return;
    const id = String(row.dataset.personId || "").trim();
    const name = normalizeConfirmationName(row.querySelector(".person-table-identity strong, strong")?.textContent || "");
    if (id && name) lastSelected = { id, name };
    scheduleDangerZone();
  }, true);

  const observer = new MutationObserver(scheduleDangerZone);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("atlas-person-main-rendered", scheduleDangerZone);
  ensureStyles();
  scheduleDangerZone();

  window.ATLAS_PERSON_HARD_DELETE = Object.freeze({
    ensureDangerZone,
    selectedFromDom,
    normalizeConfirmationName
  });
})();
