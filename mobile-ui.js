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
  const toolsButton = document.getElementById("mobileToolsButton");
  const toolsMenu = document.getElementById("mobileToolsMenu");
  const exportButton = document.getElementById("exportButton");
  const importInput = document.getElementById("importInput");

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

  function updateMobileSearchState() {
    if (!mobileSearch) return;
    const hasValue = mobileSearch.value.trim().length > 0;
    if (mobileSearchClear) mobileSearchClear.hidden = !hasValue;
    if (mobileSearchCount) {
      const count = rowCount?.textContent?.match(/\d+/)?.[0] || "0";
      mobileSearchCount.textContent = hasValue ? `${count}건` : "";
    }
  }

  function syncMobileSearchToMain() {
    if (!mobileSearch || !desktopSearch) return;
    if (desktopSearch.value !== mobileSearch.value) desktopSearch.value = mobileSearch.value;
    desktopSearch.dispatchEvent(new Event("input", { bubbles: true }));
    requestAnimationFrame(updateMobileSearchState);
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
    updateMobileSearchState();
  });

  const countObserver = rowCount && "MutationObserver" in window
    ? new MutationObserver(updateMobileSearchState)
    : null;
  countObserver?.observe(rowCount, { childList: true, characterData: true, subtree: true });

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
    if (event.matches && mobileSearch && desktopSearch) {
      mobileSearch.value = desktopSearch.value;
      updateMobileSearchState();
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

  if (mobileSearch && desktopSearch) {
    mobileSearch.value = desktopSearch.value;
    updateMobileSearchState();
  }
})();
