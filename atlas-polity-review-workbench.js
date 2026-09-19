(() => {
  "use strict";

  const DATA = window.ATLAS_POLITY_REVIEW_CANDIDATES;
  if (!DATA) {
    console.warn("ATLAS polity review candidates are unavailable.");
    return;
  }

  const STORAGE_KEY = "atlas.polity.review.decisions.v1";
  const KIND_META = Object.freeze({
    confirmed_merge: Object.freeze({ label: "병합 확정", tone: "confirmed" }),
    merge_review: Object.freeze({ label: "통합 검토", tone: "review" }),
    split_review: Object.freeze({ label: "분리 검토", tone: "split" })
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function allCases() {
    return [...DATA.confirmed_merges, ...DATA.review_candidates, ...DATA.split_candidates];
  }

  function readDecisions() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeDecisions(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function decisionLabel(code) {
    return DATA.decision_options.find((item) => item.code === code)?.label || "미검토";
  }

  function defaultDecision(row) {
    return row.kind === "confirmed_merge" ? "merge" : "";
  }

  function caseHtml(row, decision) {
    const meta = KIND_META[row.kind] || KIND_META.merge_review;
    const selected = decision?.decision || defaultDecision(row);
    const note = decision?.note || "";
    const left = row.left || {};
    const right = row.right || {};
    const evidence = (row.evidence || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const options = ['<option value="">미검토</option>', ...DATA.decision_options.map((item) =>
      `<option value="${escapeHtml(item.code)}"${selected === item.code ? " selected" : ""}>${escapeHtml(item.label)}</option>`
    )].join("");
    return `<article class="polity-review-card card" data-case-id="${escapeHtml(row.id)}" data-kind="${escapeHtml(row.kind)}">
      <div class="polity-review-card-head">
        <div>
          <span class="polity-review-kind is-${escapeHtml(meta.tone)}">${escapeHtml(meta.label)}</span>
          <h3>${escapeHtml(row.title)}</h3>
        </div>
        <span class="polity-review-state">${escapeHtml(row.status || "")}</span>
      </div>
      <div class="polity-review-pair">
        <div class="polity-review-entity">
          <small>왼쪽</small>
          <strong>${escapeHtml(left.ko || left.name || "—")}</strong>
          <span>${escapeHtml(left.name || "")}</span>
          ${left.polity_id ? `<code>${escapeHtml(left.polity_id)}</code>` : ""}
        </div>
        <div class="polity-review-arrow" aria-hidden="true">⇄</div>
        <div class="polity-review-entity">
          <small>오른쪽</small>
          <strong>${escapeHtml(right.ko || right.name || "—")}</strong>
          <span>${escapeHtml(right.name || "")}</span>
          ${right.polity_id ? `<code>${escapeHtml(right.polity_id)}</code>` : ""}
        </div>
      </div>
      <p class="polity-review-rationale">${escapeHtml(row.rationale)}</p>
      <div class="polity-review-evidence"><strong>현재 확인 근거</strong><ul>${evidence}</ul></div>
      <div class="polity-review-suggestion"><span>검토 제안</span><strong>${escapeHtml(decisionLabel(row.suggested_action))}</strong></div>
      <div class="polity-review-controls">
        <label>내 결정
          <select data-review-decision>${options}</select>
        </label>
        <label class="polity-review-note">메모
          <textarea rows="2" data-review-note placeholder="판단 근거 또는 후속 지시">${escapeHtml(note)}</textarea>
        </label>
      </div>
    </article>`;
  }

  function snapshot(decisions) {
    const cases = allCases();
    return {
      schema: "atlas-polity-review-decisions/v1",
      reviewed_at: new Date().toISOString(),
      candidate_source_generated_at: DATA.generated_at,
      decisions: cases
        .map((row) => {
          const saved = decisions[row.id] || null;
          const decision = saved?.decision || defaultDecision(row) || null;
          const note = saved?.note || null;
          return {
            case_id: row.id,
            kind: row.kind,
            title: row.title,
            decision,
            note,
            left_polity_id: row.left?.polity_id || null,
            right_polity_id: row.right?.polity_id || null
          };
        })
        .filter((row) => row.decision || row.note)
    };
  }

  function mount(root) {
    if (!root) return;
    let decisions = readDecisions();
    let filter = "all";

    root.innerHTML = `<section class="polity-review-shell">
      <div class="polity-review-summary card">
        <div>
          <p class="eyebrow">POLITY IDENTITY REVIEW</p>
          <h2>정치체 검토 작업대</h2>
          <p>정치체 병합·유지·폐기·분리 판단을 케이스별로 기록합니다. 이 화면의 선택은 검토 기록이며 Production을 직접 변경하지 않습니다.</p>
        </div>
        <div class="polity-review-summary-actions">
          <button type="button" class="btn" data-export-decisions>결정 JSON 내보내기</button>
          <button type="button" class="btn" data-copy-decisions>결정 JSON 복사</button>
        </div>
      </div>
      <div class="polity-review-kpis">
        <button class="card polity-review-filter is-active" type="button" data-kind-filter="all"><small>전체</small><strong>${allCases().length}</strong></button>
        <button class="card polity-review-filter" type="button" data-kind-filter="confirmed_merge"><small>병합 확정</small><strong>${DATA.confirmed_merges.length}</strong></button>
        <button class="card polity-review-filter" type="button" data-kind-filter="merge_review"><small>통합 검토</small><strong>${DATA.review_candidates.length}</strong></button>
        <button class="card polity-review-filter" type="button" data-kind-filter="split_review"><small>분리 검토</small><strong>${DATA.split_candidates.length}</strong></button>
      </div>
      <div class="polity-review-toolbar card">
        <input type="search" data-review-search placeholder="정치체명·근거 검색" />
        <span data-review-progress></span>
      </div>
      <div class="polity-review-list" data-review-list></div>
    </section>`;

    const list = root.querySelector("[data-review-list]");
    const search = root.querySelector("[data-review-search]");
    const progress = root.querySelector("[data-review-progress]");

    function render() {
      const needle = String(search?.value || "").normalize("NFKC").trim().toLocaleLowerCase("und");
      const rows = allCases().filter((row) => {
        if (filter !== "all" && row.kind !== filter) return false;
        if (!needle) return true;
        const text = [row.title, row.left?.name, row.left?.ko, row.right?.name, row.right?.ko, row.rationale, ...(row.evidence || [])]
          .filter(Boolean).join(" ").normalize("NFKC").toLocaleLowerCase("und");
        return text.includes(needle);
      });
      list.innerHTML = rows.map((row) => caseHtml(row, decisions[row.id])).join("");
      const decided = allCases().filter((row) => (decisions[row.id]?.decision || defaultDecision(row))).length;
      progress.textContent = `검토 결정 ${decided}/${allCases().length}`;
    }

    root.addEventListener("click", (event) => {
      const filterButton = event.target.closest("[data-kind-filter]");
      if (filterButton) {
        filter = filterButton.dataset.kindFilter || "all";
        root.querySelectorAll("[data-kind-filter]").forEach((button) => button.classList.toggle("is-active", button === filterButton));
        render();
        return;
      }
      if (event.target.closest("[data-export-decisions]")) {
        const blob = new Blob([JSON.stringify(snapshot(decisions), null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `atlas-polity-review-${new Date().toISOString().slice(0,10)}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (event.target.closest("[data-copy-decisions]")) {
        const payload = JSON.stringify(snapshot(decisions), null, 2);
        navigator.clipboard?.writeText(payload).then(() => {
          event.target.closest("[data-copy-decisions]").textContent = "복사됨";
          setTimeout(() => { const button = root.querySelector("[data-copy-decisions]"); if (button) button.textContent = "결정 JSON 복사"; }, 1200);
        }).catch(() => {});
      }
    });

    root.addEventListener("change", (event) => {
      const card = event.target.closest("[data-case-id]");
      if (!card) return;
      const id = card.dataset.caseId;
      const decision = card.querySelector("[data-review-decision]")?.value || "";
      const note = card.querySelector("[data-review-note]")?.value || "";
      decisions = { ...decisions, [id]: { decision, note, updated_at: new Date().toISOString() } };
      writeDecisions(decisions);
      render();
    });

    root.addEventListener("input", (event) => {
      if (event.target.matches("[data-review-search]")) return render();
      if (!event.target.matches("[data-review-note]")) return;
      const card = event.target.closest("[data-case-id]");
      if (!card) return;
      const id = card.dataset.caseId;
      const decision = card.querySelector("[data-review-decision]")?.value || "";
      const note = event.target.value || "";
      decisions = { ...decisions, [id]: { decision, note, updated_at: new Date().toISOString() } };
      writeDecisions(decisions);
    });

    render();
  }

  window.ATLAS_POLITY_REVIEW_WORKBENCH = Object.freeze({ mount, snapshot });
})();