(() => {
  "use strict";

  const NAV_ID = "personEraNavigator";
  const GROUPS_ID = "personMainGroups";
  const RENDER_EVENT = "atlas-person-main-rendered";
  const state = {
    nav: null,
    groups: [],
    entries: [],
    targetsByCode: new Map(),
    activeCode: null,
    framePending: false,
    globalListenersBound: false
  };

  function hasDom() {
    return typeof document?.querySelector === "function" && typeof document?.createElement === "function";
  }

  function directEraBand(group) {
    return group?.querySelector?.(":scope > .person-era-band") || group?.querySelector?.(".person-era-band") || null;
  }

  function directEraRows(group) {
    return group?.querySelector?.(":scope > .person-era-rows") || group?.querySelector?.(".person-era-rows") || null;
  }

  function eraMeta(group) {
    const code = String(group?.dataset?.atlasEra || "").trim();
    if (!code) return null;
    const band = directEraBand(group);
    const label = String(band?.querySelector?.("span")?.textContent || band?.textContent || code).trim();
    const aria = String(band?.getAttribute?.("aria-label") || band?.attributes?.["aria-label"] || "").trim();
    const separator = aria.indexOf("·");
    const range = separator >= 0 ? aria.slice(separator + 1).trim() : "";
    return { code, label, range };
  }

  function visiblePersonCount(group) {
    const rows = directEraRows(group);
    if (!rows?.querySelectorAll) return 0;
    return rows.querySelectorAll(":scope > .person-card").length;
  }

  function collectEntries(container) {
    const groups = [...container.querySelectorAll(".person-era-group[data-atlas-era]")];
    const entries = [];
    const targetsByCode = new Map();
    const entryByCode = new Map();

    for (const group of groups) {
      const meta = eraMeta(group);
      if (!meta) continue;
      if (!targetsByCode.has(meta.code)) targetsByCode.set(meta.code, []);
      targetsByCode.get(meta.code).push(group);

      const count = visiblePersonCount(group);
      const existing = entryByCode.get(meta.code);
      if (existing) {
        existing.count += count;
        if (!existing.range && meta.range) existing.range = meta.range;
        continue;
      }

      const entry = { ...meta, count };
      entryByCode.set(meta.code, entry);
      entries.push(entry);
    }

    return { groups, entries, targetsByCode };
  }

  function makeButton(className, label, ariaLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", ariaLabel);
    button.textContent = label;
    return button;
  }

  function makeNavigator() {
    const nav = document.createElement("nav");
    nav.id = NAV_ID;
    nav.className = "person-era-navigator";
    nav.setAttribute("aria-label", "시대 바로가기");

    const intro = document.createElement("div");
    intro.className = "person-era-nav-intro";
    const title = document.createElement("strong");
    title.textContent = "시대 이동";
    const status = document.createElement("span");
    status.className = "person-era-nav-current";
    status.setAttribute("aria-live", "polite");
    status.textContent = "표시 중인 시대를 선택하세요";
    intro.append(title, status);

    const previous = makeButton("person-era-nav-step person-era-nav-prev", "‹", "이전 시대로 이동");
    previous.dataset.eraStep = "previous";

    const list = document.createElement("div");
    list.className = "person-era-jump-list";
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", "현재 결과의 시대 목록");

    const next = makeButton("person-era-nav-step person-era-nav-next", "›", "다음 시대로 이동");
    next.dataset.eraStep = "next";

    nav.append(intro, previous, list, next);
    nav.addEventListener("click", onNavigatorClick);
    list.addEventListener("keydown", onEraListKeyDown);
    return nav;
  }

  function renderEraButtons(nav, entries) {
    const list = nav.querySelector(".person-era-jump-list");
    if (!list) return;
    list.replaceChildren();

    for (const entry of entries) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `person-era-jump person-era-${entry.code}`;
      button.dataset.era = entry.code;
      button.setAttribute("role", "listitem");
      const description = [entry.label, entry.range, `${entry.count}명`].filter(Boolean).join(" · ");
      button.setAttribute("aria-label", `${description} 위치로 이동`);
      button.title = description;

      const label = document.createElement("span");
      label.className = "person-era-jump-label";
      label.textContent = entry.label;

      const range = document.createElement("small");
      range.className = "person-era-jump-range";
      range.textContent = entry.range;
      if (!entry.range) range.hidden = true;

      const count = document.createElement("em");
      count.className = "person-era-jump-count";
      count.textContent = String(entry.count);
      count.setAttribute("aria-hidden", "true");

      button.append(label, range, count);
      list.append(button);
    }
  }

  function reducedMotion() {
    try {
      return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
    } catch {
      return false;
    }
  }

  function navigatorAnchor() {
    const nav = state.nav;
    if (!nav?.getBoundingClientRect) return 0;
    return nav.getBoundingClientRect().bottom + 10;
  }

  function closestTargetForCode(code) {
    const candidates = state.targetsByCode.get(code) || [];
    if (candidates.length <= 1) return candidates[0] || null;
    const anchor = navigatorAnchor();
    let closest = candidates[0];
    let distance = Infinity;
    for (const candidate of candidates) {
      if (!candidate?.getBoundingClientRect) continue;
      const rect = candidate.getBoundingClientRect();
      const candidateDistance = rect.top <= anchor && rect.bottom > anchor ? 0 : Math.abs(rect.top - anchor);
      if (candidateDistance < distance) {
        closest = candidate;
        distance = candidateDistance;
      }
    }
    return closest;
  }

  function jumpToEra(code) {
    if (!code || !state.targetsByCode.has(code)) return;
    const target = closestTargetForCode(code);
    if (!target) return;
    setActiveEra(code, true);
    target.scrollIntoView?.({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function stepEra(delta) {
    const codes = state.entries.map((entry) => entry.code);
    if (!codes.length) return;
    let index = codes.indexOf(state.activeCode);
    if (index < 0) index = delta > 0 ? -1 : codes.length;
    const nextIndex = Math.max(0, Math.min(codes.length - 1, index + delta));
    if (nextIndex === index) return;
    jumpToEra(codes[nextIndex]);
  }

  function onNavigatorClick(event) {
    const eraButton = event.target?.closest?.("button[data-era]");
    if (eraButton) {
      jumpToEra(eraButton.dataset.era);
      return;
    }
    const step = event.target?.closest?.("button[data-era-step]")?.dataset?.eraStep;
    if (step === "previous") stepEra(-1);
    if (step === "next") stepEra(1);
  }

  function onEraListKeyDown(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const buttons = [...event.currentTarget.querySelectorAll("button[data-era]")];
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    buttons[Math.max(0, Math.min(buttons.length - 1, current + delta))]?.focus?.();
  }

  function entryForCode(code) {
    return state.entries.find((entry) => entry.code === code) || null;
  }

  function setActiveEra(code, announce = false) {
    if (!state.nav || !code || !state.targetsByCode.has(code)) return;
    state.activeCode = code;
    const buttons = state.nav.querySelectorAll("button[data-era]");
    for (const button of buttons) {
      const active = button.dataset.era === code;
      button.classList.toggle("is-current", active);
      if (active) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    }

    const entry = entryForCode(code);
    const status = state.nav.querySelector(".person-era-nav-current");
    if (status && entry) {
      const text = [entry.label, entry.range, `${entry.count}명 표시`].filter(Boolean).join(" · ");
      status.textContent = announce ? `${text} 위치로 이동` : `현재 위치: ${text}`;
    }

    const index = state.entries.findIndex((entryItem) => entryItem.code === code);
    const previous = state.nav.querySelector(".person-era-nav-prev");
    const next = state.nav.querySelector(".person-era-nav-next");
    if (previous) previous.disabled = index <= 0;
    if (next) next.disabled = index < 0 || index >= state.entries.length - 1;

    const activeButton = state.nav.querySelector(`button[data-era="${CSS.escape?.(code) || code}"]`);
    activeButton?.scrollIntoView?.({ behavior: "auto", block: "nearest", inline: "nearest" });
  }

  function updateActiveFromViewport() {
    state.framePending = false;
    if (!state.nav || !state.groups.length) return;
    const measurable = state.groups.filter((group) => typeof group.getBoundingClientRect === "function");
    if (!measurable.length) return;

    const anchor = navigatorAnchor();
    let best = measurable[0];
    let bestDistance = Infinity;
    for (const group of measurable) {
      const rect = group.getBoundingClientRect();
      const containsAnchor = rect.top <= anchor && rect.bottom > anchor;
      const distance = containsAnchor ? 0 : Math.abs(rect.top - anchor);
      if (distance < bestDistance) {
        best = group;
        bestDistance = distance;
        if (containsAnchor) break;
      }
    }
    setActiveEra(String(best.dataset?.atlasEra || ""));
  }

  function scheduleViewportUpdate() {
    if (state.framePending) return;
    state.framePending = true;
    const schedule = window.requestAnimationFrame || ((callback) => window.setTimeout(callback, 16));
    schedule(updateActiveFromViewport);
  }

  function bindGlobalListeners() {
    if (state.globalListenersBound || typeof window?.addEventListener !== "function") return;
    state.globalListenersBound = true;
    window.addEventListener("scroll", scheduleViewportUpdate, { passive: true });
    window.addEventListener("resize", scheduleViewportUpdate, { passive: true });
  }

  function installNavigator() {
    if (!hasDom()) return;
    const container = document.querySelector(`#${GROUPS_ID}`);
    if (!container?.querySelectorAll) return;

    const collected = collectEntries(container);
    state.groups = collected.groups;
    state.entries = collected.entries;
    state.targetsByCode = collected.targetsByCode;

    const existing = container.querySelector(`#${NAV_ID}`);
    if (!state.entries.length) {
      existing?.remove?.();
      state.nav = null;
      state.activeCode = null;
      return;
    }

    const nav = existing || makeNavigator();
    if (!existing) container.prepend(nav);
    state.nav = nav;
    renderEraButtons(nav, state.entries);

    const preserved = state.activeCode && state.targetsByCode.has(state.activeCode) ? state.activeCode : state.entries[0].code;
    setActiveEra(preserved);
    bindGlobalListeners();
    scheduleViewportUpdate();
  }

  window.addEventListener?.(RENDER_EVENT, installNavigator);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installNavigator, { once: true });
  else queueMicrotask(installNavigator);

  window.ATLAS_PERSON_ERA_NAVIGATION = Object.freeze({ installNavigator, jumpToEra });
})();
