(() => {
  "use strict";

  const VALID_SORTS = new Set(["start-asc", "start-desc", "person-asc", "person-desc", "polity-asc", "polity-desc"]);
  const COLLATOR = new Intl.Collator("ko", { numeric: true, sensitivity: "base" });
  const SORT_KEYS = new Set(["start", "person", "polity"]);
  let sortOrder = "start-asc";

  function normalizeSortOrder(value) {
    const requested = String(value || "");
    return VALID_SORTS.has(requested) ? requested : "start-asc";
  }

  function sortState(value = sortOrder) {
    const normalized = normalizeSortOrder(value);
    const separator = normalized.lastIndexOf("-");
    return { key: normalized.slice(0, separator), direction: normalized.slice(separator + 1) };
  }

  function makeSortButton(label, key) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "person-table-sort-button";
    button.dataset.personSortKey = key;

    const text = document.createElement("span");
    text.className = "person-table-sort-label";
    text.textContent = label;

    const icon = document.createElement("span");
    icon.className = "person-table-sort-icon";
    icon.setAttribute("aria-hidden", "true");

    button.append(text, icon);
    return button;
  }

  function installSortButton(owner, label, key) {
    if (!owner || owner.querySelector?.("button[data-person-sort-key]")) return;
    owner.replaceChildren(makeSortButton(label, key));
    owner.classList.add("is-sortable");
    owner.setAttribute("role", "columnheader");
  }

  function installHeaderControls(grid) {
    const header = grid?.querySelector?.(":scope > .person-table-head");
    if (!header) return null;

    header.removeAttribute("aria-hidden");
    header.setAttribute("role", "row");
    for (const cell of header.querySelectorAll(":scope > .person-table-head-cell")) cell.setAttribute("role", "columnheader");

    installSortButton(header.querySelector(".person-table-col-identity"), "인물", "person");
    installSortButton(header.querySelector(".person-table-col-range"), "주요 활동기간", "start");
    const polity = header.querySelector(".person-table-activity-subhead > span:first-child");
    installSortButton(polity, "정치체 · 관계", "polity");
    return header;
  }

  function refreshHeaderState(header) {
    if (!header) return;
    const current = sortState();
    for (const button of header.querySelectorAll("button[data-person-sort-key]")) {
      const key = String(button.dataset.personSortKey || "");
      const active = key === current.key;
      const owner = button.closest(".person-table-head-cell, .person-table-activity-subhead > span");
      const icon = button.querySelector(".person-table-sort-icon");
      const label = String(button.querySelector(".person-table-sort-label")?.textContent || "정렬");
      const stateLabel = active ? (current.direction === "desc" ? "내림차순" : "오름차순") : "정렬 안 됨";

      button.classList.toggle("is-active", active);
      owner?.classList.toggle("is-sort-active", active);
      owner?.setAttribute("aria-sort", active ? (current.direction === "desc" ? "descending" : "ascending") : "none");
      if (icon) icon.textContent = active ? (current.direction === "desc" ? "▼" : "▲") : "↕";
      button.setAttribute("aria-label", `${label} 정렬 · ${stateLabel}`);
      button.title = active ? `${label} ${stateLabel} · 클릭하여 방향 전환` : `${label} 오름차순으로 정렬`;
    }
  }

  function rowPersonName(row) {
    return String(row?.querySelector?.(".person-table-identity > strong")?.textContent || row?.querySelector?.("strong")?.textContent || "").trim();
  }

  function rowPrimaryPolity(row) {
    return String(row?.querySelector?.(".person-table-activities .person-card-activity:first-child .person-card-activity-head b")?.textContent || "").trim();
  }

  function chronologyYearsFromRow(row) {
    const raw = String(row?.querySelector?.(".person-table-range")?.textContent || "").trim();
    if (!raw || /^주요 활동연도 미상/i.test(raw) || /^시작 미상/i.test(raw)) return { start: null, end: null };
    const matches = [...raw.toUpperCase().matchAll(/\b(BC|AD)\s*(\d+)\b/g)];
    const value = (match) => {
      if (!match) return null;
      const absolute = Number(match[2]);
      if (!Number.isFinite(absolute) || absolute <= 0) return null;
      return match[1] === "BC" ? -absolute : absolute;
    };
    return { start: value(matches[0]), end: value(matches[1]) };
  }

  function compareNullableNumber(left, right, direction) {
    const leftMissing = !Number.isInteger(left);
    const rightMissing = !Number.isInteger(right);
    if (leftMissing && !rightMissing) return 1;
    if (!leftMissing && rightMissing) return -1;
    if (leftMissing && rightMissing) return 0;
    const result = left - right;
    return direction === "desc" ? -result : result;
  }

  function compareNullableText(left, right, direction) {
    const leftValue = String(left || "").trim();
    const rightValue = String(right || "").trim();
    if (!leftValue && rightValue) return 1;
    if (leftValue && !rightValue) return -1;
    if (!leftValue && !rightValue) return 0;
    const result = COLLATOR.compare(leftValue, rightValue);
    return direction === "desc" ? -result : result;
  }

  function compareRows(left, right, requestedSort = sortOrder) {
    const current = sortState(requestedSort);
    let result = 0;
    if (current.key === "person") {
      result = compareNullableText(rowPersonName(left), rowPersonName(right), current.direction);
    } else if (current.key === "polity") {
      result = compareNullableText(rowPrimaryPolity(left), rowPrimaryPolity(right), current.direction);
    } else {
      const leftYears = chronologyYearsFromRow(left);
      const rightYears = chronologyYearsFromRow(right);
      result = compareNullableNumber(leftYears.start, rightYears.start, current.direction)
        || compareNullableNumber(leftYears.end, rightYears.end, current.direction);
    }
    if (result) return result;
    return COLLATOR.compare(rowPersonName(left), rowPersonName(right))
      || String(left?.dataset?.personId || "").localeCompare(String(right?.dataset?.personId || ""));
  }

  function allRows(grid) {
    return [...grid.querySelectorAll(".person-era-group .person-card.person-table-row")];
  }

  function eraBandTemplates(grid) {
    const templates = new Map();
    for (const group of grid.querySelectorAll(":scope > .person-era-group[data-atlas-era]")) {
      const code = String(group.dataset.atlasEra || "").trim();
      const band = group.querySelector(":scope > .person-era-band");
      if (code && band && !templates.has(code)) templates.set(code, band.cloneNode(true));
    }
    return templates;
  }

  function makeEraGroup(code, template, flat = false) {
    const group = document.createElement("div");
    group.className = `person-era-group${flat ? " person-era-group-flat" : ""}`;
    group.dataset.atlasEra = code;

    const band = template?.cloneNode?.(true) || document.createElement("div");
    if (!band.classList.contains("person-era-band")) {
      band.className = `person-era-band person-era-${code}`;
      const label = document.createElement("span");
      label.textContent = code || "연대 미상";
      band.append(label);
    }

    const rows = document.createElement("div");
    rows.className = "person-era-rows";
    group.append(band, rows);
    return { group, rows };
  }

  function rebuildGrid(grid) {
    if (!grid) return;
    const header = installHeaderControls(grid);
    const rows = allRows(grid);
    if (!rows.length) {
      refreshHeaderState(header);
      return;
    }

    const templates = eraBandTemplates(grid);
    const current = sortState();
    const rankedRows = rows.slice().sort((left, right) => compareRows(left, right, sortOrder));
    for (const group of [...grid.querySelectorAll(":scope > .person-era-group")]) group.remove();

    if (current.key === "start") {
      grid.classList.remove("person-table-sort-flat");
      let activeCode = null;
      let activeRows = null;
      for (const row of rankedRows) {
        const code = String(row.dataset.atlasEra || "unknown");
        if (code !== activeCode) {
          const built = makeEraGroup(code, templates.get(code));
          grid.append(built.group);
          activeCode = code;
          activeRows = built.rows;
        }
        activeRows.append(row);
      }
    } else {
      grid.classList.add("person-table-sort-flat");
      for (const row of rankedRows) {
        const code = String(row.dataset.atlasEra || "unknown");
        const built = makeEraGroup(code, templates.get(code), true);
        built.rows.append(row);
        grid.append(built.group);
      }
    }

    grid.dataset.personSortOrder = sortOrder;
    refreshHeaderState(header);
  }

  function removeLegacySortControl() {
    const select = document.getElementById("personMainSort");
    const controls = select?.closest?.(".person-main-controls");
    if (controls) controls.remove();
    else select?.remove?.();
  }

  function refreshEraNavigator() {
    queueMicrotask(() => window.ATLAS_PERSON_ERA_NAVIGATION?.installNavigator?.());
  }

  function installAll({ refreshNavigator = false } = {}) {
    removeLegacySortControl();
    for (const grid of document.querySelectorAll(".person-card-grid.person-table-grid")) rebuildGrid(grid);
    if (refreshNavigator) refreshEraNavigator();
  }

  function setSortOrder(value, { refreshNavigator = true } = {}) {
    sortOrder = normalizeSortOrder(value);
    installAll({ refreshNavigator });
    return sortOrder;
  }

  function onSortClick(event) {
    const button = event.target?.closest?.("button[data-person-sort-key]");
    if (!button) return;
    const key = String(button.dataset.personSortKey || "");
    if (!SORT_KEYS.has(key)) return;

    event.preventDefault();
    event.stopPropagation();
    const current = sortState();
    const direction = current.key === key && current.direction === "asc" ? "desc" : "asc";
    setSortOrder(`${key}-${direction}`);
  }

  document.addEventListener("click", onSortClick);
  window.addEventListener("atlas-person-main-rendered", () => installAll());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => installAll(), { once: true });
  else queueMicrotask(() => installAll());

  window.ATLAS_PERSON_HEADER_SORTING = Object.freeze({
    installAll,
    setSortOrder,
    getSortOrder: () => sortOrder
  });
})();
