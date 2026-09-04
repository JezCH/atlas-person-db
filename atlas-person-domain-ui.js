(() => {
  "use strict";

  const ENDPOINT = "/api/atlas-person-domain";
  const DEFINITIONS = Object.freeze([
    Object.freeze({ code:"ruler", label:"통치·정치 지도자" }),
    Object.freeze({ code:"military", label:"군사" }),
    Object.freeze({ code:"science", label:"학문·과학·사상" }),
    Object.freeze({ code:"technology", label:"기술·공학·발명" }),
    Object.freeze({ code:"commerce", label:"상업·경제·무역" }),
    Object.freeze({ code:"culture", label:"문화·예술" }),
    Object.freeze({ code:"religion", label:"종교" }),
    Object.freeze({ code:"exploration", label:"탐험·항해·개척" })
  ]);
  const LABELS = Object.freeze(Object.fromEntries(DEFINITIONS.map((item) => [item.code, item.label])));
  const domainByPerson = new Map();
  const writer = window.ATLAS_SERVER_WRITE_ADAPTER?.createAdapter?.() || null;
  let loaded = false;
  let loadPromise = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function requestId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `person-domain-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function personIdFromProfileEditor(editor) {
    return editor?.querySelector?.("form[data-person-id]")?.dataset?.personId || null;
  }

  function currentDomain(personId) {
    return domainByPerson.get(String(personId || "")) || null;
  }

  async function readJson(response) {
    try { return await response.json(); } catch { return null; }
  }

  async function loadDomains({ force = false } = {}) {
    if (!force && loaded) return domainByPerson;
    if (!force && loadPromise) return loadPromise;
    loadPromise = (async () => {
      const response = await fetch(ENDPOINT, {
        method:"GET",
        credentials:"same-origin",
        cache:"no-store",
        headers:{ accept:"application/json" }
      });
      const body = await readJson(response);
      if (!response.ok || body?.ok !== true || !Array.isArray(body.rows)) {
        throw new Error(body?.code || `PERSON_DOMAIN_READ_FAILED_${response.status}`);
      }
      domainByPerson.clear();
      for (const row of body.rows) {
        const personId = String(row?.person_id || "").trim();
        const domain = String(row?.representative_domain || "").trim();
        if (personId && LABELS[domain]) domainByPerson.set(personId, domain);
      }
      loaded = true;
      return domainByPerson;
    })();
    try {
      return await loadPromise;
    } finally {
      loadPromise = null;
    }
  }

  function ensureLegend() {
    const head = document.querySelector(".person-group-historical .person-group-head > div");
    if (!head || head.querySelector(":scope > .person-domain-legend")) return;
    const legend = document.createElement("div");
    legend.className = "person-domain-legend";
    legend.setAttribute("aria-label", "인물 대표 분야 색상 범례");
    legend.innerHTML = DEFINITIONS.map((item) =>
      `<span class="person-domain-legend-item" data-domain="${item.code}"><span class="person-domain-legend-swatch" aria-hidden="true"></span><span>${escapeHtml(item.label)}</span></span>`
    ).join("");
    head.append(legend);
  }

  function decorateRow(row) {
    const personId = String(row?.dataset?.personId || "").trim();
    if (!personId) return;
    const domain = currentDomain(personId);
    if (domain) row.dataset.representativeDomain = domain;
    else delete row.dataset.representativeDomain;

    const identity = row.querySelector(":scope > .person-table-identity") || row.querySelector(":scope > strong")?.parentElement;
    if (!identity) return;
    const oldChip = identity.querySelector?.(":scope > .person-domain-chip");
    if (!domain) {
      oldChip?.remove();
      return;
    }
    const label = LABELS[domain] || domain;
    if (oldChip) {
      oldChip.dataset.domain = domain;
      oldChip.textContent = label;
      return;
    }
    const chip = document.createElement("span");
    chip.className = "person-domain-chip";
    chip.dataset.domain = domain;
    chip.textContent = label;
    identity.append(chip);
  }

  function decorateRows() {
    ensureLegend();
    for (const row of document.querySelectorAll(".person-card[data-person-id]")) decorateRow(row);
    injectProfileEditors();
  }

  function scheduleDecorate() {
    requestAnimationFrame(() => requestAnimationFrame(decorateRows));
  }

  function domainOptions(selected) {
    return [
      `<option value=""${selected ? "" : " selected"}>미분류</option>`,
      ...DEFINITIONS.map((item) => `<option value="${item.code}"${selected === item.code ? " selected" : ""}>${escapeHtml(item.label)}</option>`)
    ].join("");
  }

  function injectProfileEditor(editor) {
    if (!editor || editor.querySelector(":scope > .person-domain-form")) return;
    const personId = personIdFromProfileEditor(editor);
    if (!personId) return;
    const selected = currentDomain(personId);
    const form = document.createElement("form");
    form.className = "person-profile-form person-domain-form";
    form.dataset.personId = personId;
    form.innerHTML = `
      <label><span>대표 분야</span><select name="representative_domain" aria-label="대표 분야">${domainOptions(selected)}</select></label>
      <button class="mini-btn edit" type="submit">분야 저장</button>
      <p class="person-domain-save-state" aria-live="polite"></p>`;
    const firstForm = editor.querySelector(":scope > form");
    if (firstForm) firstForm.insertAdjacentElement("beforebegin", form);
    else editor.append(form);
  }

  function injectProfileEditors() {
    for (const editor of document.querySelectorAll(".person-profile-editor")) {
      const existing = editor.querySelector(":scope > .person-domain-form");
      const personId = personIdFromProfileEditor(editor);
      if (existing && personId) {
        existing.dataset.personId = personId;
        const select = existing.elements?.representative_domain;
        if (select && document.activeElement !== select) select.value = currentDomain(personId) || "";
      } else injectProfileEditor(editor);
    }
  }

  async function postDomain(personId, domain) {
    const body = {
      request_id:requestId(),
      person_id:personId,
      representative_domain:domain || null
    };
    return fetch(ENDPOINT, {
      method:"POST",
      credentials:"same-origin",
      cache:"no-store",
      headers:{ "content-type":"application/json", accept:"application/json" },
      body:JSON.stringify(body)
    });
  }

  async function saveDomain(form) {
    const state = form.querySelector(".person-domain-save-state");
    const button = form.querySelector("button[type='submit']");
    const personId = String(form.dataset.personId || "").trim();
    const domain = String(form.elements.representative_domain?.value || "").trim() || null;
    if (!personId) return;
    if (!writer) {
      state.textContent = "관리자 인증 모듈을 불러오지 못했습니다.";
      state.classList.add("is-error");
      return;
    }

    state.textContent = "저장 중…";
    state.classList.remove("is-error");
    button.disabled = true;
    try {
      let auth = await writer.ensureSession();
      if (!auth?.ok) throw new Error(auth?.error || "관리자 인증이 필요합니다.");
      let response = await postDomain(personId, domain);
      if (response.status === 401) {
        auth = await writer.ensureSession({ force:true });
        if (!auth?.ok) throw new Error(auth?.error || "관리자 인증이 필요합니다.");
        response = await postDomain(personId, domain);
      }
      const body = await readJson(response);
      if (!response.ok || body?.ok !== true || body?.committed !== true) {
        throw new Error(body?.code || `대표 분야 저장 실패 (${response.status})`);
      }
      if (domain) domainByPerson.set(personId, domain);
      else domainByPerson.delete(personId);
      state.textContent = body.replay ? "변경 없음" : "저장 완료";
      scheduleDecorate();
    } catch (error) {
      state.textContent = String(error?.message || error || "대표 분야 저장 실패");
      state.classList.add("is-error");
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener("submit", (event) => {
    const form = event.target.closest?.("form.person-domain-form[data-person-id]");
    if (!form) return;
    event.preventDefault();
    saveDomain(form);
  });

  window.addEventListener("atlas-person-main-rendered", scheduleDecorate);

  const observer = new MutationObserver(() => scheduleDecorate());
  observer.observe(document.body, { childList:true, subtree:true });

  async function init() {
    try {
      await loadDomains();
    } catch (error) {
      console.warn("ATLAS representative person domains unavailable", error);
    }
    scheduleDecorate();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once:true });
  else init();

  window.ATLAS_PERSON_DOMAIN_UI = Object.freeze({
    ENDPOINT,
    DEFINITIONS,
    currentDomain,
    loadDomains,
    decorateRows
  });
})();
