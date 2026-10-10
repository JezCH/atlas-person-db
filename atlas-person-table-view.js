(() => {
  "use strict";

  const eraModel = window.ATLAS_PERSON_ERA_MODEL;
  const externalReferences = window.ATLAS_PERSON_EXTERNAL_REFERENCES;
  if (!eraModel) {
    console.error("ATLAS Person table view could not initialize shared era model");
    return;
  }

  const HEADER_CELLS = [
    ["person-table-col-era", "시대"],
    ["person-table-col-identity", "인물"],
    ["person-table-col-range", "주요 활동기간"],
    ["person-table-col-activities", "활동 관계"],
    ["person-table-col-count", "활동 수"]
  ];
  const RELATION_LABELS = Object.freeze({ rules: "통치", governs: "통치", serves: "복무", active_in: "활동", opposes: "대립", claims_rule: "통치권 주장", "relation 미상": "관계 미확정" });
  const BASIS_LABELS = Object.freeze({ reign: "재위", term: "임기", de_facto_rule: "실권 장악", military_activity: "군사 활동", religious_activity: "종교 활동", intellectual_activity: "학술 활동", artistic_activity: "예술 활동", general_activity: "주요 활동" });
  const CHRONOLOGY_LABELS = Object.freeze({ exact_as_recorded: null, reviewed_stage2_traditional_disputed: "연대 논쟁 있음", disputed: "연대 논쟁 있음", approximate: "연대 근사", inferred: "연대 추정", unknown: "연대 미확정" });
  const CONFIDENCE_LABELS = Object.freeze({ legacy_asserted: null, high: "신뢰도 높음", medium: "신뢰도 보통", low: "신뢰도 낮음", uncertain: "신뢰도 미확정" });

  function cleanCode(value) { return String(value || "").trim().replaceAll("_", " "); }

  function safeHttpUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;
    try {
      const url = new URL(raw, window.location.href);
      return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function normalizeInteractiveRow(row) {
    if (!row || row.tagName !== "BUTTON") return row;
    const replacement = document.createElement("div");
    for (const attribute of [...row.attributes]) {
      if (attribute.name === "type") continue;
      replacement.setAttribute(attribute.name, attribute.value);
    }
    replacement.setAttribute("role", "button");
    replacement.setAttribute("tabindex", "0");
    while (row.firstChild) replacement.append(row.firstChild);
    replacement.addEventListener("keydown", (event) => {
      if (event.target !== replacement || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      replacement.click();
    });
    row.replaceWith(replacement);
    return replacement;
  }

  function decorateMainNameLink(row, name) {
    if (!row || !name || name.querySelector(":scope > a.person-main-name-link")) return;
    const reference = externalReferences?.linkForPerson?.({ id: row.dataset.personId }, "namuwiki");
    const href = safeHttpUrl(reference?.url);
    if (!href) return;
    const label = String(name.textContent || "").trim();
    if (!label) return;
    const link = document.createElement("a");
    link.className = "person-main-name-link";
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = "나무위키에서 보기";
    link.textContent = label;
    link.addEventListener("click", (event) => event.stopPropagation());
    name.textContent = "";
    name.append(link);
  }

  function makeHeader() {
    const header = document.createElement("div");
    header.className = "person-table-head";
    header.setAttribute("aria-hidden", "true");
    for (const [className, label] of HEADER_CELLS) {
      const cell = document.createElement("span");
      cell.className = `person-table-head-cell ${className}`;
      if (className === "person-table-col-activities") {
        const title = document.createElement("span"); title.className = "person-table-head-title"; title.textContent = label;
        const sub = document.createElement("span"); sub.className = "person-table-activity-subhead";
        for (const text of ["정치체 · 관계", "역할 · 기간 기준", "활동 기간"]) { const item = document.createElement("span"); item.textContent = text; sub.append(item); }
        cell.append(title, sub);
      } else cell.textContent = label;
      header.append(cell);
    }
    return header;
  }

  function wrapIdentity(row) {
    const existing = row.querySelector(":scope > .person-table-identity");
    if (existing) return existing;
    const name = row.querySelector(":scope > strong");
    if (!name) return null;
    decorateMainNameLink(row, name);
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
      if (!value || value.toLowerCase() === "historical") child.hidden = true;
      else meaningful += 1;
    }
    if (!meaningful || !identity) { status.remove(); return; }
    status.classList.add("person-table-status-inline");
    identity.append(status);
  }

  function normalizeRange(value) { return String(value || "").toUpperCase().replace(/[‐‑‒–—―]/g, "-").replace(/\s+/g, "").trim(); }
  function normalizeRangeWithoutApproximation(value) { return normalizeRange(value).replaceAll("약", ""); }
  function promoteApproximationToPersonRange(range, periodText) {
    if (!range) return;
    range.textContent = periodText;
    range.dataset.rangeApproximationFromActivity = "true";
  }
  function humanizeActivity(activity, personRangeElement, singleActivity) {
    const personRange = String(personRangeElement?.textContent || "");
    const relation = activity.querySelector?.(".person-relation-badge");
    if (relation) { const raw = String(relation.textContent || "").trim(); relation.textContent = RELATION_LABELS[raw] ?? cleanCode(raw); }
    const role = activity.querySelector?.(".person-card-activity-role");
    if (role) {
      const parts = String(role.textContent || "").split(/\s+·\s+/);
      if (parts.length > 1) { const basis = parts.pop(); role.textContent = `${parts.join(" · ")} · ${BASIS_LABELS[basis] ?? cleanCode(basis)}`; }
    }
    const period = activity.querySelector?.(".person-card-activity-period");
    if (period && singleActivity) {
      const periodText = String(period.textContent || "").trim();
      const exactMatch = normalizeRange(periodText) === normalizeRange(personRange);
      const approximationOnlyDifference = !exactMatch
        && normalizeRangeWithoutApproximation(periodText) === normalizeRangeWithoutApproximation(personRange);
      if (approximationOnlyDifference && /약/.test(periodText) && !/약/.test(personRange)) {
        promoteApproximationToPersonRange(personRangeElement, periodText);
      }
      if (exactMatch || approximationOnlyDifference) {
        period.textContent = "";
        period.classList.add("is-redundant");
        period.setAttribute("aria-hidden", "true");
      }
    }
    const meta = activity.querySelector?.("small");
    if (meta) {
      const text = String(meta.textContent || "");
      const chronology = text.match(/chronology:\s*([^·]+)/i)?.[1]?.trim();
      const confidence = text.match(/confidence:\s*([^·]+)/i)?.[1]?.trim();
      const labels = [];
      if (chronology) { const mapped = Object.prototype.hasOwnProperty.call(CHRONOLOGY_LABELS, chronology) ? CHRONOLOGY_LABELS[chronology] : `연대 상태: ${cleanCode(chronology)}`; if (mapped) labels.push(mapped); }
      if (confidence) { const mapped = Object.prototype.hasOwnProperty.call(CONFIDENCE_LABELS, confidence) ? CONFIDENCE_LABELS[confidence] : `신뢰도: ${cleanCode(confidence)}`; if (mapped) labels.push(mapped); }
      if (!labels.length) meta.hidden = true;
      else { meta.hidden = false; meta.classList.add("person-table-exception"); meta.textContent = labels.join(" · "); }
    }
  }

  // Display-only Korean chronology: keep exact raw BC/AD values for era
  // grouping and numeric sorting, including boundary-specific uncertainty.
  function localizedRegisterRange(value) {
    const raw = String(value || "").trim();
    const parts = raw.match(/^(약\s*)?(BC|AD)\s*(\d+)\s*[–—-]\s*(약\s*)?(BC|AD)\s*(\d+)$/i);
    if (!parts || parts[2].toUpperCase() !== parts[5].toUpperCase()) return raw;
    const era = parts[2].toUpperCase() === "BC" ? "기원전" : "서기";
    const start = parts[3], end = parts[6];
    const startApprox = Boolean(parts[1]), endApprox = Boolean(parts[4]);
    if (start === end && startApprox === endApprox) {
      return `${era} ${startApprox ? "약 " : ""}${start}년`;
    }
    if (startApprox === endApprox) {
      return `${era} ${startApprox ? "약 " : ""}${start}~${end}년`;
    }
    return `${era} ${startApprox ? "약 " : ""}${start}년~${endApprox ? "약 " : ""}${end}년`;
  }

  function configureActivityHierarchy(row, count, activityRows) {
    const activityCount = activityRows.length;
    row.dataset.activityCount = String(activityCount);
    row.classList.toggle("has-multiple-activities", activityCount > 1);
    if (!count) return;

    count.textContent = "";
    count.classList.toggle("is-activity-count-quiet", activityCount <= 1);
    if (activityCount <= 1) {
      count.setAttribute("aria-hidden", "true");
      count.removeAttribute("aria-label");
      return;
    }

    count.removeAttribute("aria-hidden");
    count.setAttribute("aria-label", `활동 ${activityCount}건`);
    count.textContent = `${activityCount}건`;
  }

  function decorateRow(row) {
    row = normalizeInteractiveRow(row);
    if (!row || row.dataset.personTableDecorated === "true") return;
    row.dataset.personTableDecorated = "true";
    row.classList.add("person-table-row", "person-register-entry");
    const identity = wrapIdentity(row);
    const range = row.querySelector(":scope > .person-card-range");
    const activities = row.querySelector(":scope > .person-card-activities");
    const count = row.querySelector(":scope > .person-card-count");
    const status = row.querySelector(":scope > .person-card-top");
    identity?.classList.add("person-register-identity");
    range?.classList.add("person-table-range", "person-register-range");
    activities?.classList.add("person-table-activities", "person-register-activities");
    count?.classList.add("person-table-count", "person-register-count");
    foldExceptionalStatus(identity, status);
    const activityRows = [...(activities?.querySelectorAll?.(".person-card-activity") || [])];
    const singleActivity = activityRows.length === 1;
    for (const activity of activityRows) humanizeActivity(activity, range, singleActivity);
    if (range) {
      // The period promotion above is part of the raw chronology contract.
      range.dataset.chronologyRaw = String(range.textContent || "").trim();
      range.textContent = localizedRegisterRange(range.dataset.chronologyRaw);
    }
    for (const activity of activityRows) {
      const period = activity.querySelector?.(".person-card-activity-period");
      if (period && !period.classList.contains("is-redundant")) {
        period.textContent = localizedRegisterRange(period.textContent);
      }
    }
    configureActivityHierarchy(row, count, activityRows);
    for (const cell of [identity, range, activities, count]) if (cell) row.append(cell);
  }

  function chronologyYearFromRange(rangeText) {
    const match = String(rangeText || "").toUpperCase().match(/\b(BC|AD)\s*(\d+)\b/);
    if (!match) return null;
    const absolute = Number(match[2]);
    if (!Number.isFinite(absolute) || absolute <= 0) return null;
    return match[1] === "BC" ? -absolute : absolute;
  }

  function eraForRow(row) {
    const range = row?.querySelector?.(":scope > .person-table-range, :scope > .person-card-range");
    const year = chronologyYearFromRange(range?.dataset?.chronologyRaw || range?.textContent || "");
    return eraModel.eraForYear(year);
  }

  function makeEraBand(era) {
    const band = document.createElement("div");
    band.className = `person-era-band person-register-era-band person-era-${era.code}`;
    band.setAttribute("role", "rowheader");
    band.setAttribute("aria-label", `${era.label} · ${era.range}`);
    band.title = `${era.label} · ${era.range}`;
    const label = document.createElement("span");
    label.textContent = era.label;
    const range = document.createElement("small");
    range.className = "person-era-band-range";
    range.textContent = era.range;
    band.append(label, range);
    return band;
  }

  function groupRowsByEra(grid) {
    const rows = [...grid.querySelectorAll(":scope > .person-card")];
    if (!rows.length) return;
    let activeGroup = null;
    let activeRows = null;
    let activeCode = null;

    for (const row of rows) {
      const era = eraForRow(row);
      row.dataset.atlasEra = era.code;
      if (era.code !== activeCode) {
        activeGroup = document.createElement("div");
        activeGroup.className = "person-era-group person-register-era";
        activeGroup.dataset.atlasEra = era.code;
        activeGroup.append(makeEraBand(era));
        activeRows = document.createElement("div");
        activeRows.className = "person-era-rows person-register-entries";
        activeGroup.append(activeRows);
        grid.append(activeGroup);
        activeCode = era.code;
      }
      activeRows.append(row);
    }
  }

  function humanizePageCopy() {
    if (typeof document.querySelector !== "function") return;
    const primary = document.querySelector(".person-group-historical .person-group-head>div>p:not(.eyebrow)");
    if (primary) primary.textContent = "연대가 있는 인물은 시대별로, 개인 활동연대를 방어할 수 없는 인물은 모두 ‘연대 미상’에 함께 표시합니다. 역사성 분류는 별도 값으로 유지됩니다.";
    const summary = document.querySelector(".person-main-summary span");
    if (summary) summary.textContent = String(summary.textContent || "").replace("historicity 값", "역사성 분류").replace("semantic filter", "적용된 필터");
  }

  function decorateGrid(grid) {
    if (!grid) return;
    grid.classList.add("person-table-grid", "person-monumental-register");
    if (!grid.querySelector(":scope > .person-table-head")) grid.prepend(makeHeader());
    const directRows = [...grid.querySelectorAll(":scope > .person-card")];
    directRows.forEach(decorateRow);
    groupRowsByEra(grid);
  }
  function decorateAll() { document.querySelectorAll(".person-card-grid").forEach(decorateGrid); humanizePageCopy(); }
  window.addEventListener("atlas-person-main-rendered", decorateAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decorateAll, { once: true });
  else queueMicrotask(decorateAll);
  window.ATLAS_PERSON_TABLE_VIEW = Object.freeze({ decorateAll });
})();
