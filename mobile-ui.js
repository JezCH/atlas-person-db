(() => {
  "use strict";

  const mq = window.matchMedia("(max-width: 760px)");
  const menuButton = document.getElementById("mobileMenuButton");
  const menuClose = document.getElementById("mobileMenuClose");
  const drawer = document.getElementById("mobileDrawer");
  const backdrop = document.getElementById("mobileDrawerBackdrop");
  const dataBody = document.getElementById("dataBody");
  const desktopSearch = document.getElementById("searchInput");
  const mobileSearch = document.getElementById("mobileSearchInput");
  const mobileSearchClear = document.getElementById("mobileSearchClear");
  const mobileSearchCount = document.getElementById("mobileSearchCount");
  const rowCount = document.getElementById("rowCount");
  const emptyState = document.getElementById("emptyState");
  const toolsButton = document.getElementById("mobileToolsButton");
  const toolsMenu = document.getElementById("mobileToolsMenu");
  const exportButton = document.getElementById("exportButton");
  const importInput = document.getElementById("importInput");

  const normalizeSearchText = (value) => String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`´]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase("ko-KR");

  const compactSearchText = (value) => normalizeSearchText(value).replace(/\s+/g, "");

  function setMenu(open) {
    if (!drawer || !backdrop || !menuButton) return;
    drawer.classList.toggle("open", open);
    backdrop.classList.toggle("open", open);
    backdrop.hidden = !open;
    drawer.setAttribute("aria-hidden", String(!open));
    menuButton.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("mobile-menu-open", open);
  }

  function setToolsMenu(open) {
    if (!toolsButton || !toolsMenu) return;
    toolsMenu.hidden = !open;
    toolsButton.setAttribute("aria-expanded", String(open));
  }

  function visibleRowCount() {
    if (!dataBody) return 0;
    return [...dataBody.querySelectorAll("tr[data-id]")]
      .filter((row) => !row.hidden && row.style.display !== "none").length;
  }

  function updateMobileSearchState(count = null) {
    if (!mobileSearch) return;
    const hasValue = mobileSearch.value.trim().length > 0;
    if (mobileSearchClear) mobileSearchClear.hidden = !hasValue;
    if (mobileSearchCount) {
      const value = count ?? visibleRowCount();
      mobileSearchCount.textContent = hasValue ? `${value}건` : "";
    }
  }

  function filterRenderedRows(query) {
    if (!dataBody) return 0;
    const normalizedQuery = normalizeSearchText(query);
    const compactQuery = compactSearchText(query);
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
    let count = 0;

    dataBody.querySelectorAll("tr[data-id]").forEach((row) => {
      const renderedText = row.dataset.search || row.textContent || "";
      const normalizedRow = normalizeSearchText(renderedText);
      const compactRow = compactSearchText(renderedText);
      const matched = !normalizedQuery ||
        (compactQuery && compactRow.includes(compactQuery)) ||
        (queryTokens.length > 0 && queryTokens.every((token) => normalizedRow.includes(token)));
      row.hidden = !matched;
      row.style.display = matched ? "" : "none";
      if (matched) count += 1;
    });

    if (rowCount) rowCount.textContent = `${count}개 행`;
    if (emptyState) emptyState.hidden = count !== 0;
    return count;
  }

  function syncMobileSearchToMain() {
    if (!mobileSearch) return;
    const query = mobileSearch.value;
    const count = filterRenderedRows(query);
    if (desktopSearch && desktopSearch.value !== query) desktopSearch.value = query;
    updateMobileSearchState(count);
  }

  menuButton?.addEventListener("click", () => {
    setToolsMenu(false);
    setMenu(true);
  });
  menuClose?.addEventListener("click", () => setMenu(false));
  backdrop?.addEventListener("click", () => setMenu(false));

  toolsButton?.addEventListener("click", (event) => {
    event.stopPropagation();
    setToolsMenu(toolsMenu?.hidden !== false);
  });
  toolsMenu?.addEventListener("click", (event) => {
    const action = event.target.closest("[data-mobile-action]")?.dataset.mobileAction;
    if (!action) return;
    setToolsMenu(false);
    if (action === "export") exportButton?.click();
    if (action === "import") importInput?.click();
  });
  document.addEventListener("click", (event) => {
    if (!toolsMenu || toolsMenu.hidden) return;
    if (!event.target.closest("#mobileToolsMenu") && !event.target.closest("#mobileToolsButton")) setToolsMenu(false);
  });

  mobileSearch?.addEventListener("input", syncMobileSearchToMain);
  mobileSearchClear?.addEventListener("click", () => {
    if (!mobileSearch) return;
    mobileSearch.value = "";
    syncMobileSearchToMain();
    mobileSearch.focus();
  });

  desktopSearch?.addEventListener("input", () => {
    if (!mobileSearch || document.activeElement === mobileSearch) return;
    mobileSearch.value = desktopSearch.value;
    const count = filterRenderedRows(mobileSearch.value);
    updateMobileSearchState(count);
  });

  const bodyObserver = dataBody && "MutationObserver" in window
    ? new MutationObserver(() => {
        const query = mobileSearch?.value || "";
        const count = filterRenderedRows(query);
        updateMobileSearchState(count);
      })
    : null;
  bodyObserver?.observe(dataBody, { childList: true, subtree: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenu(false);
      setToolsMenu(false);
      if (mq.matches && document.activeElement === mobileSearch && mobileSearch?.value) {
        mobileSearch.value = "";
        syncMobileSearchToMain();
      }
    }
  });

  mq.addEventListener("change", (event) => {
    if (!event.matches) {
      setMenu(false);
      setToolsMenu(false);
    }
    if (event.matches && mobileSearch) {
      mobileSearch.value = desktopSearch?.value || mobileSearch.value;
      const count = filterRenderedRows(mobileSearch.value);
      updateMobileSearchState(count);
    }
  });

  dataBody?.addEventListener("click", (event) => {
    if (!mq.matches || event.target.closest("button[data-id]")) return;
    const row = event.target.closest("tr[data-id]");
    if (!row) return;

    event.stopImmediatePropagation();
    const wasOpen = row.classList.contains("mobile-expanded");
    dataBody.querySelectorAll("tr.mobile-expanded").forEach((item) => {
      item.classList.remove("mobile-expanded");
      item.setAttribute("aria-expanded", "false");
    });
    if (!wasOpen) {
      row.classList.add("mobile-expanded");
      row.setAttribute("aria-expanded", "true");
    }
  }, true);

  if (mobileSearch) {
    mobileSearch.value = desktopSearch?.value || "";
    const count = filterRenderedRows(mobileSearch.value);
    updateMobileSearchState(count);
  }
})();
