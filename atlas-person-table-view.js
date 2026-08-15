(() => {
  "use strict";

  const HEADER_CELLS = [
    ["person-table-col-identity", "인물"],
    ["person-table-col-range", "주요 활동기간"],
    ["person-table-col-activities", "활동 관계"],
    ["person-table-col-count", "Activity"],
    ["person-table-col-status", "역사성 · 유형"]
  ];

  function makeHeader() {
    const header = document.createElement("div");
    header.className = "person-table-head";
    header.setAttribute("aria-hidden", "true");
    for (const [className, label] of HEADER_CELLS) {
      const cell = document.createElement("span");
      cell.className = `person-table-head-cell ${className}`;
      cell.textContent = label;
      header.append(cell);
    }
    return header;
  }

  function wrapIdentity(row) {
    if (row.querySelector(":scope > .person-table-identity")) return;
    const name = row.querySelector(":scope > strong");
    if (!name) return;
    const canonical = row.querySelector(":scope > .person-card-canonical");
    const identity = document.createElement("span");
    identity.className = "person-table-identity";
    row.insertBefore(identity, name);
    identity.append(name);
    if (canonical) identity.append(canonical);
  }

  function decorateRow(row) {
    if (!row || row.dataset.personTableDecorated === "true") return;
    row.dataset.personTableDecorated = "true";
    row.classList.add("person-table-row");
    wrapIdentity(row);
    row.querySelector(":scope > .person-card-range")?.classList.add("person-table-range");
    row.querySelector(":scope > .person-card-activities")?.classList.add("person-table-activities");
    row.querySelector(":scope > .person-card-count")?.classList.add("person-table-count");
    row.querySelector(":scope > .person-card-top")?.classList.add("person-table-status");
  }

  function decorateGrid(grid) {
    if (!grid) return;
    grid.classList.add("person-table-grid");
    if (!grid.querySelector(":scope > .person-table-head")) grid.prepend(makeHeader());
    grid.querySelectorAll(":scope > .person-card").forEach(decorateRow);
  }

  function decorateAll() {
    document.querySelectorAll(".person-card-grid").forEach(decorateGrid);
  }

  window.addEventListener("atlas-person-main-rendered", decorateAll);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", decorateAll, { once: true });
  } else {
    queueMicrotask(decorateAll);
  }

  window.ATLAS_PERSON_TABLE_VIEW = Object.freeze({ decorateAll });
})();
