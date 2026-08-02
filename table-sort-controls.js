(() => {
  "use strict";

  const state = { key: "start", direction: "asc" };
  const columnIndex = { person: 0, politic: 1, start: 2, end: 3 };
  let applying = false;
  let observer = null;

  function parseYear(text) {
    const value = String(text || "").trim();
    const number = Number((value.match(/\d+/) || [""])[0]);
    if (!Number.isFinite(number)) return Number.POSITIVE_INFINITY;

    const isBce = /^(?:BC\b|BCE\b|기원전\b)/i.test(value) || /^-\s*\d+/.test(value);
    return isBce ? -number : number;
  }

  function getValue(row, key) {
    const cell = row.cells[columnIndex[key]];
    const text = cell?.textContent?.trim() || "";
    return key === "start" || key === "end" ? parseYear(text) : text;
  }

  function compareRows(a, b) {
    const av = getValue(a, state.key);
    const bv = getValue(b, state.key);
    let result;
    if (typeof av === "number" && typeof bv === "number") result = av - bv;
    else result = String(av).localeCompare(String(bv), "ko", { numeric: true, sensitivity: "base" });

    if (result === 0 && state.key !== "start") result = parseYear(a.cells[2]?.textContent) - parseYear(b.cells[2]?.textContent);
    if (result === 0) result = String(a.cells[0]?.textContent || "").localeCompare(String(b.cells[0]?.textContent || ""), "ko", { numeric: true, sensitivity: "base" });
    return state.direction === "asc" ? result : -result;
  }

  function observeBody(tbody) {
    observer?.observe(tbody, { childList: true, subtree: true, characterData: true });
  }

  function sortTable() {
    const tbody = document.getElementById("dataBody");
    if (!tbody || applying) return;
    const rows = [...tbody.querySelectorAll(":scope > tr")];
    if (rows.length < 2) {
      updateIndicators();
      return;
    }

    const sorted = [...rows].sort(compareRows);
    const changed = sorted.some((row, index) => row !== rows[index]);
    updateIndicators();
    if (!changed) return;

    applying = true;
    observer?.disconnect();
    const fragment = document.createDocumentFragment();
    sorted.forEach((row) => fragment.appendChild(row));
    tbody.appendChild(fragment);
    observeBody(tbody);
    applying = false;
  }

  function updateIndicators() {
    document.querySelectorAll(".atlas-sort-button").forEach((button) => {
      const active = button.dataset.sortKey === state.key;
      button.classList.toggle("active", active);
      button.setAttribute("aria-sort", active ? (state.direction === "asc" ? "ascending" : "descending") : "none");
      const up = button.querySelector(".sort-up");
      const down = button.querySelector(".sort-down");
      if (up) up.classList.toggle("selected", active && state.direction === "asc");
      if (down) down.classList.toggle("selected", active && state.direction === "desc");
    });
  }

  function injectControls() {
    const headerRow = document.querySelector(".table-card table thead tr");
    if (!headerRow) return false;
    const definitions = [
      [0, "person", "인물"],
      [1, "politic", "Politic"],
      [2, "start", "시작"],
      [3, "end", "종료"]
    ];

    definitions.forEach(([index, key, label]) => {
      const th = headerRow.children[index];
      if (!th || th.querySelector(".atlas-sort-button")) return;
      th.textContent = "";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "atlas-sort-button";
      button.dataset.sortKey = key;
      button.innerHTML = `<span>${label}</span><span class="sort-arrows" aria-hidden="true"><i class="sort-up">▲</i><i class="sort-down">▼</i></span>`;
      button.title = `${label} 기준 정렬`;
      button.addEventListener("click", () => {
        if (state.key === key) state.direction = state.direction === "asc" ? "desc" : "asc";
        else {
          state.key = key;
          state.direction = "asc";
        }
        sortTable();
      });
      th.appendChild(button);
    });
    updateIndicators();
    return true;
  }

  const style = document.createElement("style");
  style.textContent = `
    .atlas-sort-button{width:100%;display:flex;align-items:center;justify-content:flex-start;gap:6px;border:0;background:transparent;padding:0;color:inherit;font:inherit;font-weight:800;cursor:pointer;text-align:left}
    .atlas-sort-button:hover{color:#4e5bd2}
    .sort-arrows{display:inline-flex;flex-direction:column;line-height:.72;font-size:8px;color:#b2bac7}
    .sort-arrows i{font-style:normal}
    .sort-arrows i.selected{color:#5360d6}
    .atlas-sort-button.active{color:#3f4dc4}
    @media(max-width:760px){.atlas-sort-button{pointer-events:none}.sort-arrows{display:none}}
  `;
  document.head.appendChild(style);

  let scheduled = false;
  function scheduleSort() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      sortTable();
    });
  }

  function start() {
    injectControls();
    const tbody = document.getElementById("dataBody");
    if (!tbody) return;
    observer = new MutationObserver(() => {
      if (!applying) scheduleSort();
    });
    observeBody(tbody);
    scheduleSort();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
