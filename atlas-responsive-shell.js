(() => {
  "use strict";

  const shell = document.querySelector(".workspace-shell");
  const sidebar = shell?.querySelector(".sidebar");
  const brand = sidebar?.querySelector(".brand");
  const SIDEBAR_STORAGE_KEY = "atlas.sidebar.collapsed";
  const desktopCompactQuery = window.matchMedia("(max-width: 1239px) and (min-width: 761px)");

  function readSidebarPreference() {
    try { const value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY); return value === "1" ? true : value === "0" ? false : null; }
    catch { return null; }
  }
  function writeSidebarPreference(collapsed) {
    try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0"); }
    catch { /* Storage is optional. */ }
  }

  let sidebarPreference = readSidebarPreference();
  let sidebarToggle = null;

  function setSidebarCollapsed(collapsed, { persist = false } = {}) {
    if (!shell || !sidebarToggle) return;
    shell.classList.toggle("sidebar-collapsed", collapsed);
    sidebarToggle.textContent = collapsed ? "›" : "‹";
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    sidebarToggle.setAttribute("aria-label", collapsed ? "사이드바 펼치기" : "사이드바 접기");
    sidebarToggle.title = collapsed ? "사이드바 펼치기" : "사이드바 접기";
    if (persist) { sidebarPreference = collapsed; writeSidebarPreference(collapsed); }
  }
  function applyResponsiveSidebarDefault() { if (sidebarPreference == null) setSidebarCollapsed(desktopCompactQuery.matches); }

  function sidebarActionLabel(item) {
    const explicit = String(item.getAttribute?.("aria-label") || "").trim();
    if (explicit) return explicit;
    return String(item.textContent || "").replace(/\s+/g, " ").trim();
  }
  function decorateSidebarActions() {
    if (!sidebar) return;
    for (const item of sidebar.querySelectorAll("button,a")) {
      if (item === sidebarToggle || item.closest?.(".brand")) continue;
      item.classList.add("sidebar-compact-action");
      const domain = String(item.dataset?.atlasDomain || "").trim();
      if (domain) item.title = domain.charAt(0).toUpperCase() + domain.slice(1);
      else if (!item.title) { const label = sidebarActionLabel(item); if (label) item.title = label; }
    }
  }

  if (shell && sidebar && brand) {
    sidebarToggle = document.createElement("button");
    sidebarToggle.type = "button";
    sidebarToggle.className = "sidebar-collapse-toggle";
    sidebarToggle.setAttribute("aria-controls", "atlasDesktopSidebar");
    sidebar.id ||= "atlasDesktopSidebar";
    brand.append(sidebarToggle);
    decorateSidebarActions();
    const sidebarObserver = new MutationObserver(decorateSidebarActions);
    sidebarObserver.observe(sidebar, { childList: true, subtree: true });

    sidebarToggle.addEventListener("click", () => setSidebarCollapsed(!shell.classList.contains("sidebar-collapsed"), { persist: true }));
    if (typeof desktopCompactQuery.addEventListener === "function") desktopCompactQuery.addEventListener("change", applyResponsiveSidebarDefault);
    setSidebarCollapsed(sidebarPreference == null ? desktopCompactQuery.matches : sidebarPreference);
  }

  const detailPanel = document.getElementById("personMainDetail");
  const personGroups = document.getElementById("personMainGroups");
  if (detailPanel && personGroups) {
    const backdrop = document.createElement("div");
    backdrop.id = "personMainDetailBackdrop";
    backdrop.hidden = true;
    backdrop.setAttribute("aria-hidden", "true");
    document.body.append(backdrop);
    detailPanel.hidden = true;
    detailPanel.setAttribute("role", "dialog");
    detailPanel.setAttribute("aria-modal", "true");
    detailPanel.setAttribute("aria-label", "Person 상세정보");
    detailPanel.tabIndex = -1;
    let requestedOpen = false;
    let lastTrigger = null;

    function ensureCloseButton() {
      let closeButton = detailPanel.querySelector(":scope > .person-detail-overlay-close");
      if (closeButton) return closeButton;
      closeButton = document.createElement("button"); closeButton.type = "button"; closeButton.className = "person-detail-overlay-close"; closeButton.setAttribute("aria-label", "상세 닫기"); closeButton.textContent = "×"; detailPanel.prepend(closeButton); return closeButton;
    }
    function setDetailOpen(open, { restoreFocus = false } = {}) {
      requestedOpen = Boolean(open); detailPanel.hidden = !requestedOpen; backdrop.hidden = !requestedOpen; document.body.classList.toggle("person-detail-overlay-open", requestedOpen);
      if (requestedOpen) ensureCloseButton();
      else if (restoreFocus && lastTrigger instanceof HTMLElement) { try { lastTrigger.focus({ preventScroll: true }); } catch { lastTrigger.focus(); } }
    }
    personGroups.addEventListener("click", (event) => { const row = event.target.closest("[data-person-id]"); if (!row) return; lastTrigger = row; setDetailOpen(true); }, true);
    detailPanel.addEventListener("click", (event) => { if (event.target.closest(".person-detail-overlay-close")) setDetailOpen(false, { restoreFocus: true }); });
    backdrop.addEventListener("click", () => setDetailOpen(false, { restoreFocus: true }));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !detailPanel.hidden) setDetailOpen(false, { restoreFocus: true }); });
    window.addEventListener("atlas-authority-domain-changed", (event) => { if (event.detail?.domain !== "persons") setDetailOpen(false); });
    const observer = new MutationObserver(() => { if (!requestedOpen) { detailPanel.hidden = true; backdrop.hidden = true; return; } ensureCloseButton(); detailPanel.hidden = false; backdrop.hidden = false; });
    observer.observe(detailPanel, { childList: true });
  }

  window.ATLAS_RESPONSIVE_SHELL = Object.freeze({ setSidebarCollapsed: (collapsed) => setSidebarCollapsed(Boolean(collapsed), { persist: true }) });
})();
