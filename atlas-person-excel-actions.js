(() => {
  "use strict";

  function invoke(actionName, fallbackMessage) {
    const api = window.ATLAS_PERSON_MAIN;
    const action = api?.[actionName];
    if (typeof action === "function") return action();
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = fallbackMessage;
    toast.hidden = false;
  }

  function makeActionButton(id, label, title, actionName, fallbackMessage) {
    const button = document.createElement("button");
    button.id = id;
    button.className = "btn person-main-excel-action";
    button.type = "button";
    button.textContent = label;
    button.title = title;
    button.addEventListener("click", () => invoke(actionName, fallbackMessage));
    return button;
  }

  function mountExcelActions() {
    const actions = document.querySelector(".person-main-actions");
    if (!actions || actions.dataset.excelActionsMounted === "true") return;

    const more = actions.querySelector(".person-main-more");
    const exportButton = makeActionButton(
      "personMainExcelExport",
      "⇩ 엑셀 출력",
      "현재 Person 관계 데이터를 엑셀 파일로 출력합니다.",
      "exportLegacyExcel",
      "엑셀 출력 도구를 사용할 수 없습니다."
    );
    const importButton = makeActionButton(
      "personMainExcelImport",
      "⇧ 엑셀 업로드",
      "엑셀 파일에서 Person 관계 데이터를 업로드합니다.",
      "importLegacyExcel",
      "엑셀 업로드 도구를 사용할 수 없습니다."
    );

    if (more) {
      actions.insertBefore(exportButton, more);
      actions.insertBefore(importButton, more);
    } else {
      actions.append(exportButton, importButton);
    }

    const legacyMenuExport = document.querySelector('#personMainMoreMenu [data-person-main-action="export"]');
    const legacyMenuImport = document.querySelector('#personMainMoreMenu [data-person-main-action="import"]');
    if (legacyMenuExport) legacyMenuExport.hidden = true;
    if (legacyMenuImport) legacyMenuImport.hidden = true;

    actions.dataset.excelActionsMounted = "true";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountExcelActions, { once: true });
  } else {
    mountExcelActions();
  }

  window.addEventListener("atlas-person-main-rendered", mountExcelActions);
  window.ATLAS_PERSON_EXCEL_ACTIONS = Object.freeze({ mountExcelActions });
})();
