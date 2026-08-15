(() => {
  "use strict";

  const HEADER_CELLS = [
    ["person-table-col-identity", "인물"],
    ["person-table-col-range", "주요 활동기간"],
    ["person-table-col-activities", "활동 관계"],
    ["person-table-col-count", "Activity"]
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
    const existing = row.querySelector(":scope > .person-table-identity");
    if (existing) return existing;
    const name = row.querySelector(":scope > strong");
    if (!name) return null;
    const canonical = row.querySelector(":scope > .person-card-canonical");
    const identity = document.createElement("span");
    identity.className = "person-table-identity";
    row.insertBefore(identity, name);
    identity.append(name);
    if (canonical) identity.append(canonical);
    return identity;
  }

  function foldExceptionalStatus(identity, status) {
    if (!status) return;
    let meaningful = 0;
    for (const child of [...status.children]) {
      const value = String(child.textContent || "").trim();
      if (!value || value.toLowerCase() === "historical") {
        child.hidden = true;
      } else {
        meaningful += 1;
      }
    }
    if (!meaningful || !identity) {
      status.remove();
      return;
    }
    status.classList.add("person-table-status-inline");
    identity.append(status);
  }

  function decorateRow(row) {
    if (!row || row.dataset.personTableDecorated === "true") return;
    row.dataset.personTableDecorated = "true";
    row.classList.add("person-table-row");

    const identity = wrapIdentity(row);
    const range = row.querySelector(":scope > .person-card-range");
    const activities = row.querySelector(":scope > .person-card-activities");
    const count = row.querySelector(":scope > .person-card-count");
    const status = row.querySelector(":scope > .person-card-top");

    range?.classList.add("person-table-range");
    activities?.classList.add("person-table-activities");
    count?.classList.add("person-table-count");
    foldExceptionalStatus(identity, status);

    // Keep the body DOM in the exact same semantic order as HEADER_CELLS.
    // Historicity/type are group-level metadata for historical rows, so they
    // do not reserve a dedicated column. Non-historical exceptions remain
    // visible inside the Person identity cell.
    for (const cell of [identity, range, activities, count]) {
      if (cell) row.append(cell);
    }
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
