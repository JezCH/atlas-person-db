(() => {
  "use strict";

  const HEADER_CELLS = [
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
  function humanizeActivity(activity, personRange, singleActivity) {
    const relation = activity.querySelector?.(".person-relation-badge");
    if (relation) { const raw = String(relation.textContent || "").trim(); relation.textContent = RELATION_LABELS[raw] ?? cleanCode(raw); }
    const role = activity.querySelector?.(".person-card-activity-role");
    if (role) {
      const parts = String(role.textContent || "").split(/\s+·\s+/);
      if (parts.length > 1) { const basis = parts.pop(); role.textContent = `${parts.join(" · ")} · ${BASIS_LABELS[basis] ?? cleanCode(basis)}`; }
    }
    const period = activity.querySelector?.(".person-card-activity-period");
    if (period && singleActivity && normalizeRange(period.textContent) === normalizeRange(personRange)) {
      period.textContent = ""; period.classList.add("is-redundant"); period.setAttribute("aria-hidden", "true");
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
    if (count) count.textContent = String(count.textContent || "").replace(/^Activity\s*/i, "");
    foldExceptionalStatus(identity, status);
    const activityRows = activities?.querySelectorAll?.(".person-card-activity") || [];
    const singleActivity = activityRows.length === 1 || /^1\s*건$/.test(String(count?.textContent || "").trim());
    for (const activity of activityRows) humanizeActivity(activity, range?.textContent || "", singleActivity);
    for (const cell of [identity, range, activities, count]) if (cell) row.append(cell);
  }

  function humanizePageCopy() {
    if (typeof document.querySelector !== "function") return;
    const historical = document.querySelector(".person-group-historical .person-group-head>div>p:not(.eyebrow)");
    if (historical) historical.textContent = "역사 자료에서 실재 인물로 분류된 인물입니다. 활동연도가 미상이어도 역사성 분류는 유지됩니다.";
    const other = document.querySelector(".person-group-other .person-group-head>div>p:not(.eyebrow)");
    if (other) other.textContent = "전설·신화 또는 역사성 판정이 확정되지 않은 인물을 원래 분류값에 따라 별도로 표시합니다.";
    const summary = document.querySelector(".person-main-summary span");
    if (summary) summary.textContent = String(summary.textContent || "").replace("historicity 값", "역사성 분류").replace("semantic filter", "적용된 필터");
  }

  function decorateGrid(grid) {
    if (!grid) return;
    grid.classList.add("person-table-grid");
    if (!grid.querySelector(":scope > .person-table-head")) grid.prepend(makeHeader());
    grid.querySelectorAll(":scope > .person-card").forEach(decorateRow);
  }
  function decorateAll() { document.querySelectorAll(".person-card-grid").forEach(decorateGrid); humanizePageCopy(); }
  window.addEventListener("atlas-person-main-rendered", decorateAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", decorateAll, { once: true });
  else queueMicrotask(decorateAll);
  window.ATLAS_PERSON_TABLE_VIEW = Object.freeze({ decorateAll });
})();
